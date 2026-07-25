import { generateText } from "ai";
import type { ExecutionStatus, LogLevel } from "@prisma/client";
import { processConvergenceAfterRun } from "../lib/convergence.js";
import {
  agentWroteDocsInStep,
  collectAgentStepOutput,
  collectToolStepArtifacts,
  persistAgentDeliverableIfMissing,
} from "../lib/agent-deliverables.js";
import { prisma } from "../lib/prisma.js";
import { ensureProductWorkspace } from "../lib/product-workspace.js";
import { ensureTenantWorkspace } from "../lib/tenant-workspace.js";
import {
  buildWorkspacePromptSection,
  syncTenantPortfolioManifest,
  agentDocsPath,
} from "../lib/workspace-layout.js";
import { resolveAgentProviderConfig, resolveEffectiveModel, tenantLlmFromRecord, type TenantLlmOverrides } from "../lib/tenant-llm.js";
import type {
  AgentWithSkills,
  ExecuteWorkflowInput,
  ExecutionEvent,
  SharedMemory,
  StepInputConfig,
  StepOutputConfig,
  StepResult,
  WorkflowGraph,
} from "../types/index.js";
import { createLanguageModel, estimateCostUsd, findApiCallError, formatLlmProviderError } from "./providers.js";
import { prepareSharedMemoryForPrompt } from "../lib/prompt-memory.js";
import { createAgentTools, createAgentToolsWithIntegrations } from "./tools.js";
import { getPlatformSettingsSync } from "../lib/platform-settings.js";
import { WORKFLOW_NAMES } from "../lib/workflow-names.js";
import {
  extractMungerVeto,
  formatMungerVetoError,
} from "../lib/munger-veto.js";
import {
  buildProductProfilePromptSection,
  parseProductProfile,
} from "../lib/product-profile.js";
import {
  FULLSTACK_AGENT_NAME,
  resolveFullstackStepOrder,
  shouldUseReadonlyToolsAfterOpencode,
  workflowHasFullstackStep,
} from "../lib/opencode-workflow.js";

type LogEmitter = (event: ExecutionEvent) => void;

interface TenantExecutionContext {
  workspaceRoot: string;
  llm: TenantLlmOverrides | null;
  maxCostUsdPerRun: number | null;
  tenantId?: string;
  productSlug?: string;
  productId?: string;
  githubToken?: string;
  implementationMode?: "local" | "opencode";
  afterOpencodeDelegation?: boolean;
  fullstackStepOrder?: number | null;
}

export class WorkflowExecutor {
  private readonly workspaceRoot: string;
  private readonly shellTimeoutMs: number;

  constructor(options?: { workspaceRoot?: string; shellTimeoutMs?: number }) {
    this.workspaceRoot =
      options?.workspaceRoot ?? process.env.WORKSPACE_ROOT ?? process.cwd();
    this.shellTimeoutMs =
      options?.shellTimeoutMs ?? getPlatformSettingsSync().shellTimeoutMs;
  }

  async execute(
    workflowId: string,
    input: ExecuteWorkflowInput = {},
    emit?: LogEmitter,
  ): Promise<string> {
    const run = await prisma.executionRun.create({
      data: {
        workflowId,
        tenantId: input.tenantId,
        status: "PENDING",
        sharedMemory: (input.initialMemory ?? {}) as object,
      },
    });

    await this.runExisting(run.id, workflowId, input, emit);
    return run.id;
  }

