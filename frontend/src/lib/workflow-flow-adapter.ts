import type { Edge, Node } from "@xyflow/react";
import type { Agent, Workflow, WorkflowStep } from "./api";
import { isFlowTriggerNode } from "@/components/organisms/flowEditorUtils";

const TRIGGER_ACTION = "on_manual_run";

function stepNodeId(stepId: string) {
  return `step-${stepId}`;
}

/** Converts legacy WorkflowStep rows to Kreo FlowEditor nodes + edges. */
export function workflowToFlowGraph(workflow: Workflow): { nodes: Node[]; edges: Edge[] } {
  const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder);

  const nodes: Node[] = [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 250, y: 40 },
      deletable: false,
      data: {
        label: "Ejecución manual",
        semanticType: "trigger",
        action: TRIGGER_ACTION,
        description: "Disparo desde editor u Office",
        dispatchable: false,
        params: {},
      },
    },
    ...sortedSteps.map((step, index) => ({
      id: stepNodeId(step.id),
      type: "action" as const,
      position: { x: step.positionX || 250, y: step.positionY || 180 + index * 140 },
      data: {
        label: step.label ?? step.agent.name,
        semanticType: "action" as const,
        action: "run_agent",
        description: step.agent.role,
        dispatchable: true,
        params: {
          agentId: step.agentId,
          label: step.label ?? step.agent.name,
          passSharedMemory: step.inputConfig?.passSharedMemory ?? true,
          customPrompt: step.inputConfig?.customPrompt ?? "",
          memoryKey: step.outputConfig?.memoryKey ?? "",
          appendToSharedMemory: step.outputConfig?.appendToSharedMemory ?? true,
        },
      },
    })),
  ];

  const edges: Edge[] = [];
  const stepIds = sortedSteps.map((s) => stepNodeId(s.id));

  if (workflow.edges.length > 0) {
    for (const edge of workflow.edges) {
      edges.push({
        id: edge.id.startsWith("e-") ? edge.id : `e-${edge.id}`,
        source: edge.sourceStepId.startsWith("step-")
          ? edge.sourceStepId
          : stepNodeId(edge.sourceStepId),
        target: edge.targetStepId.startsWith("step-")
          ? edge.targetStepId
          : stepNodeId(edge.targetStepId),
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        type: "smoothstep",
        animated: true,
      });
    }
    if (stepIds[0]) {
      edges.unshift({
        id: "e-trigger-first",
        source: "trigger",
        target: stepIds[0]!,
        type: "smoothstep",
        animated: true,
      });
    }
  } else if (stepIds.length > 0) {
    edges.push({
      id: "e-trigger-first",
      source: "trigger",
      target: stepIds[0]!,
      type: "smoothstep",
      animated: true,
    });
    for (let i = 0; i < stepIds.length - 1; i++) {
      edges.push({
        id: `e-${stepIds[i]}-${stepIds[i + 1]}`,
        source: stepIds[i]!,
        target: stepIds[i + 1]!,
        type: "smoothstep",
        animated: true,
      });
    }
  }

  return { nodes, edges };
}

function walkAgentNodesFromTrigger(nodes: Node[], edges: Edge[]): Node[] {
  const trigger = nodes.find((n) => isFlowTriggerNode(n));
  if (!trigger) {
    return nodes.filter((n) => {
      const data = n.data as Record<string, unknown>;
      return data.action === "run_agent";
    });
  }

  const ordered: Node[] = [];
  const visited = new Set<string>();
  let current: string | null = trigger.id;

  while (current) {
    const outEdges = edges.filter((e) => e.source === current);
    const nextEdge = outEdges.find((e) => !e.sourceHandle || e.sourceHandle === "true") ?? outEdges[0];
    if (!nextEdge) break;
    current = nextEdge.target;
    if (visited.has(current)) break;
    visited.add(current);
    const node = nodes.find((n) => n.id === current);
    if (!node) break;
    const data = node.data as Record<string, unknown>;
    if (data.action === "run_agent") ordered.push(node);
  }

  return ordered;
}

/** Extracts WorkflowStep[] from FlowEditor graph (run_agent nodes only). */
export function flowGraphToWorkflowSteps(
  nodes: Node[],
  edges: Edge[],
  existingSteps: WorkflowStep[],
  agents: Agent[],
): { steps: WorkflowStep[]; edges: Workflow["edges"] } {
  const agentNodes = walkAgentNodesFromTrigger(nodes, edges);
  const existingByAgentNodeId = new Map(
    existingSteps.map((step) => [stepNodeId(step.id), step]),
  );

  const steps: WorkflowStep[] = agentNodes.map((node, index) => {
    const data = node.data as Record<string, unknown>;
    const params = (data.params as Record<string, unknown>) ?? {};
    const agentId = String(params.agentId ?? "");
    const agent =
      agents.find((a) => a.id === agentId) ??
      existingSteps.find((s) => s.id === node.id.replace(/^step-/, ""))?.agent;

    const existing =
      existingByAgentNodeId.get(node.id) ??
      existingSteps.find((s) => node.id === stepNodeId(s.id) || node.id === s.id);

    const rawId = existing?.id ?? (node.id.startsWith("step-") ? node.id.slice(5) : node.id);
    const id = existing?.id ?? (rawId.startsWith("temp-") ? rawId : `temp-${rawId}`);

    return {
      id,
      agentId: agent?.id ?? agentId,
      stepOrder: index,
      label: String(params.label ?? data.label ?? agent?.name ?? "Agent"),
      positionX: node.position.x,
      positionY: node.position.y,
      inputConfig: {
        passSharedMemory: params.passSharedMemory ?? true,
        ...(params.customPrompt ? { customPrompt: params.customPrompt } : {}),
        ...(existing?.inputConfig ?? {}),
      },
      outputConfig: {
        appendToSharedMemory: params.appendToSharedMemory ?? true,
        ...(params.memoryKey ? { memoryKey: params.memoryKey } : {}),
        ...(existing?.outputConfig ?? {}),
      },
      agent: agent ?? existing?.agent ?? agents[0]!,
    };
  });

  const stepIdSet = new Set(steps.map((s) => stepNodeId(s.id)));
  const edgePayload: Workflow["edges"] = edges
    .filter((e) => stepIdSet.has(e.source) && stepIdSet.has(e.target))
    .map((e) => ({
      id: e.id.startsWith("reactflow") ? undefined : e.id,
      sourceStepId: e.source.startsWith("step-") ? e.source.slice(5) : e.source,
      targetStepId: e.target.startsWith("step-") ? e.target.slice(5) : e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })) as Workflow["edges"];

  if (edgePayload.length === 0 && steps.length > 1) {
    for (let i = 0; i < steps.length - 1; i++) {
      edgePayload.push({
        id: `e-${steps[i]!.id}-${steps[i + 1]!.id}`,
        sourceStepId: steps[i]!.id,
        targetStepId: steps[i + 1]!.id,
        sourceHandle: null,
        targetHandle: null,
      });
    }
  }

  return { steps, edges: edgePayload };
}

export function buildAgentDataSources(agents: Agent[]) {
  return {
    agents: agents.map((agent) => ({
      value: agent.id,
      id: agent.id,
      label: agent.name,
      meta: { role: agent.role },
    })),
  };
}
