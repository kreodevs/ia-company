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
});
