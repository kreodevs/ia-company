/**
 * ToolGateway — Fase 0 (camino B).
 * Envuelve createAgentTools + MCP + policy + auditoría SessionToolCall.
 * Cada execute emite eventos SSE (tool_call / tool_result / file_changed)
 * y persiste el record en la sesión.
 */

import type { ToolSet } from "ai";
import { createAgentToolsWithIntegrations } from "./tools.js";
import { prisma } from "../lib/prisma.js";
import { persistAndPublishRunEvent } from "../lib/run-events.js";
import { assertShellCommandAllowed } from "../lib/shell-policy.js";
import { agentHasGitTools, isGitWriteShellCommand, shellGitWriteBlockedMessage } from "../lib/agent-tool-policy.js";
import { createRunCheckpoint } from "../lib/run-checkpoints.js";
import type { ToolExecutionContext } from "../types/index.js";
import type { SessionToolCallStatus } from "./agent-loop/types.js";

/**
 * Mutable flag shared between ToolGateway and the agent loop: when a sensitive
 * tool call requires human approval, the gateway raises the signal so the loop
 * can pause the session (AWAITING_APPROVAL) right after the current turn.
 */
export interface ToolApprovalSignal {
  requested: boolean;
  toolName?: string;
  reason?: string;
  command?: string;
  args?: Record<string, unknown>;
}

export interface ToolGatewayContext {
  runId: string;
  tenantId?: string | null;
  agentId: string;
  agentName: string;
  sessionId?: string | null;
  workspaceRoot: string;
  shellTimeoutMs: number;
  productSlug?: string | null;
  productId?: string | null;
  githubToken?: string | null;
  sharedMemory?: Record<string, unknown>;
  approvalSignal?: ToolApprovalSignal;
}

export interface ToolCallEnvelope {
  toolName: string;
  args: Record<string, unknown>;
  raw?: unknown;
}

export interface ToolExecutionOutcome {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  exitCode: number | null;
  error?: string;
}

export async function buildToolGateway(
  ctx: ToolGatewayContext,
): Promise<(call: ToolCallEnvelope) => Promise<ToolExecutionOutcome>> {
  const toolContext: ToolExecutionContext = {
    workspaceRoot: ctx.workspaceRoot,
    shellTimeoutMs: ctx.shellTimeoutMs,
    runId: ctx.runId,
    tenantId: ctx.tenantId ?? undefined,
    productSlug: ctx.productSlug ?? undefined,
    productId: ctx.productId ?? undefined,
    githubToken: ctx.githubToken ?? undefined,
    agentId: ctx.agentId,
    agentName: ctx.agentName,
    toolMode: "full",
    sharedMemory: (ctx.sharedMemory ?? {}) as never,
    onLog: (message, payload) => {
      void persistAndPublishRunEvent(
        { type: "log", runId: ctx.runId, timestamp: new Date().toISOString(), data: { message, ...(payload ?? {}) } },
        ctx.tenantId,
      );
    },
  };

  const tools: ToolSet = (await createAgentToolsWithIntegrations(toolContext)) as ToolSet;

  const executeOne = async (call: ToolCallEnvelope): Promise<ToolExecutionOutcome> => {
    const started = Date.now();
    const toolName = call.toolName;

    const args = (call.args ?? {}) as Record<string, unknown>;

    // ── Policy pre-ejecución (shell / git) ────────────────────────────────
    if (toolName === "run_shell_command") {
      const command = typeof args.command === "string" ? args.command : "";
      if (!agentHasGitTools(ctx.agentName) && isGitWriteShellCommand(command)) {
        // En sesiones (camino B): git write sensible → checkpoint tool_approval
        // y el tool call queda awaiting_approval; el humano resuelve desde Office.
        if (ctx.sessionId) {
          const outcome: ToolExecutionOutcome = {
            toolName,
            args,
            result: {
              stdout: "",
              stderr:
                "APPROVAL_REQUIRED: this git write operation needs human approval. " +
                "A checkpoint was created; it will be resolved from the office war-room.",
              exitCode: 1,
              approvalPending: true,
            },
            durationMs: 0,
            exitCode: 1,
          };
          await auditToolCall(ctx, outcome, "awaiting_approval", "tool_approval_required_git_write");
          await createToolApprovalCheckpoint(ctx, { toolName, args, reason: "git_write_requires_approval", command });
          if (ctx.approvalSignal) {
            ctx.approvalSignal.requested = true;
            ctx.approvalSignal.toolName = toolName;
            ctx.approvalSignal.reason = "git_write_requires_approval";
            ctx.approvalSignal.command = command;
            ctx.approvalSignal.args = args;
          }
          return outcome;
        }
        const outcome: ToolExecutionOutcome = {
          toolName,
          args,
          result: { stdout: "", stderr: shellGitWriteBlockedMessage(ctx.agentName), exitCode: 1 },
          durationMs: 0,
          exitCode: 1,
        };
        await auditToolCall(ctx, outcome, "denied", "denied_by_git_policy");
        return outcome;
      }
      try {
        assertShellCommandAllowed(command);
      } catch (err) {
        const message = err instanceof Error ? err.message : "denied by shell policy";
        const outcome: ToolExecutionOutcome = {
          toolName,
          args,
          result: { stdout: "", stderr: `Shell policy denied: ${message}`, exitCode: 1 },
          durationMs: 0,
          exitCode: 1,
        };
        await auditToolCall(ctx, outcome, "denied", message);
        return outcome;
      }
    }

    await persistAndPublishRunEvent(
      { type: "log", runId: ctx.runId, timestamp: new Date().toISOString(), data: { toolName, args, kind: "tool_call" } },
      ctx.tenantId,
    );

    try {
      const toolFn = (tools as Record<string, { execute?: (a: never) => Promise<unknown> }>)[toolName];
      if (!toolFn?.execute) {
        throw new Error(`Tool not registered on gateway: ${toolName}`);
      }
      const result = await toolFn.execute(args as never);

      const outcome: ToolExecutionOutcome = {
        toolName,
        args,
        result,
        durationMs: Date.now() - started,
        exitCode: typeof (result as { exitCode?: unknown })?.exitCode === "number" ? (result as { exitCode: number }).exitCode : 0,
      };
      await emitToolResult(ctx, outcome);
      await auditToolCall(ctx, outcome, "ok");
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : "tool execution failed";
      const outcome: ToolExecutionOutcome = {
        toolName,
        args,
        result: { error: message },
        durationMs: Date.now() - started,
        exitCode: 1,
        error: message,
      };
      await emitToolResult(ctx, outcome);
      await auditToolCall(ctx, outcome, "error", message);
      return outcome;
    }
  };

  return executeOne;
}

