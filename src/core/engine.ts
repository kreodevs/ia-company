import { generateText } from "ai";
import type { ExecutionStatus, LogLevel } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
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
import { createLanguageModel, estimateCostUsd } from "./providers.js";
import { createAgentTools } from "./tools.js";

type LogEmitter = (event: ExecutionEvent) => void;

export class WorkflowExecutor {
  private readonly workspaceRoot: string;
  private readonly shellTimeoutMs: number;

  constructor(options?: { workspaceRoot?: string; shellTimeoutMs?: number }) {
    this.workspaceRoot =
      options?.workspaceRoot ?? process.env.WORKSPACE_ROOT ?? process.cwd();
    this.shellTimeoutMs =
      options?.shellTimeoutMs ?? Number(process.env.SHELL_TIMEOUT_MS ?? 30_000);
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

      const orderedSteps = topologicalSort(workflow);
      let sharedMemory: SharedMemory = {
        ...(input.initialMemory ?? {}),
        _history: input.initialMemory?._history ?? [],
      };

      let totalTokens = 0;
      let totalCostUsd = 0;

      for (const step of orderedSteps) {
        emitEvent("step_start", {
          stepId: step.id,
          agentName: step.agent.name,
          stepOrder: step.stepOrder,
        });

        await this.appendLog(runId, "info", `Starting step: ${step.agent.name}`, {
          stepId: step.id,
          agentId: step.agent.id,
        });

        const result = await this.executeStep(runId, step.agent, step.inputConfig, sharedMemory);

        totalTokens += result.usage.totalTokens;
        totalCostUsd += result.usage.estimatedCostUsd;

        sharedMemory = mergeStepOutput(
          sharedMemory,
          step.outputConfig,
          step.id,
          step.agent.name,
          result.output,
        );

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

      emitEvent("done", { status: "COMPLETED", totalTokens, totalCostUsd });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.updateRunStatus(runId, "FAILED", {
        completedAt: new Date(),
        errorMessage: message,
      });
      await this.appendLog(runId, "error", message);
      emitEvent("error", { message });
      emitEvent("done", { status: "FAILED", error: message });
      throw err;
    }
  }

  private async executeStep(
    runId: string,
    agent: AgentWithSkills,
    inputConfig: StepInputConfig,
    sharedMemory: SharedMemory,
  ): Promise<StepResult> {
    const systemPrompt = compileSystemPrompt(agent, sharedMemory, inputConfig);
    const userPrompt = compileUserPrompt(sharedMemory, inputConfig);

    const model = createLanguageModel({
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature,
    });

    const tools = createAgentTools({
      workspaceRoot: this.workspaceRoot,
      shellTimeoutMs: this.shellTimeoutMs,
      runId,
      onLog: (message, payload) => {
        void this.appendLog(runId, "debug", message, { agentId: agent.id, payload });
      },
    });

    const response = await generateText({
      model,
      temperature: agent.temperature,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      maxSteps: 10,
    });

    const promptTokens = response.usage?.promptTokens ?? 0;
    const completionTokens = response.usage?.completionTokens ?? 0;
    const totalTokens = response.usage?.totalTokens ?? promptTokens + completionTokens;

    return {
      output: response.text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: estimateCostUsd(
          agent.provider,
          agent.model,
          promptTokens,
          completionTokens,
        ),
      },
      toolCalls: response.steps?.length ?? 0,
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

  sections.push(
    "\n## Tool Usage\nYou may use run_shell_command, read_file, write_file, and list_dir. Respect safety limits.",
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
): SharedMemory {
  const history = memory._history ?? [];
  const next: SharedMemory = {
    ...memory,
    _history: [
      ...history,
      { stepId, agentName, output, timestamp: new Date().toISOString() },
    ],
    lastOutput: output,
    lastAgent: agentName,
  };

  if (outputConfig.appendToSharedMemory !== false) {
    next[outputConfig.memoryKey ?? agentName] = output;
  }

  return next;
}

function topologicalSort(workflow: WorkflowGraph) {
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
  const run = await prisma.executionRun.create({
    data: {
      workflowId,
      tenantId: input.tenantId,
      status: "PENDING",
      sharedMemory: (input.initialMemory ?? {}) as object,
    },
  });

  const executor = new WorkflowExecutor();
  void executor.runExisting(run.id, workflowId, input).catch(() => {
    // errors handled inside runExisting
  });

  return run.id;
}
