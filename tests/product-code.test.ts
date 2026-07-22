import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { isBinaryPath, listProductTree, readProductFile } from "../src/lib/product-code.js";let workspaceRoot: string;
let originalWorkspaceRoot: string | undefined;

before(async () => {
  originalWorkspaceRoot = process.env.WORKSPACE_ROOT;
  workspaceRoot = await mkdtemp(join(tmpdir(), "product-code-"));
  process.env.WORKSPACE_ROOT = workspaceRoot;
  const slug = "test-product";
  const root = join(workspaceRoot, "projects", slug);
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, ".hidden-but-ok"), { recursive: true });
  await mkdir(join(root, "node_modules", "ignored"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Hi");
  await writeFile(join(root, "package.json"), '{"name":"x"}');
  await writeFile(join(root, "src", "index.ts"), "export const x = 1;");
  await writeFile(join(root, "src", "style.css"), "body { color: red; }");
  await writeFile(join(root, ".hidden-but-ok", "secret.txt"), "shh");
  await writeFile(join(root, "node_modules", "ignored", "lib.js"), "ignored");
});

after(async () => {
  if (originalWorkspaceRoot === undefined) delete process.env.WORKSPACE_ROOT;
  else process.env.WORKSPACE_ROOT = originalWorkspaceRoot;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe("product code helpers", () => {
  it("lists files but skips node_modules and dot-dirs", async () => {
    const entries = await listProductTree("test-product");
    const paths = collectPaths(entries);
    assert.ok(paths.includes("README.md"));
    assert.ok(paths.includes("package.json"));
    assert.ok(paths.includes("src/index.ts"));
    assert.ok(paths.includes("src/style.css"));
    assert.ok(!paths.some((p) => p.startsWith("node_modules")));
    assert.ok(!paths.some((p) => p.startsWith(".hidden-but-ok")));
  });

  it("reads a text file", async () => {
    const f = await readProductFile("test-product", "src/index.ts");
    assert.equal(f.path, "src/index.ts");
    assert.equal(f.binary, false);
    assert.equal(f.content, "export const x = 1;");
  });

  it("rejects paths that escape the workspace", async () => {
    await assert.rejects(
      () => readProductFile("test-product", "../etc/passwd"),
      /escapes/i,
    );
  });

  it("detects binary extensions", () => {
    assert.equal(isBinaryPath("image.png"), true);
    assert.equal(isBinaryPath("font.woff2"), true);
    assert.equal(isBinaryPath("script.ts"), false);
  });
});

function collectPaths(entries: Array<{ path: string; type: string; children?: unknown[] }>): string[] {
  const out: string[] = [];
  const walk = (list: Array<{ path: string; type: string; children?: unknown[] }>) => {
    for (const e of list) {
      out.push(e.path);
      if (Array.isArray(e.children)) walk(e.children as Array<{ path: string; type: string; children?: unknown[] }>);
    }
  };
  walk(entries);
  return out;
}