/**
 * AI SDK-compatible facade over the imperative gateway. The original tool
 * schemas are preserved, while every execution is routed through policy,
 * events, and SessionToolCall auditing.
 */
export async function buildToolGatewayToolSet(ctx: ToolGatewayContext): Promise<ToolSet> {
  const gateway = await buildToolGateway(ctx);
  const toolContext: ToolExecutionContext = {
    workspaceRoot: ctx.workspaceRoot,
    shellTimeoutMs: ctx.shellTimeoutMs,
    runId: ctx.runId,
    tenantId: ctx.tenantId ?? undefined,
    productSlug: ctx.productSlug ?? undefined,
    productId: ctx.productId ?? undefined,
    githubToken: ctx.githubToken ?? undefined,
    agentId: ctx.agentId,
    agentName: ctx.agentName,
    toolMode: "full",
    sharedMemory: (ctx.sharedMemory ?? {}) as never,
  };
  const source = await createAgentToolsWithIntegrations(toolContext);
  const wrapped: Record<string, unknown> = {};

  for (const [name, definition] of Object.entries(source)) {
    const toolDefinition = definition as { execute?: (args: unknown) => Promise<unknown> };
    wrapped[name] = {
      ...toolDefinition,
      execute: async (args: unknown) => {
        const outcome = await gateway({ toolName: name, args: (args ?? {}) as Record<string, unknown> });
        return outcome.result;
      },
    };
  }

  return wrapped as ToolSet;
}

async function createToolApprovalCheckpoint(
  ctx: ToolGatewayContext,
  details: { toolName: string; args: Record<string, unknown>; reason: string; command?: string },
): Promise<void> {
  await createRunCheckpoint({
    runId: ctx.runId,
    tenantId: ctx.tenantId ?? undefined,
    kind: "tool_approval",
    payload: {
      sessionId: ctx.sessionId ?? null,
      agentName: ctx.agentName,
      toolName: details.toolName,
      args: details.args,
      command: details.command ?? null,
      reason: details.reason,
    },
  });
  await persistAndPublishRunEvent(
    {
      type: "log",
      runId: ctx.runId,
      timestamp: new Date().toISOString(),
      data: {
        sessionEvent: "tool_approval",
        sessionId: ctx.sessionId ?? null,
        toolName: details.toolName,
        reason: details.reason,
      },
    },
    ctx.tenantId,
  );
}

async function emitToolResult(ctx: ToolGatewayContext, outcome: ToolExecutionOutcome): Promise<void> {
  const payload: Record<string, unknown> = {
    toolName: outcome.toolName,
    exitCode: outcome.exitCode,
    durationMs: outcome.durationMs,
    truncated: true,
  };
  const result = outcome.result as { path?: string; stdout?: string; stderr?: string };
  if (typeof result.path === "string") payload.path = result.path;
  if (outcome.toolName === "write_file" || outcome.toolName === "delete_file") {
    payload.fileChanged = true;
    payload.kind = outcome.toolName === "write_file" ? "write" : "delete";
  }
  void persistAndPublishRunEvent(
    { type: "log", runId: ctx.runId, timestamp: new Date().toISOString(), data: { kind: "tool_result", ...payload } },
    ctx.tenantId,
  );
  if (payload.fileChanged && ctx.sessionId) {
    void persistAndPublishRunEvent(
      {
        type: "log",
        runId: ctx.runId,
        timestamp: new Date().toISOString(),
        data: {
          sessionEvent: "file_changed",
          sessionId: ctx.sessionId,
          toolName: outcome.toolName,
          path: payload.path ?? null,
        },
      },
      ctx.tenantId,
    );
  }
}

async function auditToolCall(
  ctx: ToolGatewayContext,
  outcome: ToolExecutionOutcome,
  status: SessionToolCallStatus,
  error?: string,
): Promise<void> {
  if (!ctx.sessionId) return;
  const { sessionId, turnId } = await resolveCurrentTurn(ctx);
  if (!turnId) return;
  await prisma.sessionToolCall.create({
    data: {
      sessionId,
      turnId,
      toolName: outcome.toolName,
      argsJson: outcome.args as object,
      resultJson: (outcome.result ?? undefined) as object | undefined,
      exitCode: outcome.exitCode ?? null,
      durationMs: outcome.durationMs ?? null,
      status,
      error: error ?? null,
    },
  });
}

async function resolveCurrentTurn(ctx: ToolGatewayContext): Promise<{ sessionId: string; turnId: string | null }> {
  if (!ctx.sessionId) return { sessionId: "", turnId: null };
  const turn = await prisma.sessionTurn.findFirst({
    where: { sessionId: ctx.sessionId },
    orderBy: { turnNo: "desc" },
    select: { id: true },
  });
  return { sessionId: ctx.sessionId, turnId: turn?.id ?? null };
}