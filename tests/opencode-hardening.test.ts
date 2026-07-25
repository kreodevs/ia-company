import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isTransientOpencodePollError } from "../src/lib/opencode-bridge.js";
import {
  persistOpencodeDiffManifest,
  persistOpencodeSummaryDoc,
} from "../src/lib/opencode-workspace-sync.js";
import {
  FULLSTACK_AGENT_NAME,
  resolveFullstackStepOrder,
  resolveResumeAfterFullstackStepOrder,
  shouldUseReadonlyToolsAfterOpencode,
} from "../src/lib/opencode-workflow.js";

const featureDevSteps = [
  { agent: { name: "interaction-cooper" }, stepOrder: 1 },
  { agent: { name: "ui-duarte" }, stepOrder: 2 },
  { agent: { name: FULLSTACK_AGENT_NAME }, stepOrder: 3 },
  { agent: { name: "qa-bach" }, stepOrder: 4 },
  { agent: { name: "devops-hightower" }, stepOrder: 5 },
];

describe("opencode workflow helpers", () => {
  it("resolves fullstack step and resume order dynamically", () => {
    assert.equal(resolveFullstackStepOrder(featureDevSteps), 3);
    assert.equal(resolveResumeAfterFullstackStepOrder(featureDevSteps), 4);
    assert.equal(resolveResumeAfterFullstackStepOrder(featureDevSteps, 6), 6);
  });

  it("uses readonly tools only after fullstack when resuming post-delegation", () => {
    assert.equal(shouldUseReadonlyToolsAfterOpencode(3, 3), false);
    assert.equal(shouldUseReadonlyToolsAfterOpencode(4, 3), true);
    assert.equal(shouldUseReadonlyToolsAfterOpencode(5, 3), true);
  });
});

describe("opencode workspace sync", () => {
  it("persists diff manifest and devops summary under product workspace", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ac-opencode-"));
    const diff = [{ path: "src/App.tsx", additions: 12, deletions: 2 }];

    const manifestPath = await persistOpencodeDiffManifest({
      workspaceRoot: dir,
      runId: "run_abc123",
      delegationId: "del_1",
      sessionId: "sess_1",
      diff,
      summary: "Implemented login form",
    });
    const docPath = await persistOpencodeSummaryDoc({
      workspaceRoot: dir,
      runId: "run_abc123",
      summary: "Implemented login form",
      diff,
    });

    assert.equal(manifestPath, ".opencode/run_abc123.json");
    assert.ok(docPath?.startsWith("docs/devops/"));

    const manifest = JSON.parse(await readFile(join(dir, manifestPath), "utf8")) as {
      files: Array<{ path: string }>;
    };
    assert.equal(manifest.files[0]?.path, "src/App.tsx");

    const doc = await readFile(join(dir, docPath!), "utf8");
    assert.match(doc, /Implemented login form/);
    assert.match(doc, /src\/App\.tsx/);
  });
});

describe("opencode poll errors", () => {
  it("classifies transient network and 502 errors", () => {
    assert.equal(isTransientOpencodePollError(new Error("fetch failed")), true);
    assert.equal(isTransientOpencodePollError(new Error("OpenCode GET /session/status failed (503)")), true);
    assert.equal(isTransientOpencodePollError(new Error("OpenCode signature verification failed")), false);
  });
});
