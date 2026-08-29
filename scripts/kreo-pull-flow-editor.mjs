#!/usr/bin/env node
/**
 * Pull FlowEditor bundle from Kreo MCP into frontend/src/components/organisms/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ORG = path.join(ROOT, "frontend/src/components/organisms");
const PRESETS = path.join(ROOT, "frontend/src/presets");

const MCP_URL = "https://uicompos.kreoint.mx/mcp";
const MCP_AUTH =
  "Bearer mcp_live_5f7a2b9e1c8d4e3f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f";

const DEFAULT_EXPORT = new Set(["FlowEditor", "FlowCanvas", "FlowConfigPanel"]);

const COMPONENTS = [
  "FlowEditor",
  "FlowCanvas",
  "FlowConfigPanel",
  "FlowEditorFloatingPalette",
  "flowEditorContext",
  "flowEditorDefaults",
  "flowEditorValidators",
  "flowEditorUtils",
  "flowEditorTypes",
  "flowEditorIcons",
  "flowEditorHistory",
  "FlowExecutionTrace",
  "FlowActionNode",
  "FlowConditionNode",
  "FlowTriggerNode",
  "FlowWaitNode",
  "FlowLoopNode",
  "FlowMergeNode",
  "FlowParallelNode",
  "FlowSubflowNode",
  "FlowWebhookNode",
  "FlowNodeShell",
  "FlowNodeExecuteControl",
  "FlowPresetNode",
  "FlowExpressionBuilder",
];

let rpcId = 0;

async function mcpCall(toolName, args) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: MCP_AUTH,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });
  const text = await res.text();
  const chunks = text
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  const parsed = JSON.parse(chunks[chunks.length - 1] || text);
  if (parsed.error) throw new Error(parsed.error.message);
  return parsed.result.content.map((c) => c.text).join("\n");
}

function normalizeMcpText(raw) {
  return raw.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function extractCode(raw) {
  const text = normalizeMcpText(raw);
  if (/sin cambios|up to date|Ya tienes|not found|no encontrado/i.test(text)) return null;
  if (text.startsWith("// [DEV]")) {
    return text.replace(/^\/\/ \[DEV\][^\n]*\n(\/\/[^\n]*\n)?/m, "").trim();
  }
  if (text.startsWith("import ") || text.startsWith("export ")) return text.trim();
  const marker = text.indexOf("// REGISTRY UPGRADE:");
  if (marker >= 0) {
    const tail = text.slice(marker);
    const importMatch = tail.match(/\nimport[\s{]/);
    if (importMatch?.index !== undefined) {
      return tail.slice(importMatch.index + 1).trim();
    }
  }
  return null;
}

function finalize(code, name) {
  let out = code
    .replace(/from '\.\.\/\.\.\/lib\/utils'/g, "from '@/lib/utils'")
    .replace(/from "\.\.\/\.\.\/lib\/utils"/g, 'from "@/lib/utils"')
    .replace(/from '\.\.\/atoms\//g, "from '@/components/atoms/")
    .replace(/from "\.\.\/atoms\//g, 'from "@/components/atoms/')
    .replace(/from '\.\.\/molecules\//g, "from '@/components/molecules/")
    .replace(/from "\.\.\/molecules\//g, 'from "@/components/molecules/');

  if (DEFAULT_EXPORT.has(name) && !/\bexport default\b/.test(out)) {
    const m = out.match(/export const (\w+)/);
    if (m) out += `\n\nexport default ${m[1]};\n`;
  }
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

function fileName(name) {
  return `${name}.tsx`;
}

async function main() {
  fs.mkdirSync(ORG, { recursive: true });
  fs.mkdirSync(PRESETS, { recursive: true });

  const results = [];
  for (const name of COMPONENTS) {
    try {
      const raw = await mcpCall("pull_source_code_from_registry", { name });
      const code = extractCode(raw);
      if (!code) {
        console.log(`· ${name}: skip (${raw.slice(0, 80)}...)`);
        results.push({ name, status: "skip" });
        continue;
      }
      const outPath = path.join(ORG, fileName(name));
      fs.writeFileSync(outPath, finalize(code, name));
      console.log(`✓ ${name}`);
      results.push({ name, status: "ok", path: outPath });
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
      results.push({ name, status: "error", error: e.message });
    }
  }

  // Try preset pulls
  for (const presetName of ["genericWorkflowPreset", "crmWorkflowPreset"]) {
    try {
      const raw = await mcpCall("pull_source_code_from_registry", { name: presetName });
      const code = extractCode(raw);
      if (code) {
        const outPath = path.join(PRESETS, `${presetName}.ts`);
        fs.writeFileSync(outPath, finalize(code, presetName));
        console.log(`✓ preset ${presetName}`);
        results.push({ name: presetName, status: "ok" });
      }
    } catch {
      // optional
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
