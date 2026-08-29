import type { FlowNodeTypePreset, FlowSemanticType } from "./flowEditorTypes";

const DEFAULT_PRESETS: Record<FlowSemanticType, FlowNodeTypePreset> = {
  trigger: {
    variant: "primary",
    showTargetHandle: false,
    showSourceHandle: true,
    executeLabel: "Trigger",
  },
  action: {
    variant: "success",
    showTargetHandle: true,
    showSourceHandle: true,
    executeLabel: "Test",
  },
  condition: {
    variant: "warning",
    showTargetHandle: true,
    sourceHandles: [
      { id: "true", label: "Si", position: 35, color: "var(--success)" },
      { id: "false", label: "No", position: 65, color: "var(--destructive)" },
    ],
    footerLabels: ["Si", "No"],
    executeLabel: "Eval",
  },
  wait: {
    variant: "info",
    dashed: true,
    showTargetHandle: true,
    showSourceHandle: true,
    executeLabel: "Wait",
  },
  parallel: { variant: "accent", showTargetHandle: true, showSourceHandle: true },
  merge: { variant: "muted", showTargetHandle: true, showSourceHandle: true },
  loop: { variant: "info", showTargetHandle: true, showSourceHandle: true },
  webhook: { variant: "accent", showTargetHandle: true, showSourceHandle: true },
  subflow: { variant: "muted", showTargetHandle: true, showSourceHandle: true },
};

export function getNodeTypePreset(
  overrides: Partial<Record<FlowSemanticType, FlowNodeTypePreset>>,
  semanticType: FlowSemanticType,
): FlowNodeTypePreset {
  return { ...DEFAULT_PRESETS[semanticType], ...overrides[semanticType] };
}
