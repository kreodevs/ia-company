import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { agentHasGitTools } from "../src/lib/agent-tool-policy.js";
import { createAgentTools } from "../src/core/tools.js";

function testToolContext(workspaceRoot: string, agentName?: string) {
  return {
    workspaceRoot,
    shellTimeoutMs: 5_000,
    runId: "test-run",
    agentName,
  };
}

describe("agent tool policy", () => {
  it("allows git tools only for engineering agents", () => {
    assert.equal(agentHasGitTools("fullstack-dhh"), true);
    assert.equal(agentHasGitTools("devops-hightower"), true);
    assert.equal(agentHasGitTools("ceo-bezos"), false);
    assert.equal(agentHasGitTools("research-thompson"), false);
  });
});

describe("agent tools", () => {
  it("exposes git_commit only for engineering agents", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "ac-tools-"));
    const strategyTools = createAgentTools(testToolContext(workspaceRoot, "ceo-bezos"));
    const devTools = createAgentTools(testToolContext(workspaceRoot, "fullstack-dhh"));

    assert.equal("git_commit" in strategyTools, false);
    assert.equal("git_status" in strategyTools, false);
    assert.equal("git_commit" in devTools, true);
    assert.equal("git_status" in devTools, true);
  });

  it("git_commit accepts empty args without schema validation failure", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "ac-tools-"));
    const tools = createAgentTools(testToolContext(workspaceRoot, "devops-hightower"));
    const parsed = tools.git_commit.parameters.parse({});
    assert.equal(parsed.message, undefined);
  });

  it("git_commit returns a soft error when message is missing", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "ac-tools-"));
    const tools = createAgentTools(testToolContext(workspaceRoot, "devops-hightower"));
    const result = await tools.git_commit.execute({});
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /message.*required/i);
  });

  it("blocks git commit via shell for strategy agents", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "ac-tools-"));
    const tools = createAgentTools(testToolContext(workspaceRoot, "ceo-bezos"));
    const result = await tools.run_shell_command.execute({
      command: "git commit -m test",
    });
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /write_file/i);
  });

  it("read_file accepts file_path alias used by some LLMs", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "ac-tools-"));
    const { writeFile: writeFileFs, mkdir: mkdirFs } = await import("node:fs/promises");
    await mkdirFs(workspaceRoot, { recursive: true });
    await writeFileFs(join(workspaceRoot, "consensus.md"), "# on disk only", "utf-8");

    const tools = createAgentTools({
      ...testToolContext(workspaceRoot, "research-thompson"),
      sharedMemory: { consensus: "# from shared memory" },
    });
    assert.doesNotThrow(() => tools.read_file.parameters.parse({ file_path: "consensus.md" }));

    const result = await tools.read_file.execute({ file_path: "consensus.md" });
    assert.equal(result.path, "consensus.md");
    assert.equal(result.source, "shared_workflow_memory");
    assert.match(result.content ?? "", /from shared memory/);
    assert.doesNotMatch(result.content ?? "", /on disk only/);
  });

  it("read_file on consensus.md without shared memory returns guidance", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "ac-tools-"));
    const tools = createAgentTools(testToolContext(workspaceRoot, "research-thompson"));
    const result = await tools.read_file.execute({ path: "consensus.md" });
    assert.equal(result.missing, true);
    assert.match(result.error ?? "", /Shared Workflow Memory/i);
  });
});
