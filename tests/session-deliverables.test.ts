import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractSessionWrites,
  mirrorSessionWritesToRunWorkspace,
  sessionWroteDocsInTurn,
} from "../src/lib/session-deliverables.js";
import { shouldSkipHandoffDocPersist } from "../src/lib/agent-deliverables.js";
import type { SessionToolCallRecord } from "../src/core/agent-loop/types.js";

function writeCall(overrides: Partial<SessionToolCallRecord> = {}): SessionToolCallRecord {
  return {
    toolName: "write_file",
    argsJson: { path: "docs/cto/adr.md", content: "# ADR" },
    resultJson: { path: "docs/cto/adr.md", bytesWritten: 6 },
    status: "ok",
    ...overrides,
  };
}

describe("extractSessionWrites (GAP-009 dedupe)", () => {
  it("detects write_file under the agent role docs folder", () => {
    const writes = extractSessionWrites(
      [writeCall()],
      "cto-campbell",
    );
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "docs/cto/adr.md");
    assert.equal(sessionWroteDocsInTurn([writeCall()], "cto-campbell"), true);
  });

  it("rejects writes outside docs/", () => {
    const call = writeCall({
      argsJson: { path: "report.md" },
      resultJson: { path: "report.md" },
    });
    assert.equal(extractSessionWrites([call], "cto-campbell").length, 0);
    assert.equal(sessionWroteDocsInTurn([call]), false);
  });

  it("enforces the role folder when agentName is provided", () => {
    const call = writeCall({
      argsJson: { path: "docs/marketing/brief.md" },
      resultJson: { path: "docs/marketing/brief.md" },
    });
    assert.equal(extractSessionWrites([call], "cto-campbell").length, 0);
    // Sin rol, cualquier path bajo docs/ cuenta.
    assert.equal(extractSessionWrites([call]).length, 1);
  });

  it("accepts file_path alias and normalizes backslashes", () => {
    const call = writeCall({
      argsJson: { file_path: "docs\\cfo\\pricing.md" },
      resultJson: { path: "docs\\cfo\\pricing.md" },
    });
    const writes = extractSessionWrites([call]);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "docs/cfo/pricing.md");
  });

  it("ignores errored calls and non-write tools", () => {
    const calls: SessionToolCallRecord[] = [
      writeCall({ status: "error", error: "denied" }),
      { toolName: "read_file", argsJson: { path: "docs/cto/adr.md" }, resultJson: { path: "docs/cto/adr.md" }, status: "ok" },
      writeCall(),
    ];
    assert.equal(extractSessionWrites(calls, "cto-campbell").length, 1);
  });

  it("falls back to args path when result lacks path, and dedupes", () => {
    const a: SessionToolCallRecord = { toolName: "write_file", argsJson: { path: "docs/ceo/memo.md" }, status: "ok" };
    const b: SessionToolCallRecord = {
      toolName: "write_file",
      argsJson: { path: "docs/ceo/memo.md" },
      resultJson: { path: "docs/ceo/memo.md" },
      status: "ok",
    };
    assert.equal(extractSessionWrites([a, b]).length, 1);
  });
});

describe("mirrorSessionWritesToRunWorkspace", () => {
  let sessionRoot: string;
  let runRoot: string;

  afterEach(async () => {
    if (sessionRoot) await rm(sessionRoot, { recursive: true, force: true });
    if (runRoot) await rm(runRoot, { recursive: true, force: true });
  });

  it("copies existing files preserving relative path and skips missing ones", async () => {
    sessionRoot = await mkdtemp(join(tmpdir(), "sess-ws-"));
    runRoot = await mkdtemp(join(tmpdir(), "run-ws-"));
    await mkdir(join(sessionRoot, "docs", "cto"), { recursive: true });
    await writeFile(join(sessionRoot, "docs", "cto", "adr.md"), "# ADR v1\n", "utf-8");

    const mirrored = await mirrorSessionWritesToRunWorkspace({
      sessionWorkspaceRoot: sessionRoot,
      runWorkspaceRoot: runRoot,
      writes: [{ path: "docs/cto/adr.md" }, { path: "docs/cto/missing.md" }],
    });

    assert.deepEqual(mirrored, ["docs/cto/adr.md"]);
    const copied = await readFile(join(runRoot, "docs", "cto", "adr.md"), "utf-8");
    assert.match(copied, /# ADR v1/);
  });
});

describe("dedupe flags interplay (GAP-009)", () => {
  it("shouldSkipHandoffDocPersist honors session deliverable flags", () => {
    assert.equal(shouldSkipHandoffDocPersist({ wroteDocs: true }), true);
    assert.equal(
      shouldSkipHandoffDocPersist({ savedDeliverablePath: "docs/cto/adr.md" }),
      true,
    );
    assert.equal(shouldSkipHandoffDocPersist({}), false);
  });
});
