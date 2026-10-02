/**
 * Acceptance — Fase 0 (camino B).
 * Verificación determinista de los criterios de aceptación. El loop NO confía
 * en el SESSION_DONE del modelo: los criterios se comprueban contra el sistema
 * de archivos (y opcionalmente contra un comando) antes de cerrar la sesión.
 */

import { execFile } from "node:child_process";
import { stat, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { assertShellCommandAllowed } from "../../lib/shell-policy.js";
import type { AcceptanceCriterion } from "./types.js";

const execFileAsync = promisify(execFile);

export interface CriterionCheck {
  id: string;
  description: string;
  kind: AcceptanceCriterion["kind"] | "unspecified";
  passed: boolean;
  detail: string;
  /** Configuración adicional (path, needle, command). */
  config?: Record<string, unknown>;
}

export interface AcceptanceReport {
  allPassed: boolean;
  checks: CriterionCheck[];
}

/** Convierte "Criterio: description" o "- [id] description" en un criterio. */
export function parseAcceptanceCriteria(raw: unknown): AcceptanceCriterion[] {
  if (!Array.isArray(raw)) return [];
  const out: AcceptanceCriterion[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry === "string") {
      const text = entry.trim();
      if (!text) return;
      out.push({ id: `ac-${index + 1}`, description: text });
      return;
    }
    if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const description = typeof obj.description === "string" ? obj.description.trim() : "";
      if (!description) return;
      const kind = obj.kind;
      out.push({
        id: typeof obj.id === "string" && obj.id ? obj.id : `ac-${index + 1}`,
        description,
        kind:
          kind === "file_exists" || kind === "file_contains" || kind === "shell_pass" || kind === "custom"
            ? kind
            : undefined,
      });
    }
  });
  return out;
}