  async runExisting(
    runId: string,
    workflowId: string,
    input: ExecuteWorkflowInput = {},
    emit?: LogEmitter,
  ): Promise<void> {
    const workflow = await this.loadWorkflowGraph(workflowId);
    const tenantCtx = await this.loadTenantContext(input.tenantId, input.productSlug);
    const syncConsensus = input.syncConsensus !== false;
    const workflowName = input.workflowName ?? workflow.name;

    const emitEvent = (type: ExecutionEvent["type"], data: Record<string, unknown>) => {
      const event: ExecutionEvent = {
        type,
        runId,
        timestamp: new Date().toISOString(),
        data,
      };
      emit?.(event);
      emitRunEvent(event);
    };

    try {
      await this.updateRunStatus(runId, "RUNNING", { startedAt: new Date() });
      emitEvent("status", { status: "RUNNING", workflowId, workflowName: workflow.name });

      const platform = getPlatformSettingsSync();
      const effectiveModel = resolveEffectiveModel(
        workflow.steps[0]?.agent.model ?? "",
        tenantCtx.llm,
        platform,
      );
      await this.appendLog(runId, "info", "Resolved LLM configuration for run", {
        payload: {
          provider: platform.defaultProvider,
          model: effectiveModel.model,
          modelSource: effectiveModel.source,
        },
      });

      const orderedSteps = topologicalSort(workflow);
      const usesOpencode = workflowHasFullstackStep(workflow);
      let sharedMemory: SharedMemory = {
        ...(input.initialMemory ?? {}),
        _history: input.initialMemory?._history ?? [],
      };

      const resumeFromStepOrder = input.resumeFromStepOrder ?? 0;
      let implementationMode: "local" | "opencode" = input.forceLocalImplementation
        ? "local"
        : sharedMemory._implementationMode === "local"
          ? "local"
          : "opencode";

      if (
        input.tenantId &&
        usesOpencode &&
        !input.afterOpencodeDelegation &&
        resumeFromStepOrder === 0
      ) {
        const { prepareOpencodeImplementationGate } = await import("../lib/opencode-bridge.js");
        const gateResult = await prepareOpencodeImplementationGate({
          tenantId: input.tenantId,
          runId,
          forceLocalImplementation: input.forceLocalImplementation,
        });

        if (gateResult === "awaiting_user") {
          emitEvent("done", { status: "AWAITING_USER", reason: "opencode_not_configured" });
          return;
        }
        if (gateResult === "cancelled") {
          emitEvent("done", { status: "CANCELLED" });
          return;
        }

        implementationMode = gateResult === "opencode" ? "opencode" : "local";
        sharedMemory = {
          ...sharedMemory,
          _implementationMode: implementationMode,
        };
        await prisma.executionRun.update({
          where: { id: runId },
          data: { sharedMemory: sharedMemory as object },
        });
      } else if (input.afterOpencodeDelegation) {
        implementationMode = "local";
      } else if (sharedMemory._implementationMode === "local") {
        implementationMode = "local";
      }

      tenantCtx.tenantId = input.tenantId;
      tenantCtx.productId = input.productId;
      tenantCtx.implementationMode = implementationMode;
      tenantCtx.afterOpencodeDelegation = input.afterOpencodeDelegation;
      tenantCtx.fullstackStepOrder = resolveFullstackStepOrder(orderedSteps);

      let totalTokens = 0;
      let totalCostUsd = 0;

      const assertCostLimit = () => {
        if (
          tenantCtx.maxCostUsdPerRun != null &&
          totalCostUsd >= tenantCtx.maxCostUsdPerRun
        ) {
          throw new Error(
            `Run cost limit exceeded ($${tenantCtx.maxCostUsdPerRun.toFixed(4)} USD)`,
          );
        }
      };

      for (const step of orderedSteps) {
        const { isRunCancelled } = await import("../worker/run-control.js");
        if (isRunCancelled(runId)) {
          await this.updateRunStatus(runId, "CANCELLED", { completedAt: new Date() });
          emitEvent("done", { status: "CANCELLED" });
          return;
        }

        if (step.stepOrder < resumeFromStepOrder) {
          continue;
        }

        assertCostLimit();

        emitEvent("step_start", {
          stepId: step.id,
          agentName: step.agent.name,
          stepOrder: step.stepOrder,
        });

        await this.appendLog(runId, "info", `Starting step: ${step.agent.name}`, {
          stepId: step.id,
          agentId: step.agent.id,
        });

        const result = await this.executeStep(
          runId,
          step.agent,
          step.inputConfig,
          sharedMemory,
          tenantCtx,
          step.stepOrder,
          workflowName,
        );

        totalTokens += result.usage.totalTokens;
        totalCostUsd += result.usage.estimatedCostUsd;
        assertCostLimit();

        sharedMemory = mergeStepOutput(
          sharedMemory,
          step.outputConfig,
          step.id,
          step.agent.name,
          result.output,
          step.stepOrder,
          {
            wroteDocs: result.wroteDocs,
            savedDeliverablePath: result.savedDeliverablePath,
          },
        );

        const veto = extractMungerVeto(step.agent.name, result.output);
        if (veto) {
          sharedMemory.veto = veto;
          sharedMemory._stoppedByVeto = true;
          sharedMemory.nextAction = `Blocked by Munger veto: ${veto.reason}`;

          await prisma.executionRun.update({
            where: { id: runId },
            data: {
              sharedMemory: sharedMemory as object,
              totalTokens,
              totalCostUsd,
            },
          });

          if (input.tenantId && syncConsensus) {
            await processConvergenceAfterRun(
              input.tenantId,
              workflowName,
              sharedMemory,
              runId,
              input.productSlug,
            );
          }

          const vetoMessage = formatMungerVetoError(veto);
          await this.updateRunStatus(runId, "CANCELLED", {
            completedAt: new Date(),
            errorMessage: vetoMessage,
            totalTokens,
            totalCostUsd,
            sharedMemory: sharedMemory as object,
          });

          await this.appendLog(runId, "warn", vetoMessage, {
            stepId: step.id,
            agentId: step.agent.id,
            payload: { veto },
          });

          await this.dispatchRunNotification(runId, input.tenantId, "FAILED", {
            totalTokens,
            totalCostUsd,
            errorMessage: vetoMessage,
          });

          emitEvent("veto", { by: veto.by, reason: veto.reason, agentName: step.agent.name });
          emitEvent("done", { status: "CANCELLED", reason: "veto", veto });
          return;
        }

        if (
          tenantCtx.implementationMode === "opencode" &&
          step.agent.name === FULLSTACK_AGENT_NAME &&
          !input.afterOpencodeDelegation
        ) {
          const runAfterStep = await prisma.executionRun.findUnique({
            where: { id: runId },
            select: { status: true },
          });
          if (runAfterStep?.status === "DELEGATED") {
            await prisma.executionRun.update({
              where: { id: runId },
              data: { sharedMemory: sharedMemory as object, totalTokens, totalCostUsd },
            });
            emitEvent("done", { status: "DELEGATED" });
            return;
          }
          if (runAfterStep?.status === "AWAITING_USER") {
            await prisma.executionRun.update({
              where: { id: runId },
              data: { sharedMemory: sharedMemory as object, totalTokens, totalCostUsd },
            });
            emitEvent("done", { status: "AWAITING_USER", reason: "opencode_confirm" });
            return;
          }

          if (!result.delegated) {
            const { startOpencodeDelegation, degradeRunToLocalImplementation, OpencodeConfirmationPendingError } = await import(
              "../lib/opencode-bridge.js"
            );
            if (input.tenantId) {
              try {
                await startOpencodeDelegation({
                  tenantId: input.tenantId,
                  runId,
                  brief: result.output,
                  sharedMemory,
                  productSlug: input.productSlug,
                  productId: input.productId,
                  resumeFromStepOrder: step.stepOrder + 1,
                });
                await prisma.executionRun.update({
                  where: { id: runId },
                  data: { sharedMemory: sharedMemory as object, totalTokens, totalCostUsd },
                });
                emitEvent("done", { status: "DELEGATED" });
                return;
              } catch (err) {
                if (err instanceof OpencodeConfirmationPendingError) {
                  await prisma.executionRun.update({
                    where: { id: runId },
                    data: { sharedMemory: sharedMemory as object, totalTokens, totalCostUsd },
                  });
                  emitEvent("done", { status: "AWAITING_USER", reason: "opencode_confirm" });
                  return;
                }
                const reason = err instanceof Error ? err.message : String(err);
                await this.appendLog(runId, "warn", "OpenCode delegation failed — degrading to local", {
                  stepId: step.id,
                  agentId: step.agent.id,
                  payload: { error: reason },
                });
                await degradeRunToLocalImplementation({
                  runId,
                  tenantId: input.tenantId,
                  workflowId: workflow.id,
                  workflowName,
                  sharedMemory,
                  productSlug: input.productSlug,
                  resumeFromStepOrder: step.stepOrder,
                  reason,
                });
                emitEvent("done", { status: "PENDING", degraded: true });
                return;
              }
            }
          }
        }

        await prisma.executionRun.update({
          where: { id: runId },
          data: {
            sharedMemory: sharedMemory as object,
            totalTokens,
            totalCostUsd,
          },
        });

        emitEvent("step_complete", {
          stepId: step.id,
          agentName: step.agent.name,
          outputPreview: result.output.slice(0, 500),
          tokensUsed: result.usage.totalTokens,
          toolCalls: result.toolCalls,
        });

        await this.appendLog(runId, "info", `Completed step: ${step.agent.name}`, {
          stepId: step.id,
          agentId: step.agent.id,
          tokensUsed: result.usage.totalTokens,
          costUsd: result.usage.estimatedCostUsd,
          payload: { outputLength: result.output.length },
        });
      }

      await this.updateRunStatus(runId, "COMPLETED", {
        completedAt: new Date(),
        totalTokens,
        totalCostUsd,
        sharedMemory: sharedMemory as object,
      });

      if (input.tenantId && syncConsensus) {
        await processConvergenceAfterRun(
          input.tenantId,
          workflowName,
          sharedMemory,
          runId,
          input.productSlug,
        );
      }

      if (workflowName === WORKFLOW_NAMES.PRODUCT_INTAKE && input.tenantId) {
        const { finalizeProductIntake } = await import("../lib/product-intake.js");
        await finalizeProductIntake(input.tenantId, runId, sharedMemory, input.productSlug);
      }

      if (input.tenantId) {
        let productName: string | null = null;
        if (input.productId || input.productSlug) {
          const product = await prisma.tenantProduct.findFirst({
            where: input.productId
              ? { id: input.productId, tenantId: input.tenantId }
              : { tenantId: input.tenantId, slug: input.productSlug! },
            select: { name: true },
          });
          productName = product?.name ?? null;
        }

        try {
          const { generateAndPersistRunSummary } = await import("../lib/run-summary.js");
          const summary = await generateAndPersistRunSummary({
            runId,
            tenantId: input.tenantId,
            workflowName,
            sharedMemory,
            productSlug: input.productSlug,
            productName,
            tenantLlm: tenantCtx.llm,
          });
          if (summary) {
            sharedMemory.runSummary = summary;
            sharedMemory.runSummaryGeneratedAt = new Date().toISOString();
            await prisma.executionRun.update({
              where: { id: runId },
              data: { sharedMemory: sharedMemory as object },
            });
          }
        } catch (summaryErr) {
          const message = summaryErr instanceof Error ? summaryErr.message : String(summaryErr);
          await this.appendLog(runId, "warn", "Run summary generation failed", {
            payload: { error: message },
          });
        }
      }

      await this.dispatchRunNotification(runId, input.tenantId, "COMPLETED", {
        totalTokens,
        totalCostUsd,
      });

      emitEvent("done", { status: "COMPLETED", totalTokens, totalCostUsd });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.updateRunStatus(runId, "FAILED", {
        completedAt: new Date(),
        errorMessage: message,
      });
      if (workflowName === WORKFLOW_NAMES.PRODUCT_INTAKE && input.tenantId) {
        const { prisma: db } = await import("../lib/prisma.js");
        await db.tenantProduct.updateMany({
          where: {
            tenantId: input.tenantId,
            intakeRunId: runId,
            intakeStatus: "running",
          },
          data: { intakeStatus: "failed" },
        });
      }
      await this.appendLog(runId, "error", message);
      emitEvent("error", { message });
      await this.dispatchRunNotification(runId, input.tenantId, "FAILED", {
        errorMessage: message,
      });
      emitEvent("done", { status: "FAILED", error: message });
      throw err;
    }
  }

