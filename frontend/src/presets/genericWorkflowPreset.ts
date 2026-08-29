import type {
  FlowConnectionRules,
  FlowEditorPreset,
  FlowI18n,
  ResolvedFlowEditorConfig,
} from "@/components/organisms/flowEditorTypes";

const DEFAULT_I18N: FlowI18n = {
  searchPlaceholder: "Buscar nodos…",
  paletteHint: "Clic o arrastra al canvas",
  emptyPalette: "Ningún nodo coincide",
  expandPalette: "Expandir palette",
  collapsePalette: "Colapsar palette",
  executeWorkflow: "Ejecutar flujo",
  executingWorkflow: "Ejecutando…",
  traceTitle: "TRAZA",
  traceSkipped: "omitido",
  traceBranch: "rama",
  handleTrue: "Si",
  handleFalse: "No",
};

const DEFAULT_CONNECTION_RULES: FlowConnectionRules = [
  { from: "trigger", to: ["action", "condition", "wait"] },
  { from: "action", to: ["action", "condition", "wait"] },
  { from: "condition", to: ["action", "wait"], handles: ["true", "false"] },
  { from: "wait", to: ["action", "condition"] },
];

export const GENERIC_FLOW_PRESET: FlowEditorPreset = {
  id: "generic",
  defaultTriggerAction: "on_manual_run",
  palette: [
    {
      type: "logic",
      title: "Lógica y control",
      items: [
        {
          label: "Condición",
          description: "Bifurcación Si/No",
          semanticType: "condition",
          action: "condition",
        },
        {
          label: "Espera",
          description: "Pausa temporal",
          semanticType: "wait",
          action: "wait",
        },
      ],
    },
  ],
  triggerVariables: {
    on_manual_run: [
      { path: "task", label: "Tarea", description: "Texto del encargo o next action" },
      { path: "consensus.content", label: "Consensus", description: "Memoria compartida del tenant" },
    ],
  },
  actionConfigFields: {
    condition: [
      { key: "field", label: "Campo", type: "text", defaultValue: "response.confidence" },
      { key: "operator", label: "Operador", type: "select", defaultValue: "gte", options: [
        { label: ">=", value: "gte" },
        { label: "<=", value: "lte" },
        { label: "==", value: "eq" },
      ] },
      { key: "value", label: "Valor", type: "text", defaultValue: "0.7" },
    ],
    wait: [{ key: "delaySec", label: "Segundos", type: "number", defaultValue: 60 }],
  },
  connectionRules: DEFAULT_CONNECTION_RULES,
  i18n: DEFAULT_I18N,
};

export function resolveFlowEditorConfig(
  preset?: FlowEditorPreset,
  overrides?: Partial<FlowEditorPreset>,
): ResolvedFlowEditorConfig {
  const merged: FlowEditorPreset = {
    ...GENERIC_FLOW_PRESET,
    ...preset,
    ...overrides,
    palette: overrides?.palette ?? preset?.palette ?? GENERIC_FLOW_PRESET.palette ?? [],
    triggerVariables: {
      ...GENERIC_FLOW_PRESET.triggerVariables,
      ...preset?.triggerVariables,
      ...overrides?.triggerVariables,
    },
    actionConfigFields: {
      ...GENERIC_FLOW_PRESET.actionConfigFields,
      ...preset?.actionConfigFields,
      ...overrides?.actionConfigFields,
    },
    connectionRules:
      overrides?.connectionRules ?? preset?.connectionRules ?? GENERIC_FLOW_PRESET.connectionRules ?? [],
    validators: overrides?.validators ?? preset?.validators,
    i18n: { ...DEFAULT_I18N, ...GENERIC_FLOW_PRESET.i18n, ...preset?.i18n, ...overrides?.i18n },
    nodeTypes: { ...preset?.nodeTypes, ...overrides?.nodeTypes },
    actionIcons: { ...preset?.actionIcons, ...overrides?.actionIcons },
    defaultTriggerAction:
      overrides?.defaultTriggerAction ??
      preset?.defaultTriggerAction ??
      GENERIC_FLOW_PRESET.defaultTriggerAction ??
      "on_manual_run",
  };

  return {
    palette: merged.palette ?? [],
    triggerVariables: merged.triggerVariables ?? {},
    actionConfigFields: merged.actionConfigFields ?? {},
    connectionRules: merged.connectionRules ?? DEFAULT_CONNECTION_RULES,
    validators: merged.validators ?? [],
    i18n: merged.i18n ?? DEFAULT_I18N,
    nodeTypes: merged.nodeTypes ?? {},
    actionIcons: merged.actionIcons ?? {},
    defaultTriggerAction: merged.defaultTriggerAction ?? "on_manual_run",
  };
}
