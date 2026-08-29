import type { Edge, Node } from "@xyflow/react";
import type { FlowTriggerVariable } from "@/components/organisms/flowEditorTypes";
import { isFlowTriggerNode } from "@/components/organisms/flowEditorUtils";

export interface FlowStepIOItem {
  key: string;
  label: string;
  detail?: string;
  example?: string;
}

export interface FlowStepIOSummary {
  inputs: FlowStepIOItem[];
  outputs: FlowStepIOItem[];
}

function resolveOutputKey(params: Record<string, unknown>): string {
  const agentId = String(params.agentId ?? "agente").trim();
  const memoryKey = String(params.memoryKey ?? "").trim();
  return memoryKey || agentId || "agente";
}

/** Agent nodes executed before the given node (in run order). */
export function getUpstreamAgentNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const upstream: Node[] = [];
  let currentId: string | null = nodeId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const inEdge = edges.find((e) => e.target === currentId);
    if (!inEdge) break;

    const sourceNode = nodes.find((n) => n.id === inEdge.source);
    if (!sourceNode) break;

    const data = sourceNode.data as Record<string, unknown>;
    if (data.action === "run_agent") {
      upstream.unshift(sourceNode);
    }

    if (isFlowTriggerNode(sourceNode)) break;
    currentId = sourceNode.id;
  }

  return upstream;
}

export function buildRunAgentIOSummary(
  params: Record<string, unknown>,
  upstreamNodes: Node[],
  triggerVariables: FlowTriggerVariable[] = [],
): FlowStepIOSummary {
  const passSharedMemory = params.passSharedMemory !== false;
  const appendToSharedMemory = params.appendToSharedMemory !== false;
  const outputKey = resolveOutputKey(params);
  const customPrompt = String(params.customPrompt ?? "").trim();

  const inputs: FlowStepIOItem[] = [];

  inputs.push({
    key: "user-prompt",
    label: "Prompt de usuario",
    detail: "task / nextAction del run (JSON si hay contextKeys)",
    example: "{{task}}",
  });

  for (const variable of triggerVariables) {
    inputs.push({
      key: variable.path,
      label: variable.label,
      detail: variable.description ?? "Contexto inicial del run",
      example: `{{${variable.path}}}`,
    });
  }

  if (passSharedMemory) {
    inputs.push({
      key: "shared-memory",
      label: "Memoria compartida",
      detail: "Consensus, lastOutput y salidas de pasos anteriores (últimos 5 en el system prompt)",
    });

    for (const upstream of upstreamNodes) {
      const upParams = (upstream.data as Record<string, unknown>).params as Record<string, unknown> | undefined;
      const upAgentId = String(upParams?.agentId ?? upstream.data.label ?? upstream.id);
      const upKey = resolveOutputKey(upParams ?? {});
      inputs.push({
        key: upKey,
        label: String((upstream.data as Record<string, unknown>).label ?? upAgentId),
        detail: `Salida del paso anterior`,
        example: `{{${upKey}}}`,
      });
    }
  } else {
    inputs.push({
      key: "no-shared-memory",
      label: "Sin memoria previa",
      detail: "passSharedMemory desactivado — solo ve task/nextAction",
    });
  }

  if (customPrompt) {
    inputs.push({
      key: "customPrompt",
      label: "Instrucciones del paso",
      detail: "Añadidas al system prompt como ## Step Instructions",
    });
  }

  inputs.push({
    key: "agent-definition",
    label: "Definición del agente",
    detail: "System prompt, skills y herramientas del rol seleccionado",
  });

  const outputs: FlowStepIOItem[] = [];

  if (appendToSharedMemory) {
    outputs.push({
      key: outputKey,
      label: `sharedMemory.${outputKey}`,
      detail: "Texto completo de la respuesta LLM",
      example: `{{${outputKey}}}`,
    });
  }

  outputs.push({
    key: "lastOutput",
    label: "lastOutput / lastAgent",
    detail: "Siempre actualizados; visibles para el siguiente paso",
  });

  outputs.push({
    key: "_history",
    label: "_history[]",
    detail: "Log append-only de cada paso (outputPreview en runs)",
  });

  if (!appendToSharedMemory) {
    outputs.push({
      key: "no-persist",
      label: "No persiste clave nombrada",
      detail: "appendToSharedMemory desactivado — solo _history y lastOutput",
    });
  }

  return { inputs, outputs };
}

/** Compact lines for node chrome on the canvas. */
export function summarizeRunAgentNodeIO(params: Record<string, unknown> | undefined): string[] {
  if (!params) return [];
  const outputKey = resolveOutputKey(params);
  const passSharedMemory = params.passSharedMemory !== false;
  const appendToSharedMemory = params.appendToSharedMemory !== false;

  const lines: string[] = [];
  lines.push(passSharedMemory ? "↑ task + memoria previa" : "↑ solo task");
  lines.push(appendToSharedMemory ? `↓ → ${outputKey}` : "↓ sin clave en memoria");
  return lines;
}
