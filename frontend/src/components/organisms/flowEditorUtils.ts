import type { Connection, Edge, Node } from "@xyflow/react";
import type {
  FlowConfigField,
  FlowConnectionRules,
  FlowGraphPayload,
  FlowI18n,
  FlowNodeExecutePayload,
  FlowPaletteGroup,
  FlowPaletteItem,
  FlowSemanticType,
} from "./flowEditorTypes";

export function flattenPalette(groups: FlowPaletteGroup[]): FlowPaletteItem[] {
  return groups.flatMap((group) => group.items);
}

export function isFlowTriggerNode(node: Node): boolean {
  const data = node.data as Record<string, unknown>;
  return node.id === "trigger" || node.type === "trigger" || data.semanticType === "trigger";
}

export function isFlowNodeDispatchable(node: Node): boolean {
  const data = node.data as Record<string, unknown>;
  if (isFlowTriggerNode(node)) return false;
  return data.dispatchable !== false;
}

export function getFlowConfigFields(
  actionConfigFields: Record<string, FlowConfigField[]> | undefined,
  semanticType: FlowSemanticType | undefined,
  action: string | undefined,
): FlowConfigField[] {
  if (!actionConfigFields) return [];
  if (action && actionConfigFields[action]) return actionConfigFields[action];
  if (semanticType && actionConfigFields[semanticType]) return actionConfigFields[semanticType];
  return [];
}

export function buildDefaultParams(fields: FlowConfigField[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      params[field.key] = field.defaultValue;
    } else if (field.type === "boolean") {
      params[field.key] = false;
    } else {
      params[field.key] = "";
    }
  }
  return params;
}

