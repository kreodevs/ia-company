# Workflow components

## `WorkflowAiStudioModal`

Modal launched from **Flujos** → **Crear con IA**. Uses Catalog Studio LLM endpoints:

- `POST /catalog-studio/workflows/propose` — design or ask clarifying questions
- `POST /catalog-studio/workflows/apply` — create approved agents/skills + workflow graph

After apply, navigates to `/office/workflows/:id`.