function isToolSupplied(config: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Resuelve un path relativo de forma segura: cualquier intento de escapar del
 * workspace (../, rutas absolutas) se rechaza en vez de ejecutarse.
 */
function resolveInsideWorkspace(workspaceRoot: string, relativePath: string): string | null {
  const root = resolve(workspaceRoot);
  const target = resolve(root, relativePath);
  if (target === root || target.startsWith(root + sep)) return target;
  return null;
}

/** Infiere path desde la descripción: `docs/x.md` o `file docs/x.md` o `report.md exists`. */
function inferPathFromDescription(description: string): string | null {
  const explicit = description.match(/(?:file|archivo|ruta|path)\s+[`"']?([\w./-]+\.[\w]+|[`"']?[\w-]+[\w./-]*)/i);
  if (explicit?.[1]) return explicit[1].replace(/[`"']/g, "");
  const pathLike = description.match(/[\w-]+(?:\/[\w.-]+)+\.[a-z0-9]+/i);
  if (pathLike) return pathLike[0];
  const bareFile = description.match(/\b([\w.-]+\.[a-z0-9]{1,8})\b/i);
  if (bareFile?.[1]) return bareFile[1];
  return null;
}

async function checkFileExists(workspaceRoot: string, path: string): Promise<CriterionCheck> {
  const resolved = resolveInsideWorkspace(workspaceRoot, path);
  if (!resolved) {
    return { id: path, description: path, kind: "file_exists", passed: false, detail: `Path escapes workspace: ${path}` };
  }
  try {
    const info = await stat(resolved);
    return {
      id: path,
      description: path,
      kind: "file_exists",
      passed: info.isFile(),
      detail: info.isFile() ? `file found (${info.size} bytes)` : "path is not a file",
    };
  } catch {
    return { id: path, description: path, kind: "file_exists", passed: false, detail: "file not found" };
  }
}

async function checkFileContains(
  workspaceRoot: string,
  path: string,
  needle: string | null,
): Promise<CriterionCheck> {
  const resolved = resolveInsideWorkspace(workspaceRoot, path);
  if (!resolved) {
    return { id: path, description: path, kind: "file_contains", passed: false, detail: `Path escapes workspace: ${path}` };
  }
  let content: string;
  try {
    content = await readFile(resolved, "utf-8");
  } catch {
    return { id: path, description: path, kind: "file_contains", passed: false, detail: "file not found" };
  }
  if (!needle) {
    return {
      id: path,
      description: path,
      kind: "file_contains",
      passed: content.trim().length > 0,
      detail: content.trim().length > 0 ? "file is non-empty" : "file is empty",
    };
  }
  const found = content.toLowerCase().includes(needle.toLowerCase());
  return {
    id: path,
    description: path,
    kind: "file_contains",
    passed: found,
    detail: found ? `contains "${needle}"` : `does not contain "${needle}"`,
  };
}

async function checkShellPass(workspaceRoot: string, command: string | null): Promise<CriterionCheck> {
  if (!command) {
    return { id: "shell", description: "shell", kind: "shell_pass", passed: false, detail: "no command supplied" };
  }
  try {
    assertShellCommandAllowed(command);
  } catch (err) {
    const message = err instanceof Error ? err.message : "blocked by shell policy";
    return { id: "shell", description: command, kind: "shell_pass", passed: false, detail: `blocked: ${message}` };
  }
  const resolved = resolveInsideWorkspace(workspaceRoot, ".");
  try {
    await execFileAsync("sh", ["-c", command], {
      cwd: resolved ?? resolve(workspaceRoot),
      timeout: 120_000,
      maxBuffer: 1024 * 256,
    });
    return { id: "shell", description: command, kind: "shell_pass", passed: true, detail: "command exited 0" };
  } catch (err) {
    const error = err as { stderr?: string; stdout?: string; message?: string };
    const detail = (error.stderr || error.stdout || error.message || "command failed").slice(0, 300);
    return { id: "shell", description: command, kind: "shell_pass", passed: false, detail };
  }
}

/**
 * Verifica cada criterio. Sin criterios definidos, devuelve allPassed=false
 * para que el loop exija un cierre explícito basado en su propio criterio.
 */
export async function verifyAcceptance(
  criteria: AcceptanceCriterion[],
  workspaceRoot: string,
  config: Record<string, Record<string, unknown>> = {},
): Promise<AcceptanceReport> {
  if (criteria.length === 0) {
    return { allPassed: false, checks: [], };
  }

  const checks: CriterionCheck[] = [];

  for (const criterion of criteria) {
    const conf = config[criterion.id] ?? {};
    const kind = criterion.kind ?? "unspecified";
    const description = criterion.description;

    if (kind === "file_exists" || kind === "file_contains") {
      const path = isToolSupplied(conf, ["path", "file", "file_path"]) ?? inferPathFromDescription(description);
      if (!path) {
        checks.push({ id: criterion.id, description, kind, passed: false, detail: "no path could be inferred" });
        continue;
      }
      const needle = isToolSupplied(conf, ["contains", "needle", "text"]);
      checks.push(
        kind === "file_exists"
          ? await checkFileExists(workspaceRoot, path)
          : await checkFileContains(workspaceRoot, path, needle),
      );
      continue;
    }

    if (kind === "shell_pass") {
      const command = isToolSupplied(conf, ["command", "cmd", "script"]);
      checks.push(await checkShellPass(workspaceRoot, command ?? extractCommandFromDescription(description)));
      continue;
    }

    // "custom" o no especificado: se considera cumplido sólo con evidencia explícita.
    const evidence = isToolSupplied(conf, ["satisfied", "verified", "note"]);
    checks.push({
      id: criterion.id,
      description,
      kind,
      passed: Boolean(evidence),
      detail: evidence ? "manual evidence supplied" : "needs explicit verification (no tool proof)",
    });
  }

  return { allPassed: checks.every((c) => c.passed), checks };
}

function extractCommandFromDescription(description: string): string | null {
  const match = description.match(/`([^`]+)`/);
  return match?.[1]?.trim() ?? null;
}
