# Workflow UI

| Component | Purpose |
|-----------|---------|
| `WorkflowFlowEditor.tsx` | Kreo **FlowEditor** wrapper — palette flotante, inspector derecho, undo/redo, preset `auto-company` |
| `WorkflowCanvas.tsx` | Legacy React Flow (deprecado — sustituido por FlowEditor) |

## FlowEditor integration

- Preset: `frontend/src/presets/auto-company.ts`
- Adaptador legacy steps ↔ grafo: `frontend/src/lib/workflow-flow-adapter.ts`
- Contrato I/O por paso: `frontend/src/lib/flowStepIO.ts` + panel `FlowStepIOPanel.tsx`
- Kreo organisms: `frontend/src/components/organisms/Flow*.tsx`, `flowEditor*.ts`

### Memoria compartida (I/O)

Los agentes **no** pasan datos por las flechas del grafo. Cada paso lee y escribe en `sharedMemory`:

| Dirección | Qué es |
|-----------|--------|
| **Entrada** | `task`, consensus, salidas de pasos anteriores (`{{agentId}}`), instrucciones del paso |
| **Salida** | Respuesta LLM en `sharedMemory[memoryKey]`, más `lastOutput` y `_history[]` |

El inspector derecho muestra **Entrada / Salida** al seleccionar un nodo `run_agent`, con los pasos previos del grafo listados como fuentes de memoria.

Used in:

- `/admin/templates/workflows/:id` (`PlatformWorkflowEditorPage`)
- `/settings/procedures/...` workflow editor (`WorkflowEditorPage`)
