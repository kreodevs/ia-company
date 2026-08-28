#!/usr/bin/env node
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const COMP_BASE = path.join(ROOT, "frontend/src/components");

const SKIP = new Set([
  "CalendarPrimitive.tsx",
  "mermaidRepairUtils.ts",
  "mermaidRenderUtils.ts",
  "markdownEditorWysiwygTheme.css",
]);

const MCP_URL = "https://uicompos.kreoint.mx/mcp";
const MCP_AUTH =
  "Bearer mcp_live_5f7a2b9e1c8d4e3f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f";

const LAYERS = ["atoms", "molecules", "organisms"];
const SKIP_UPGRADE = new Set(["Sonner", "MarkdownEditorWysiwyg"]);

const DEFAULT_EXPORT = new Set([
  "Breadcrumb", "Button", "Calendar", "Card", "Checkbox", "Dropdown", "EmptyState",
  "FileUpload", "InputText", "MermaidDiagram", "MultiSelect", "Password", "RoleFlagsGroup",
  "Skeleton", "StatsCard", "StatusPill", "DataTable", "DynamicForm", "BulkActionBar",
  "PhoneInput", "Cascader", "NumberField", "InputGroup",
]);

function listComponents() {
  const results = [];
  for (const layer of LAYERS) {
    const dir = path.join(COMP_BASE, layer);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
      if (SKIP.has(f)) continue;
      const fp = path.join(dir, f);
      const content = fs.readFileSync(fp, "utf8");
      const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
      results.push({ name: f.replace(/\.tsx$/, ""), hash, path: fp, layer });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

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
  const chunks = text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
  const parsed = JSON.parse(chunks[chunks.length - 1] || text);
  if (parsed.error) throw new Error(parsed.error.message);
  return parsed.result.content.map((c) => c.text).join("\n");
}

function normalizeMcpText(raw) {
  return raw.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function extractUpgradeCode(raw) {
  const text = normalizeMcpText(raw);
  if (/sin cambios|up to date|Ya tienes/i.test(text)) return null;
  const marker = text.indexOf("// REGISTRY UPGRADE:");
  if (marker >= 0) {
    const tail = text.slice(marker);
    const importMatch = tail.match(/\nimport[\s*{]/);
    if (importMatch && importMatch.index !== undefined) {
      return tail.slice(importMatch.index + 1).trim();
    }
    return tail.replace(/^[^\n]+\n+/, "").trim();
  }
  if (text.startsWith("// [DEV]")) {
    return text.replace(/^\/\/ \[DEV\][^\n]*\n(\/\/[^\n]*\n)?/m, "").trim();
  }
  if (text.startsWith("import ")) return text.trim();
  return null;
}

function finalize(code, name) {
  let out = code;
  if (DEFAULT_EXPORT.has(name) && !/\bexport default\b/.test(out)) {
    const m = out.match(/export const (\w+)/);
    if (m) out += `\n\nexport default ${m[1]};\n`;
  }
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

async function main() {
  const results = [];
  for (const comp of listComponents()) {
    if (SKIP_UPGRADE.has(comp.name)) {
      console.log(`~ ${comp.name}: kept local`);
      continue;
    }
    try {
      const raw = await mcpCall("upgrade_component", { name: comp.name, localHash: comp.hash });
      const code = extractUpgradeCode(raw);
      if (!code) {
        console.log(`· ${comp.name}: unchanged`);
        results.push({ name: comp.name, status: "unchanged" });
        continue;
      }
      fs.writeFileSync(comp.path, finalize(code, comp.name));
      console.log(`✓ ${comp.name}: updated`);
      results.push({ name: comp.name, status: "updated" });
    } catch (e) {
      console.error(`✗ ${comp.name}: ${e.message}`);
      results.push({ name: comp.name, status: "error", error: e.message });
    }
  }

  for (const [name, layer] of [
    ["BulkActionBar", "molecules"],
    ["PhoneInput", "molecules"],
    ["Cascader", "molecules"],
    ["NumberField", "atoms"],
    ["Command", "molecules"],
    ["InputGroup", "molecules"],
  ]) {
    try {
      const raw = await mcpCall("pull_source_code_from_registry", { name });
      const code = extractUpgradeCode(raw) ?? raw;
      let out = finalize(code, name);
      out = out.replace(/from "\.\.\/\.\.\/lib\/utils"/g, 'from "@/lib/utils"');
      out = out.replace(/from '\.\.\/\.\.\/lib\/utils'/g, "from '@/lib/utils'");
      out = out.replace(/from "\.\/Dialog"/g, 'from "@/components/molecules/Dialog"');
      out = out.replace(/from '\.\/Dialog'/g, "from '@/components/molecules/Dialog'");
      fs.writeFileSync(path.join(COMP_BASE, layer, `${name}.tsx`), out);
      console.log(`+ pulled ${name}`);
      results.push({ name, status: "pulled" });
    } catch (e) {
      console.error(`✗ pull ${name}: ${e.message}`);
    }
  }

  // DataTable via pull (upgrade hash may match after partial writes)
  try {
    const raw = await mcpCall("pull_source_code_from_registry", { name: "DataTable" });
    const code = extractUpgradeCode(raw) ?? raw;
    fs.writeFileSync(
      path.join(COMP_BASE, "organisms/DataTable.tsx"),
      finalize(code, "DataTable"),
    );
    console.log("+ pulled DataTable");
  } catch (e) {
    console.error(`✗ pull DataTable: ${e.message}`);
  }

  fs.writeFileSync(path.join(ROOT, "scripts/kreo-sync-results.json"), JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
