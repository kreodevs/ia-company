# Workflow components

## `WorkflowAiStudioModal`

Modal launched from **Flujos** → **Crear con IA**. Body scrolls inside the shared `Dialog` (max 90vh) when the proposal is long (steps, gaps, Munger veto).

- `POST /catalog-studio/workflows/propose` — design or ask clarifying questions
- `POST /catalog-studio/workflows/apply` — create approved agents/skills + workflow graph

After apply, navigates to `/office/workflows/:id`.
