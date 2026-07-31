# Workflow components

## `WorkflowAiStudioModal`

Modal launched from **Flujos** → **Crear con IA**. Body scrolls inside the shared `Dialog` (max 90vh) when the proposal is long (steps, gaps, Munger veto).

Munger pre-mortem receives **newAgents**, **newSkills**, and **gaps** — it must not veto for capabilities the proposal already plans to create. If gaps are fully covered by planned catalog additions, a mistaken veto is auto-cleared.

- `POST /catalog-studio/workflows/propose` — design or ask clarifying questions
- `POST /catalog-studio/workflows/apply` — create approved agents/skills + workflow graph

After apply, navigates to `/office/workflows/:id`.
