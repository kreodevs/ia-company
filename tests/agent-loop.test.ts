import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { prisma } from "../src/lib/prisma.js";
import { runAgentLoop } from "../src/core/agent-loop/loop.js";
import type { LanguageModel } from "ai";
import { MockLanguageModelV1 } from "ai/test";
import type { LanguageModelV1FunctionToolCall } from "@ai-sdk/provider";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("agent-loop e2e: encargo → sesión → 3 turnos read/write/shell → snapshot", { skip: !hasDb }, () => {
  let workspaceRoot: string;
  let agentId: string;
  let runId: string;
  let sessionId: string;

  before(async () => {
    // Create temporary workspace
    workspaceRoot = await mkdtemp(join(tmpdir(), "agent-loop-test-"));

    // Seed minimal DB rows
    const agent = await prisma.agent.create({
      data: {
        tenantId: null,
        name: `test-agent-${Date.now()}`,
        role: "researcher",
        systemPrompt: "You are a test agent.",
        modelKind: "chat",
        temperature: 0.3,
        isActive: true,
      },
    });
    agentId = agent.id;

    const run = await prisma.executionRun.create({
      data: {
        tenantId: null,
        status: "PENDING",
        engine: "session",
      },
    });
    runId = run.id;

    // Create a session with acceptance criteria: a file must exist
    const session = await prisma.agentSession.create({
      data: {
        runId,
        tenantId: null,
        agentId,
        status: "PENDING",
        role: "researcher",
        goal: "Create a report.md file with content 'test completed' and verify it exists.",
        acceptanceCriteria: [
          { id: "ac-1", description: "report.md exists", kind: "file_exists" },
        ],
        workspacePath: workspaceRoot,
        maxTurns: 10,
        startedAt: new Date(),
      },
    });
    sessionId = session.id;
  });

  after(async () => {
    // Cleanup DB
    if (sessionId) {
      await prisma.agentSession.delete({ where: { id: sessionId } }).catch(() => undefined);
    }
    if (runId) {
      await prisma.executionRun.delete({ where: { id: runId } }).catch(() => undefined);
    }
    if (agentId) {
      await prisma.agent.delete({ where: { id: agentId } }).catch(() => undefined);
    }
    // Cleanup temp workspace
    if (workspaceRoot) {
      await rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("completes 3 turns (read/write/shell) and records workspace snapshot", async () => {
    // Build a scripted mock model that produces tool calls for 3 turns,
    // then a final text output with SESSION_DONE marker.
    // Each call to doGenerate corresponds to one generateText round-trip.
    // generateText with maxSteps will loop calling doGenerate until no tool calls.
    const doGenerateCalls: Array<{
      toolCalls?: LanguageModelV1FunctionToolCall[];
      text?: string;
      finishReason: "tool-calls" | "stop";
    }> = [
      // Turn 1: read_file tool call (generateText step 1)
      {
        toolCalls: [
          {
            toolCallType: "function",
            toolCallId: "call-read-1",
            toolName: "read_file",
            args: JSON.stringify({ path: "report.md" }),
          },
        ],
        finishReason: "tool-calls",
      },
      // Turn 1: after tool result, model emits SESSION_DONE (generateText step 2)
      {
        text: "SESSION_DONE: read report.md",
        finishReason: "stop",
      },
      // Turn 2: write_file tool call (generateText step 1)
      {
        toolCalls: [
          {
            toolCallType: "function",
            toolCallId: "call-write-1",
            toolName: "write_file",
            args: JSON.stringify({ path: "report.md", content: "test completed" }),
          },
        ],
        finishReason: "tool-calls",
      },
      // Turn 2: after tool result, model emits SESSION_DONE (generateText step 2)
      {
        text: "SESSION_DONE: wrote report.md",
        finishReason: "stop",
      },
      // Turn 3: run_shell_command tool call (generateText step 1)
      {
        toolCalls: [
          {
            toolCallType: "function",
            toolCallId: "call-shell-1",
            toolName: "run_shell_command",
            args: JSON.stringify({ command: "echo 'verification passed'" }),
          },
        ],
        finishReason: "tool-calls",
      },
      // Turn 3: after tool result, model emits SESSION_DONE (generateText step 2)
      {
        text: "SESSION_DONE: Created report.md and verified it exists.",
        finishReason: "stop",
      },
    ];

    let callIndex = 0;
    const mockModel = new MockLanguageModelV1({
      provider: "test",
      modelId: "test-model",
      doGenerate: async () => {
        const call = doGenerateCalls[callIndex++];
        if (!call) {
          // Safety: if more calls than scripted, return stop
          return {
            text: "SESSION_DONE: Completed",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 10 },
            rawCall: { rawPrompt: [], rawSettings: {} },
          };
        }
        if (call.toolCalls) {
          return {
            toolCalls: call.toolCalls,
            finishReason: call.finishReason,
            usage: { promptTokens: 50, completionTokens: 20 },
            rawCall: { rawPrompt: [], rawSettings: {} },
          };
        }
        return {
          text: call.text ?? "SESSION_DONE: Completed",
          finishReason: call.finishReason,
          usage: { promptTokens: 10, completionTokens: 10 },
          rawCall: { rawPrompt: [], rawSettings: {} },
        };
      },
    });

    const modelFactory = (): LanguageModel => mockModel as unknown as LanguageModel;

    const result = await runAgentLoop({
      config: {
        runId,
        tenantId: null,
        agentId,
        role: "researcher",
        goal: "Create a report.md file with content 'test completed' and verify it exists.",
        acceptanceCriteria: [{ id: "ac-1", description: "report.md exists", kind: "file_exists" }],
        workspacePath: workspaceRoot,
        maxTurns: 10,
      },
      runContext: {
        runId,
        tenantId: null,
        productSlug: null,
        productId: null,
        githubToken: null,
        sharedMemory: {},
      },
      modelFactory,
    });

    // Assertions
    assert.equal(result.status, "COMPLETED", result.lastError ?? result.summary ?? "Agent loop did not complete");
    assert.ok(result.turnsExecuted >= 3, `Expected at least 3 turns, got ${result.turnsExecuted}`);
    assert.ok(result.spentTokens > 0, "Expected token usage to be recorded");
    assert.ok(result.spentCostUsd >= 0, "Expected cost tracking");

    // Verify SessionTurn rows exist
    const turns = await prisma.sessionTurn.findMany({
      where: { sessionId },
      orderBy: { turnNo: "asc" },
      include: { toolCalls: true },
    });
    assert.ok(turns.length >= 3, `Expected at least 3 SessionTurn rows, got ${turns.length}`);

    // Verify tool calls recorded for read_file, write_file, run_shell_command
    const allToolCalls = turns.flatMap((t) => t.toolCalls);
    const toolNames = allToolCalls.map((tc) => tc.toolName);
    assert.ok(toolNames.includes("read_file"), "Expected read_file tool call recorded");
    assert.ok(toolNames.includes("write_file"), "Expected write_file tool call recorded");
    assert.ok(toolNames.includes("run_shell_command"), "Expected run_shell_command tool call recorded");

    // Verify the file was actually created in the workspace
    const reportPath = join(workspaceRoot, "report.md");
    const reportContent = await readFile(reportPath, "utf-8");
    assert.equal(reportContent.trim(), "test completed");

    // Verify WorkspaceSnapshot was recorded on completion
    const snapshots = await prisma.workspaceSnapshot.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    assert.equal(snapshots.length, 1, "Expected exactly one WorkspaceSnapshot on completion");
    const snapshot = snapshots[0];
    assert.ok(snapshot, "Expected a snapshot row");
    assert.ok(
      Array.isArray(snapshot.filesChanged) && (snapshot.filesChanged as unknown[]).includes("report.md"),
      "Snapshot filesChanged should include report.md",
    );
    assert.ok(typeof snapshot.manifest === "object" && snapshot.manifest !== null);
    assert.ok(snapshot.totalBytes > 0, "Snapshot totalBytes should be > 0");
  });
});