  private async dispatchRunNotification(
    runId: string,
    tenantId: string | undefined,
    status: "COMPLETED" | "FAILED",
    extra: { totalTokens?: number; totalCostUsd?: number; errorMessage?: string },
  ) {
    if (!tenantId) return;
    const run = await prisma.executionRun.findUnique({
      where: { id: runId },
      include: { workflow: { select: { name: true } } },
    });
    if (!run) return;

    const { notifyRunFinished } = await import("../lib/usage-limits.js");
    void notifyRunFinished({
      tenantId,
      runId,
      status,
      workflowName: run.workflow.name,
      totalCostUsd: extra.totalCostUsd ?? run.totalCostUsd,
      totalTokens: extra.totalTokens ?? run.totalTokens,
      errorMessage: extra.errorMessage ?? run.errorMessage,
    });
  }

  private async executeStep(
    runId: string,
    agent: AgentWithSkills,
    inputConfig: StepInputConfig,
    sharedMemory: SharedMemory,
    tenantCtx: TenantExecutionContext,
    stepOrder?: number,
    workflowName?: string,
  ): Promise<StepResult> {
    let delegated = false;
    const toolMode = this.resolveToolMode(agent.name, tenantCtx, stepOrder);

    const systemPrompt = compileSystemPrompt(
      agent,
      prepareSharedMemoryForPrompt(sharedMemory),
      inputConfig,
      {
      productSlug: tenantCtx.productSlug,
      productName:
        typeof sharedMemory.focusProductName === "string"
          ? sharedMemory.focusProductName
          : tenantCtx.productSlug,
      toolMode,
      afterOpencodeDelegation: tenantCtx.afterOpencodeDelegation,
    });
    const userPrompt = compileUserPrompt(prepareSharedMemoryForPrompt(sharedMemory), inputConfig);

    const providerConfig = resolveAgentProviderConfig(agent, tenantCtx.llm);

    await this.appendLog(runId, "info", `Using LLM ${providerConfig.provider} / ${providerConfig.model}`, {
      agentId: agent.id,
      payload: { agentName: agent.name, toolMode },
    });

    const model = createLanguageModel(providerConfig);

    let productId = tenantCtx.productId;
    if (!productId && tenantCtx.tenantId && tenantCtx.productSlug) {
      const product = await prisma.tenantProduct.findUnique({
        where: { tenantId_slug: { tenantId: tenantCtx.tenantId, slug: tenantCtx.productSlug } },
        select: { id: true },
      });
      productId = product?.id;
    }

    const toolContext = {
      workspaceRoot: tenantCtx.workspaceRoot,
      shellTimeoutMs: this.shellTimeoutMs,
      runId,
      tenantId: tenantCtx.tenantId,
      productSlug: tenantCtx.productSlug,
      productId,
      githubToken: tenantCtx.githubToken,
      agentId: agent.id,
      toolMode,
      sharedMemory,
      onLog: (message: string, payload?: Record<string, unknown>) => {
        void this.appendLog(runId, "debug", message, { agentId: agent.id, payload });
      },
      onDelegationStarted: () => {
        delegated = true;
      },
      resumeFromStepOrder: stepOrder != null ? stepOrder + 1 : undefined,
    };

    const baseTools = createAgentTools(toolContext);
    const tools = await createAgentToolsWithIntegrations(toolContext);
    const mcpToolCount = Object.keys(tools).length - Object.keys(baseTools).length;

    const callLlm = (activeTools: typeof tools) =>
      generateText({
        model,
        temperature: agent.temperature,
        system: systemPrompt,
        prompt: userPrompt,
        tools: activeTools as unknown as NonNullable<Parameters<typeof generateText>[0]["tools"]>,
        maxSteps: 10,
      });

    const runWithOptionalMcpFallback = async () => {
      try {
        return await callLlm(tools);
      } catch (err) {
        const apiErr = findApiCallError(err);
        if (apiErr?.statusCode === 400 && mcpToolCount > 0) {
          await this.appendLog(runId, "warn", "LLM HTTP 400 with MCP tools — retrying with base tools only (re-sync MCP or run Validate LLM in Settings)", {
            agentId: agent.id,
            payload: { mcpToolCount, statusCode: apiErr.statusCode },
          });
          try {
            return await callLlm(baseTools);
          } catch (retryErr) {
            await this.logAndThrowLlmError(runId, agent.id, retryErr, providerConfig);
            throw new Error("LLM call failed");
          }
        }
        await this.logAndThrowLlmError(runId, agent.id, err, providerConfig);
        throw new Error("LLM call failed");
      }
    };

    const response = await runWithOptionalMcpFallback();

    let output = collectAgentStepOutput(response);
    let promptTokens = response.usage?.promptTokens ?? 0;
    let completionTokens = response.usage?.completionTokens ?? 0;

    if (!output.trim() && (response.steps?.length ?? 0) > 0) {
      const toolArtifacts = collectToolStepArtifacts(response);
      const taskHint =
        typeof sharedMemory.task === "string" && sharedMemory.task.trim()
          ? sharedMemory.task.trim()
          : userPrompt;

      await this.appendLog(runId, "info", "Synthesizing text deliverable after tool-only agent steps", {
        agentId: agent.id,
        payload: { agentName: agent.name, toolSteps: response.steps?.length ?? 0 },
      });

      const synthesis = await generateText({
        model,
        temperature: Math.min(agent.temperature, 0.5),
        system: systemPrompt,
        prompt: `You completed tool calls for this workflow step but returned no final written deliverable.

Task:
${taskHint}

${toolArtifacts ? `Captured tool activity:\n${toolArtifacts}\n\n` : ""}Write the deliverable now in markdown (actionable, not meta-commentary), then end with the mandatory JSON handoff fenced block from the system instructions. Do not use tools.`,
        maxSteps: 1,
      }).catch((err) => {
        throw new Error(formatLlmProviderError(err, providerConfig));
      });

      output = collectAgentStepOutput(synthesis) || toolArtifacts;
      promptTokens += synthesis.usage?.promptTokens ?? 0;
      completionTokens += synthesis.usage?.completionTokens ?? 0;
    }

    const totalTokens = promptTokens + completionTokens;
    const wroteDocs = agentWroteDocsInStep(response);
    let savedDeliverablePath: string | undefined;

    if (tenantCtx.productSlug && output.trim() && !wroteDocs) {
      const savedPath = await persistAgentDeliverableIfMissing({
        workspaceRoot: tenantCtx.workspaceRoot,
        agentName: agent.name,
        workflowName: workflowName ?? "workflow",
        runId,
        output,
        response,
      });
      if (savedPath) {
        savedDeliverablePath = savedPath;
        await this.appendLog(runId, "info", `Saved agent deliverable: ${savedPath}`, {
          agentId: agent.id,
          payload: { path: savedPath },
        });
      }
    }

    return {
      output,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: estimateCostUsd(
          providerConfig.provider,
          providerConfig.model,
          promptTokens,
          completionTokens,
        ),
      },
      toolCalls: response.steps?.length ?? 0,
      delegated,
      wroteDocs,
      savedDeliverablePath,
    };
  }

  private resolveToolMode(
    agentName: string,
    tenantCtx: TenantExecutionContext,
    stepOrder?: number,
  ): "full" | "readonly" | "opencode_delegate" {
    if (tenantCtx.implementationMode === "opencode") {
      if (agentName === FULLSTACK_AGENT_NAME && !tenantCtx.afterOpencodeDelegation) {
        return "opencode_delegate";
      }
      if (
        tenantCtx.afterOpencodeDelegation &&
        shouldUseReadonlyToolsAfterOpencode(stepOrder, tenantCtx.fullstackStepOrder ?? null)
      ) {
        return "readonly";
      }
    }
    return "full";
  }

  private async loadTenantContext(tenantId?: string, productSlug?: string): Promise<TenantExecutionContext> {
    if (!tenantId) {
      return {
        workspaceRoot: this.workspaceRoot,
        llm: null,
        maxCostUsdPerRun: null,
      };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { llmConfig: true },
    });

    const tenantWorkspace = await ensureTenantWorkspace(tenantId, tenant?.slug, tenant?.name);
    const { syncTenantConsensusToWorkspace } = await import("../lib/consensus.js");
    await syncTenantConsensusToWorkspace(tenantId, tenantWorkspace);
    await syncTenantPortfolioManifest(tenantId, tenantWorkspace);

    let workspaceRoot = tenantWorkspace;
    if (productSlug) {
      workspaceRoot = await ensureProductWorkspace(productSlug);
      const { syncProductConsensusToWorkspace } = await import("../lib/product-consensus.js");
      const product = await prisma.tenantProduct.findUnique({
        where: { tenantId_slug: { tenantId, slug: productSlug } },
      });
      if (product) {
        await syncProductConsensusToWorkspace(product.id, product.slug);
      }
    }

    const llm = tenantLlmFromRecord(tenant?.llmConfig ?? null);

    let githubToken: string | undefined;
    try {
      const { resolveTenantGithubToken } = await import("../lib/tenant-integrations.js");
      githubToken = await resolveTenantGithubToken(tenantId);
    } catch {
      githubToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
    }

    return {
      workspaceRoot,
      llm,
      maxCostUsdPerRun: llm?.maxCostUsdPerRun ?? null,
      productSlug,
      githubToken,
    };
  }

  private async loadWorkflowGraph(workflowId: string): Promise<WorkflowGraph> {
    const workflow = await prisma.workflow.findUniqueOrThrow({
      where: { id: workflowId },
      include: {
        steps: {
          include: {
            agent: {
              include: { skills: { include: { skill: true } } },
            },
          },
          orderBy: { stepOrder: "asc" },
        },
        edges: true,
      },
    });

    return mapWorkflowToGraph(workflow);
  }

  private async updateRunStatus(
    runId: string,
    status: ExecutionStatus,
    extra: Record<string, unknown> = {},
  ) {
    await prisma.executionRun.update({
      where: { id: runId },
      data: { status, ...extra },
    });
  }

  private async logAndThrowLlmError(
    runId: string,
    agentId: string,
    err: unknown,
    providerConfig: { provider: string; model: string },
  ): Promise<never> {
    const apiErr = findApiCallError(err);
    if (apiErr?.responseBody) {
      const bodySnippet = apiErr.responseBody.slice(0, 2_000);
      await this.appendLog(runId, "error", "LLM provider response body", {
        agentId,
        payload: {
          statusCode: apiErr.statusCode,
          body: bodySnippet,
        },
      });
    }
    throw new Error(formatLlmProviderError(err, providerConfig));
  }

  private async appendLog(
    runId: string,
    level: LogLevel,
    message: string,
    extra?: {
      stepId?: string;
      agentId?: string;
      tokensUsed?: number;
      costUsd?: number;
      payload?: unknown;
    },
  ) {
    await prisma.executionLog.create({
      data: {
        runId,
        level,
        message,
        stepId: extra?.stepId,
        agentId: extra?.agentId,
        tokensUsed: extra?.tokensUsed,
        costUsd: extra?.costUsd,
        payload: extra?.payload as object | undefined,
      },
    });

    emitRunEvent({
      type: level === "error" ? "error" : "log",
      runId,
      timestamp: new Date().toISOString(),
      data: {
        level,
        message,
        stepId: extra?.stepId,
        agentId: extra?.agentId,
        payload: extra?.payload,
      },
    });
  }
}

