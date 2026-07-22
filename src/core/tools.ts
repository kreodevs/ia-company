import { execFile } from "node:child_process";
import { access, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { promisify } from "node:util";
import { tool } from "ai";
import { z } from "zod";
import type { ToolExecutionContext } from "../types/index.js";

const execFileAsync = promisify(execFile);

const BLOCKED_COMMANDS = [
  "rm -rf /",
  "rm -rf ~",
  "mkfs",
  ":(){ :|:& };:",
  "dd if=",
  "> /dev/sd",
];

const BLOCKED_PATHS = [".git/config", ".env", "node_modules/.cache"];

function resolveSafePath(workspaceRoot: string, relativePath: string): string {
  const root = resolve(workspaceRoot);
  const target = resolve(root, normalize(relativePath));
  if (!target.startsWith(root)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }
  for (const blocked of BLOCKED_PATHS) {
    if (target.includes(blocked)) {
      throw new Error(`Access denied: ${relativePath}`);
    }
  }
  return target;
}

function isCommandSafe(command: string): boolean {
  const lower = command.toLowerCase();
  return !BLOCKED_COMMANDS.some((blocked) => lower.includes(blocked));
}

export function createAgentTools(ctx: ToolExecutionContext) {
  const log = (message: string, payload?: Record<string, unknown>) => {
    ctx.onLog?.(message, payload);
  };

  const run_shell_command = tool({
    description:
      "Execute a shell command in the workspace. Timeout enforced. Destructive system commands are blocked.",
    parameters: z.object({
      command: z.string().describe("Shell command to execute"),
      cwd: z
        .string()
        .optional()
        .describe("Working directory relative to workspace root"),
    }),
    execute: async ({ command, cwd }) => {
      if (!isCommandSafe(command)) {
        throw new Error("Command blocked by safety policy");
      }

      const workDir = cwd
        ? resolveSafePath(ctx.workspaceRoot, cwd)
        : resolve(ctx.workspaceRoot);

      log(`shell: ${command}`, { cwd: workDir });

      try {
        const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
          cwd: workDir,
          timeout: ctx.shellTimeoutMs,
          maxBuffer: 1024 * 512,
          env: { ...process.env, CI: "true" },
        });

        return {
          stdout: stdout.slice(0, 50_000),
          stderr: stderr.slice(0, 10_000),
          exitCode: 0,
        };
      } catch (err: unknown) {
        const error = err as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
        if (error.killed) {
          throw new Error(`Command timed out after ${ctx.shellTimeoutMs}ms`);
        }
        return {
          stdout: (error.stdout ?? "").slice(0, 50_000),
          stderr: (error.stderr ?? String(err)).slice(0, 10_000),
          exitCode: error.code ?? 1,
        };
      }
    },
  });

  const read_file = tool({
    description: "Read a text file from the workspace",
    parameters: z.object({
      path: z.string().describe("File path relative to workspace root"),
      maxBytes: z.number().optional().default(100_000),
    }),
    execute: async ({ path, maxBytes }) => {
      const fullPath = resolveSafePath(ctx.workspaceRoot, path);
      log(`read: ${path}`);
      try {
        const content = await readFile(fullPath, "utf-8");
        return { path, content: content.slice(0, maxBytes) };
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") {
          return {
            path,
            missing: true,
            error: `File not found: ${path}. See README.md and portfolio.md in the workspace root.`,
          };
        }
        throw err;
      }
    },
  });

  const write_file = tool({
    description: "Write or overwrite a text file in the workspace",
    parameters: z.object({
      path: z.string().describe("File path relative to workspace root"),
      content: z.string().describe("File content to write"),
    }),
    execute: async ({ path, content }) => {
      const fullPath = resolveSafePath(ctx.workspaceRoot, path);
      await mkdir(dirname(fullPath), { recursive: true });
      log(`write: ${path}`, { bytes: content.length });
      await writeFile(fullPath, content, "utf-8");
      return { path, bytesWritten: Buffer.byteLength(content, "utf-8") };
    },
  });

  const list_dir = tool({
    description: "List files and directories in a workspace path",
    parameters: z.object({
      path: z.string().default(".").describe("Directory relative to workspace root"),
      recursive: z.boolean().optional().default(false),
    }),
    execute: async ({ path, recursive }) => {
      const fullPath = resolveSafePath(ctx.workspaceRoot, path);
      log(`list: ${path}`);

      try {
        await access(fullPath);
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") {
          return {
            path,
            entries: [],
            missing: true,
            hint:
              path === "projects" || path.startsWith("projects/")
                ? "There is no projects/ folder inside the tenant workspace. Product repos are sibling folders (../{slug}/) or the workspace root is already a product repo."
                : `Directory not found: ${path}. List '.' or read README.md / portfolio.md.`,
          };
        }
        throw err;
      }

      if (!recursive) {
        const entries = await readdir(fullPath, { withFileTypes: true });
        return {
          path,
          entries: entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
          })),
        };
      }

      const results: Array<{ path: string; type: string }> = [];

      async function walk(dir: string, prefix: string) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git") continue;
          const rel = join(prefix, entry.name);
          results.push({
            path: rel,
            type: entry.isDirectory() ? "directory" : "file",
          });
          if (entry.isDirectory() && results.length < 500) {
            await walk(join(dir, entry.name), rel);
          }
        }
      }

      await walk(fullPath, path === "." ? "" : path);
      return { path, entries: results.slice(0, 500) };
    },
  });

  const git_status = tool({
    description: "Show git status in the workspace (short format)",
    parameters: z.object({}),
    execute: async () => {
      const { stdout, stderr, exitCode } = await runShell(ctx, "git status --short --branch", ctx.workspaceRoot);
      return { stdout, stderr, exitCode };
    },
  });

  const git_commit = tool({
    description: "Stage all changes and create a git commit in the workspace",
    parameters: z.object({
      message: z.string().describe("Commit message"),
    }),
    execute: async ({ message }) => {
      if (!message.trim()) throw new Error("Commit message required");
      await runShell(ctx, "git add -A", ctx.workspaceRoot);
      const result = await runShell(
        ctx,
        `git commit -m ${JSON.stringify(message.trim())}`,
        ctx.workspaceRoot,
      );
      return result;
    },
  });

  const npm_run = tool({
    description: "Run an npm script in the workspace (install, build, test, deploy only)",
    parameters: z.object({
      script: z.enum(["install", "build", "test", "run"]),
      args: z.string().optional().describe("Extra args for npm run, e.g. deploy"),
    }),
    execute: async ({ script, args }) => {
      const allowed = ["install", "build", "test", "run"];
      if (!allowed.includes(script)) throw new Error("Script not allowed");
      const cmd =
        script === "install"
          ? "npm install"
          : script === "run" && args
            ? `npm run ${args}`
            : `npm ${script}`;
      return runShell(ctx, cmd, ctx.workspaceRoot);
    },
  });

  const wrangler_deploy = tool({
    description: "Deploy a Cloudflare Worker project with wrangler from workspace root",
    parameters: z.object({
      cwd: z.string().default(".").describe("Project directory relative to workspace"),
    }),
    execute: async ({ cwd }) => {
      const workDir = resolveSafePath(ctx.workspaceRoot, cwd);
      return runShell(ctx, "npx wrangler deploy", workDir);
    },
  });

  return {
    run_shell_command,
    read_file,
    write_file,
    list_dir,
    git_status,
    git_commit,
    npm_run,
    wrangler_deploy,
  };
}

