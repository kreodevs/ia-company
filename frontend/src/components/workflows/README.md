# Workflow UI

| Component | Purpose |
|-----------|---------|
| `WorkflowFlowEditor.tsx` | Kreo **FlowEditor** wrapper — palette flotante, inspector derecho, undo/redo, preset `auto-company` |
| `WorkflowCanvas.tsx` | Legacy React Flow (deprecado — sustituido por FlowEditor) |

## FlowEditor integration

- Preset: `frontend/src/presets/auto-company.ts`
- Adaptador legacy steps ↔ grafo: `frontend/src/lib/workflow-flow-adapter.ts`
- Kreo organisms: `frontend/src/components/organisms/Flow*.tsx`, `flowEditor*.ts`

Used in:

- `/admin/templates/workflows/:id` (`PlatformWorkflowEditorPage`)
- `/settings/procedures/...` workflow editor (`WorkflowEditorPage`)
