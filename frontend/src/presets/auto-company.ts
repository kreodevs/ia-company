import type { FlowEditorPreset } from "@/components/organisms/flowEditorTypes";
import { GENERIC_FLOW_PRESET } from "./genericWorkflowPreset";

export const AUTO_COMPANY_FLOW_PRESET: FlowEditorPreset = {
  ...GENERIC_FLOW_PRESET,
  id: "auto-company",
  defaultTriggerAction: "on_manual_run",
  palette: [
    {
      type: "agents",
      title: "Agentes",
      items: [
        {
          label: "Ejecutar agente",
          description: "Paso LLM con memoria compartida",
          semanticType: "action",
          action: "run_agent",
          icon: "action",
        },
        {
          label: "Gate Munger",
          description: "Evalúa veto en memoria compartida",
          semanticType: "condition",
          action: "munger_gate",
        },
        {
          label: "Espera humana",
          description: "Pausa AWAITING_USER",
          semanticType: "wait",
          action: "human_wait",
        },
        {
          label: "Sync consensus",
          description: "Cargar o sincronizar memoria compartida",
          semanticType: "action",
          action: "merge_consensus",
        },
        {
          label: "Anotación",
          description: "Nodo informativo (no ejecuta)",
          semanticType: "action",
          action: "noop",
        },
      ],
    },
    ...(GENERIC_FLOW_PRESET.palette ?? []),
  ],
  triggerVariables: {
    on_manual_run: [
      { path: "task", label: "Tarea", description: "Objetivo del run / next action" },
      { path: "consensus.content", label: "Consensus", description: "Memoria compartida del tenant" },
      { path: "product.slug", label: "Producto", description: "Slug del producto activo" },
    ],
    on_schedule_tick: [
      { path: "schedule.name", label: "Programación", description: "Nombre de la regla programada" },
    ],
    on_encargo_approved: [
      { path: "encargo.title", label: "Encargo", description: "Título del encargo aprobado" },
    ],
  },
  actionConfigFields: {
    ...GENERIC_FLOW_PRESET.actionConfigFields,
    run_agent: [
      {
        key: "agentId",
        label: "Agente",
        type: "datasource",
        dataSourceKey: "agents",
        dataSourceLabel: "Agente",
        required: true,
      },
      { key: "label", label: "Etiqueta del paso", type: "text" },
      {
        key: "passSharedMemory",
        label: "Pasar memoria compartida",
        type: "boolean",
        defaultValue: true,
      },
      { key: "customPrompt", label: "Prompt adicional", type: "textarea" },
      { key: "memoryKey", label: "Clave de salida", type: "text" },
      {
        key: "appendToSharedMemory",
        label: "Añadir a memoria compartida",
        type: "boolean",
        defaultValue: true,
      },
    ],
    munger_gate: [
      { key: "field", label: "Campo veto", type: "text", defaultValue: "consensus.veto" },
    ],
    human_wait: [
      { key: "reason", label: "Motivo", type: "text", defaultValue: "Revisión humana requerida" },
      { key: "resumeKey", label: "Clave resume", type: "text" },
    ],
    merge_consensus: [
      { key: "merge", label: "Merge", type: "boolean", defaultValue: true },
      { key: "sync", label: "Sync", type: "boolean", defaultValue: true },
    ],
    noop: [{ key: "note", label: "Nota", type: "textarea" }],
  },
  i18n: {
    ...GENERIC_FLOW_PRESET.i18n,
    searchPlaceholder: "Buscar nodos…",
    paletteHint: "Clic o arrastra al canvas",
    executeWorkflow: "Ejecutar flujo",
  },
};
