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
        group: "general",
      },
      { key: "label", label: "Etiqueta del paso", type: "text", group: "general" },
      {
        key: "passSharedMemory",
        label: "Incluir memoria compartida",
        type: "boolean",
        defaultValue: true,
        group: "input",
        helpText: "Si está activo, el agente ve task, consensus y salidas de pasos anteriores.",
      },
      {
        key: "customPrompt",
        label: "Instrucciones adicionales",
        type: "textarea",
        group: "input",
        placeholder: "Contexto extra para este paso (## Step Instructions)",
      },
      {
        key: "memoryKey",
        label: "Clave de salida en memoria",
        type: "text",
        group: "output",
        placeholder: "Vacío = usa agentId (ej. research-thompson)",
        helpText: "Nombre con el que se guarda la respuesta: sharedMemory[clave]",
      },
      {
        key: "appendToSharedMemory",
        label: "Guardar respuesta en memoria",
        type: "boolean",
        defaultValue: true,
        group: "output",
        helpText: "Si está activo, la respuesta LLM queda en sharedMemory[clave] para el siguiente paso.",
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
    stepIOHint:
      "Los pasos no pasan datos por las flechas: comparten memoria (sharedMemory). Cada agente lee lo anterior y escribe su salida para el siguiente.",
    stepInputsTitle: "Entrada — qué recibe este agente",
    stepInputsHint: "Se compone en system + user prompt al ejecutar",
    stepOutputsTitle: "Salida — qué deja para el siguiente",
    stepOutputsHint: "El siguiente paso con memoria activa lee estas claves",
    configGroupGeneral: "Agente",
    configGroupInput: "Ajustar entrada",
    configGroupOutput: "Ajustar salida",
  },
};