export function summarizeNodeParams(
  params: Record<string, unknown> | undefined,
  max = 2,
): string[] {
  if (!params) return [];
  return Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .slice(0, max)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 40)}`);
}

export function getConditionEdgeLabel(
  sourceHandle: string | null | undefined,
  i18n?: FlowI18n,
): string | undefined {
  if (sourceHandle === "true") return i18n?.handleTrue ?? "Si";
  if (sourceHandle === "false") return i18n?.handleFalse ?? "No";
  return undefined;
}

export function isValidFlowConnection(
  connection: Connection,
  nodes: Node[],
  rules: FlowConnectionRules,
): boolean {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return false;

  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  const sourceType = (sourceNode.data as Record<string, unknown>).semanticType as FlowSemanticType;
  const targetType = (targetNode.data as Record<string, unknown>).semanticType as FlowSemanticType;

  if (isFlowTriggerNode(sourceNode) && isFlowTriggerNode(targetNode)) return false;

  if (rules.length === 0) return true;

  return rules.some((rule) => {
    const fromList = Array.isArray(rule.from) ? rule.from : [rule.from];
    const toList = Array.isArray(rule.to) ? rule.to : [rule.to];
    if (!fromList.includes(sourceType) || !toList.includes(targetType)) return false;
    if (rule.handles?.length && connection.sourceHandle) {
      return rule.handles.includes(connection.sourceHandle);
    }
    return true;
  });
}

export function normalizeFlowNodes(
  initialNodes: Node[] | undefined,
  options: {
    triggerType?: string;
    palette: FlowPaletteItem[];
    triggerVariables: Record<string, import("./flowEditorTypes").FlowTriggerVariable[]>;
  },
): Node[] {
  const nodes = (initialNodes ?? []).map((node) => ({
    ...node,
    type: (node.type ?? (node.data as Record<string, unknown>).semanticType ?? "action") as string,
    data: {
      label: (node.data as Record<string, unknown>).label ?? "Node",
      semanticType:
        ((node.data as Record<string, unknown>).semanticType as FlowSemanticType) ??
        (node.type as FlowSemanticType) ??
        "action",
      ...node.data,
    },
  }));

  const hasTrigger = nodes.some((node) => isFlowTriggerNode(node));
  if (hasTrigger) return nodes;

  const triggerAction = options.triggerType ?? "on_manual_run";
  const triggerItem =
    options.palette.find((item) => item.semanticType === "trigger" && item.action === triggerAction) ??
    options.palette.find((item) => item.semanticType === "trigger");

  return [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 250, y: 40 },
      deletable: false,
      data: {
        label: triggerItem?.label ?? "Manual run",
        semanticType: "trigger" as FlowSemanticType,
        action: triggerAction,
        description: triggerItem?.description,
        dispatchable: false,
        triggerVariables: options.triggerVariables[triggerAction] ?? [],
        params: {},
      },
    },
    ...nodes,
  ];
}

export function duplicateFlowNode(node: Node): Node {
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    ...node,
    id,
    position: { x: node.position.x + 40, y: node.position.y + 40 },
    selected: false,
    data: { ...(node.data as Record<string, unknown>) },
  };
}

export function buildFlowNodeExecutePayload(node: Node, _nodes: Node[]): FlowNodeExecutePayload {
  const data = node.data as Record<string, unknown>;
  return {
    nodeId: node.id,
    semanticType: (data.semanticType as FlowSemanticType) ?? "action",
    action: data.action as string | undefined,
    params: (data.params as Record<string, unknown>) ?? {},
    label: String(data.label ?? node.id),
  };
}

export function toFlowGraphPayload(
  nodes: Node[],
  edges: Edge[],
  triggerType?: string,
): FlowGraphPayload {
  return { nodes, edges, triggerType };
}

export function autoLayoutFlowGraph(nodes: Node[], edges: Edge[]): Node[] {
  const incoming = new Map<string, number>();
  for (const node of nodes) incoming.set(node.id, 0);
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  const roots = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  const ordered: Node[] = [];
  const visited = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    ordered.push(node);
    for (const edge of edges.filter((e) => e.source === node.id)) {
      queue.push(nodes.find((n) => n.id === edge.target)!);
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) ordered.push(node);
  }

  return ordered.map((node, index) => ({
    ...node,
    position: { x: 250, y: 40 + index * 140 },
  }));
}

function nextNodeId(
  workflowEdges: Edge[],
  currentId: string,
  handle?: string | null,
): string | null {
  const edge = workflowEdges.find(
    (e) => e.source === currentId && (handle ? e.sourceHandle === handle : true),
  );
  return edge?.target ?? null;
}

export async function walkFlowExecution(
  nodes: Node[],
  edges: Edge[],
  executeNode?: (payload: FlowNodeExecutePayload) => Promise<{ success?: boolean; message?: string } | void>,
  options?: { i18n?: FlowI18n },
): Promise<import("./flowEditorTypes").FlowExecutionStep[]> {
  const steps: import("./flowEditorTypes").FlowExecutionStep[] = [];
  const trigger = nodes.find((n) => isFlowTriggerNode(n));
  if (!trigger) return steps;

  let nodeId: string | null = trigger.id;
  const visited = new Set<string>();

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) break;

    const data = node.data as Record<string, unknown>;
    const semanticType = (data.semanticType as FlowSemanticType) ?? "action";
    const step: import("./flowEditorTypes").FlowExecutionStep = {
      nodeId: node.id,
      label: String(data.label ?? node.id),
      semanticType,
      status: "running",
      timestamp: Date.now(),
    };
    steps.push(step);

    if (!isFlowTriggerNode(node) && executeNode && isFlowNodeDispatchable(node)) {
      try {
        const result = await executeNode(buildFlowNodeExecutePayload(node, nodes));
        step.status = result?.success === false ? "error" : "success";
        step.message = result?.message;
      } catch (error) {
        step.status = "error";
        step.message = error instanceof Error ? error.message : "Error";
      }
    } else {
      step.status = "success";
    }

    if (semanticType === "condition") {
      const branch: "true" | "false" = "true";
      step.branch = branch;
      step.branchLabel = getConditionEdgeLabel(branch, options?.i18n);
      nodeId = nextNodeId(edges, node.id, branch);
      continue;
    }

    nodeId = nextNodeId(edges, node.id);
  }

  return steps;
}
