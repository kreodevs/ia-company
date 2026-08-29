import type { Edge, Node } from "@xyflow/react";
import type {
  FlowConnectionRules,
  FlowGraphValidationResult,
  FlowGraphValidator,
  FlowGraphValidatorContext,
  FlowI18n,
  FlowValidationIssue,
} from "./flowEditorTypes";
import { isFlowTriggerNode } from "./flowEditorUtils";

function singleTriggerValidator(ctx: FlowGraphValidatorContext): FlowValidationIssue | null {
  const triggers = ctx.nodes.filter((n) => isFlowTriggerNode(n));
  if (triggers.length === 1) return null;
  return {
    code: "single_trigger",
    severity: "error",
    message: "El flujo debe tener exactamente un disparador.",
  };
}

function connectedGraphValidator(ctx: FlowGraphValidatorContext): FlowValidationIssue | null {
  const trigger = ctx.nodes.find((n) => isFlowTriggerNode(n));
  if (!trigger) return null;
  const reachable = new Set<string>([trigger.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of ctx.edges) {
      if (reachable.has(edge.source) && !reachable.has(edge.target)) {
        reachable.add(edge.target);
        changed = true;
      }
    }
  }
  const orphan = ctx.nodes.find((n) => !reachable.has(n.id) && !isFlowTriggerNode(n));
  if (!orphan) return null;
  return {
    code: "disconnected",
    severity: "warning",
    nodeId: orphan.id,
    message: `El nodo "${(orphan.data as Record<string, unknown>).label ?? orphan.id}" no está conectado al disparador.`,
  };
}

function runAgentRequiresAgentValidator(ctx: FlowGraphValidatorContext): FlowValidationIssue | null {
  for (const node of ctx.nodes) {
    const data = node.data as Record<string, unknown>;
    if (data.action !== "run_agent") continue;
    const params = (data.params as Record<string, unknown>) ?? {};
    if (params.agentId) continue;
    return {
      code: "missing_agent",
      severity: "error",
      nodeId: node.id,
      message: `El paso "${data.label ?? node.id}" requiere un agente.`,
    };
  }
  return null;
}

const DEFAULT_VALIDATORS: FlowGraphValidator[] = [
  singleTriggerValidator,
  connectedGraphValidator,
  runAgentRequiresAgentValidator,
];

export function validateFlowGraph(
  nodes: Node[],
  edges: Edge[],
  validators: FlowGraphValidator[] = DEFAULT_VALIDATORS,
  _connectionRules?: FlowConnectionRules,
  i18n?: FlowI18n,
): FlowGraphValidationResult {
  const ctx: FlowGraphValidatorContext = { nodes, edges, i18n: i18n ?? {} };
  const issues: FlowValidationIssue[] = [];
  for (const validator of validators) {
    const issue = validator(ctx);
    if (issue) issues.push(issue);
  }
  return { valid: issues.every((i) => i.severity !== "error"), issues };
}

export function runFlowValidation(
  nodes: Node[],
  edges: Edge[],
  validators?: FlowGraphValidator[],
  connectionRules?: FlowConnectionRules,
  i18n?: FlowI18n,
): FlowGraphValidationResult {
  return validateFlowGraph(nodes, edges, validators ?? DEFAULT_VALIDATORS, connectionRules, i18n);
}