function mapWorkflowToGraph(workflow: {
  id: string;
  name: string;
  steps: Array<{
    id: string;
    agentId: string;
    stepOrder: number;
    label: string | null;
    positionX: number;
    positionY: number;
    inputConfig: unknown;
    outputConfig: unknown;
    agent: {
      id: string;
      name: string;
      role: string;
      systemPrompt: string;
      provider: AgentWithSkills["provider"];
      model: string;
      temperature: number;
      skills: Array<{ skill: { id: string; name: string; description: string; promptContent: string } }>;
    };
  }>;
  edges: Array<{
    id: string;
    sourceStepId: string;
    targetStepId: string;
    sourceHandle: string | null;
    targetHandle: string | null;
  }>;
}): WorkflowGraph {
  return {
    id: workflow.id,
    name: workflow.name,
    steps: workflow.steps.map((step) => ({
      id: step.id,
      agentId: step.agentId,
      stepOrder: step.stepOrder,
      label: step.label,
      positionX: step.positionX,
      positionY: step.positionY,
      inputConfig: step.inputConfig as StepInputConfig,
      outputConfig: step.outputConfig as StepOutputConfig,
      agent: {
        id: step.agent.id,
        name: step.agent.name,
        role: step.agent.role,
        systemPrompt: step.agent.systemPrompt,
        provider: step.agent.provider,
        model: step.agent.model,
        temperature: step.agent.temperature,
        skills: step.agent.skills.map((as) => ({
          id: as.skill.id,
          name: as.skill.name,
          description: as.skill.description,
          promptContent: as.skill.promptContent,
        })),
      },
    })),
    edges: workflow.edges.map((e) => ({
      id: e.id,
      sourceStepId: e.sourceStepId,
      targetStepId: e.targetStepId,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

export function compileSystemPrompt(
  agent: AgentWithSkills,
  sharedMemory: SharedMemory,
  inputConfig: StepInputConfig,
  workspace?: {
    productSlug?: string;
    productName?: string;
    toolMode?: "full" | "readonly" | "opencode_delegate";
    afterOpencodeDelegation?: boolean;
  },
): string {
  const sections: string[] = [`# Role: ${agent.role}`, agent.systemPrompt];

  if (agent.skills.length > 0) {
    sections.push("\n## Available Skills\n");
    for (const skill of agent.skills) {
      sections.push(`### Skill: ${skill.name}\n${skill.description}\n\n${skill.promptContent}\n`);
    }
  }

  if (inputConfig.customPrompt) {
    sections.push(`\n## Step Instructions\n${inputConfig.customPrompt}`);
  }

  if (typeof sharedMemory.convergenceRules === "string" && sharedMemory.convergenceRules.trim()) {
    sections.push(`\n## Cycle Convergence\n${sharedMemory.convergenceRules.trim()}`);
  }

  if (typeof sharedMemory.focusProductSlug === "string") {
    sections.push(
      `\n## Focus Product\n${sharedMemory.focusProductName ?? sharedMemory.focusProductSlug} (\`${sharedMemory.focusProductSlug}\`) — workspace root is this product repo.`,
    );
    if (typeof sharedMemory.productDescription === "string" && sharedMemory.productDescription.trim()) {
      sections.push(`\n### Product description\n${sharedMemory.productDescription.trim()}`);
    }
    if (typeof sharedMemory.productPhase === "string" && sharedMemory.productPhase.trim()) {
      sections.push(`\n### Product phase\n${sharedMemory.productPhase.trim()}`);
    }
    if (typeof sharedMemory.githubRepoUrl === "string" && sharedMemory.githubRepoUrl.trim()) {
      sections.push(`\n### GitHub repository\n${sharedMemory.githubRepoUrl.trim()}`);
    }
  }

  if (sharedMemory.productProfile && typeof sharedMemory.productProfile === "object") {
    const profileSection = buildProductProfilePromptSection(
      parseProductProfile(sharedMemory.productProfile),
    );
    if (profileSection) sections.push(`\n${profileSection}`);
  }

  sections.push(`\n${buildWorkspacePromptSection({
    productSlug: workspace?.productSlug ?? (typeof sharedMemory.focusProductSlug === "string" ? sharedMemory.focusProductSlug : undefined),
    productName: workspace?.productName ?? (typeof sharedMemory.focusProductName === "string" ? sharedMemory.focusProductName : undefined),
  })}`);

  sections.push(`\n## Your deliverables path\nSave role documents under \`${agentDocsPath(agent.name)}/\` (relative to workspace root).`);

  if (inputConfig.passSharedMemory !== false && Object.keys(sharedMemory).length > 0) {
    const { _history, ...rest } = sharedMemory;
    sections.push(
      `\n## Shared Workflow Memory\n\`\`\`json\n${JSON.stringify(rest, null, 2)}\n\`\`\``,
    );
    if (_history?.length) {
      sections.push(
        `\n## Prior Agent Outputs\n${_history
          .slice(-5)
          .map((h) => `- **${h.agentName}**: ${h.output.slice(0, 300)}…`)
          .join("\n")}`,
      );
    }
  }

  if (workspace?.afterOpencodeDelegation && typeof sharedMemory.opencodeResultSummary === "string") {
    sections.push(
      `\n## OpenCode Implementation Result\n${sharedMemory.opencodeResultSummary}`,
    );
    if (typeof sharedMemory.opencodeDiffCount === "number") {
      sections.push(`\nFiles changed (reported by OpenCode): ${sharedMemory.opencodeDiffCount}`);
    }
  }

  if (workspace?.toolMode === "opencode_delegate") {
    sections.push(
      "\n## Tool Usage\nYou MUST call `delegate_implementation` with a complete implementation brief. Do NOT write code locally — OpenCode on the tenant server will implement it.",
    );
  } else if (workspace?.toolMode === "readonly") {
    sections.push(
      "\n## Tool Usage\nRead-only mode: review the OpenCode result using read_file and list_dir. Do not modify code in this workspace.",
    );
  } else {
    sections.push(
      "\n## Tool Usage\nYou may use run_shell_command, read_file, write_file, and list_dir. Respect safety limits.",
    );
  }

  if (workspace?.productSlug) {
    sections.push(
      `\n## Product Consensus (${workspace.productSlug})\nYour handoff is appended to **${workspace.productSlug}'s** product consensus (one revision per step). Read \`consensus.md\` at the workspace root for full prior context; use the JSON memory above for the most recent state. Tenant-level (company) consensus is separate and only tracks cycle strategy / pipeline.`,
    );
  } else {
    sections.push(
      "\n## Consensus File\nTenant (company) consensus lives at `consensus.md` in the workspace root (also in Shared Workflow Memory). Prefer the JSON memory when present; use read_file on `consensus.md` only if you need the full document.",
    );
  }

  sections.push(
    "\n## Consensus Handoff\nIf you finalize a cycle decision, set `nextAction` in your reasoning and include a fenced JSON block labeled `consensusUpdate`/`decisions`/`openQuestions`/`veto` in shared output. The block is parsed and stored as one revision. See the `## Consensus Handoff (mandatory structured output)` section in your cycle rules for the exact schema.",
  );

  return sections.join("\n");
}

function compileUserPrompt(sharedMemory: SharedMemory, inputConfig: StepInputConfig): string {
  if (inputConfig.contextKeys?.length) {
    const subset: Record<string, unknown> = {};
    for (const key of inputConfig.contextKeys) {
      subset[key] = sharedMemory[key];
    }
    return `Execute your role using this context:\n\`\`\`json\n${JSON.stringify(subset, null, 2)}\n\`\`\``;
  }

  const task = sharedMemory.task ?? sharedMemory.nextAction;
  if (typeof task === "string") {
    return `Current task:\n${task}`;
  }

  return "Execute your assigned role in this workflow step. Produce actionable output for the next agent.";
}

function mergeStepOutput(
  memory: SharedMemory,
  outputConfig: StepOutputConfig,
  stepId: string,
  agentName: string,
  output: string,
  stepOrder?: number,
  deliverableMeta?: { wroteDocs?: boolean; savedDeliverablePath?: string },
): SharedMemory {
  const history = memory._history ?? [];
  const next: SharedMemory = {
    ...memory,
    _history: [
      ...history,
      {
        stepId,
        agentName,
        output,
        timestamp: new Date().toISOString(),
        ...(stepOrder != null ? { stepOrder } : {}),
        ...(deliverableMeta?.wroteDocs ? { wroteDocs: true } : {}),
        ...(deliverableMeta?.savedDeliverablePath
          ? { savedDeliverablePath: deliverableMeta.savedDeliverablePath }
          : {}),
      },
    ],
    lastOutput: output,
    lastAgent: agentName,
  };

  if (outputConfig.appendToSharedMemory !== false) {
    next[outputConfig.memoryKey ?? agentName] = output;
  }

  return next;
}

export function topologicalSort(workflow: WorkflowGraph) {
  const stepMap = new Map(workflow.steps.map((s) => [s.id, s]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const step of workflow.steps) {
    inDegree.set(step.id, 0);
    adjacency.set(step.id, []);
  }

  for (const edge of workflow.edges) {
    adjacency.get(edge.sourceStepId)?.push(edge.targetStepId);
    inDegree.set(edge.targetStepId, (inDegree.get(edge.targetStepId) ?? 0) + 1);
  }

  const queue = workflow.steps
    .filter((s) => (inDegree.get(s.id) ?? 0) === 0)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const sorted: WorkflowGraph["steps"] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current.id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) {
        const step = stepMap.get(neighbor);
        if (step) queue.push(step);
      }
    }
  }

  if (sorted.length !== workflow.steps.length) {
    return [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  }

  return sorted;
}

const runSubscribers = new Map<string, Set<LogEmitter>>();

export function subscribeToRun(runId: string, emit: LogEmitter): () => void {
  if (!runSubscribers.has(runId)) {
    runSubscribers.set(runId, new Set());
  }
  runSubscribers.get(runId)!.add(emit);
  return () => runSubscribers.get(runId)?.delete(emit);
}

export function emitRunEvent(event: ExecutionEvent) {
  runSubscribers.get(event.runId)?.forEach((fn) => fn(event));
}

export async function executeWorkflowInBackground(
  workflowId: string,
  input: ExecuteWorkflowInput = {},
): Promise<string> {
  const { warmPlatformSettingsCache } = await import("../lib/platform-settings.js");
  await warmPlatformSettingsCache();

  if (input.tenantId && !input.skipRunGuard) {
    const { assertTenantCanLaunchRun } = await import("../lib/run-guards.js");
    await assertTenantCanLaunchRun(input.tenantId);
  }

  let initialMemory = input.initialMemory;
  if (input.tenantId && input.mergeConsensus !== false) {
    if (input.productSlug) {
      const { loadProductConsensusInitialMemory } = await import("../lib/product-consensus.js");
      const product = await prisma.tenantProduct.findUnique({
        where: { tenantId_slug: { tenantId: input.tenantId, slug: input.productSlug } },
        select: { id: true },
      });
      if (product) {
        initialMemory = await loadProductConsensusInitialMemory(
          input.tenantId,
          product.id,
          input.initialMemory ?? {},
        );
      } else {
        const { loadConsensusInitialMemory } = await import("../lib/consensus.js");
        initialMemory = await loadConsensusInitialMemory(input.tenantId, input.initialMemory ?? {});
      }
    } else {
      const { loadConsensusInitialMemory } = await import("../lib/consensus.js");
      initialMemory = await loadConsensusInitialMemory(input.tenantId, input.initialMemory ?? {});
    }
  }

  const executionInput: ExecuteWorkflowInput = {
    ...input,
    initialMemory: {
      ...(initialMemory ?? {}),
      ...(input.productSlug
        ? {
            focusProductSlug: input.productSlug,
            ...(input.productId ? { productId: input.productId } : {}),
          }
        : {}),
    },
  };

  const run = await prisma.executionRun.create({
    data: {
      workflowId,
      tenantId: input.tenantId,
      status: "PENDING",
      sharedMemory: (executionInput.initialMemory ?? {}) as object,
    },
  });

  const jobData = {
    runId: run.id,
    workflowId,
    tenantId: input.tenantId,
    initialMemory: executionInput.initialMemory as Record<string, unknown> | undefined,
    mergeConsensus: input.mergeConsensus,
    syncConsensus: input.syncConsensus,
    productId: input.productId,
    productSlug: input.productSlug,
    workflowName: input.workflowName,
    metaReason: input.metaReason,
    resumeFromStepOrder: input.resumeFromStepOrder,
    forceLocalImplementation: input.forceLocalImplementation,
    afterOpencodeDelegation: input.afterOpencodeDelegation,
  };

  if (process.env.USE_INLINE_EXECUTOR !== "true") {
    try {
      const { enqueueWorkflowRun } = await import("../worker/queue.js");
      await enqueueWorkflowRun(jobData);
      return run.id;
    } catch (err) {
      console.warn("Queue unavailable, falling back to inline execution:", err);
    }
  }

  const executor = new WorkflowExecutor();
  void executor.runExisting(run.id, workflowId, executionInput).catch(() => {
    // errors handled inside runExisting
  });

  return run.id;
}