async function runShell(
  ctx: ToolExecutionContext,
  command: string,
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (!isCommandSafe(command)) {
    throw new Error("Command blocked by safety policy");
  }
  const lower = command.toLowerCase();
  if (lower.includes("push --force") || lower.includes("push -f")) {
    throw new Error("Force push blocked by safety policy");
  }
  if (lower.includes("gh repo delete") || lower.includes("wrangler delete")) {
    throw new Error("Destructive command blocked");
  }

  ctx.onLog?.(`shell: ${command}`, { cwd });

  const env = { ...process.env, CI: "true" } as Record<string, string>;
  if (ctx.githubToken) env.GH_TOKEN = ctx.githubToken;

  try {
    const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
      cwd,
      timeout: ctx.shellTimeoutMs,
      maxBuffer: 1024 * 512,
      env,
    });
    return { stdout: stdout.slice(0, 50_000), stderr: stderr.slice(0, 10_000), exitCode: 0 };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
    if (error.killed) {
      throw new Error(`Command timed out after ${ctx.shellTimeoutMs}ms`);
    }
    return {
      stdout: (error.stdout ?? "").slice(0, 50_000),
      stderr: (error.stderr ?? String(err)).slice(0, 10_000),
      exitCode: error.code ?? 1,
    };
  }
}

export type AgentTools = ReturnType<typeof createAgentTools>;
