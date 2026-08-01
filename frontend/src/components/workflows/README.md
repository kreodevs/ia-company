# Workflow components

## `WorkflowAiStudioModal`

Modal launched from **Flujos** → **Crear con IA**. Body scrolls inside the shared `Dialog` (max 90vh) when the proposal is long (steps, gaps, Munger veto).

Munger pre-mortem receives **newAgents**, **newSkills**, and **gaps** — it must not veto for capabilities the proposal already plans to create. If gaps are fully covered by planned catalog additions, a mistaken veto is auto-cleared.

- `POST /catalog-studio/workflows/propose` — design or ask clarifying questions
- `POST /catalog-studio/workflows/apply` — create approved agents/skills + workflow graph

After apply, navigates to `/office/workflows/:id`.

## `WorkflowAiEnrichModal`

Launched from the workflow editor (**Enriquecer con IA**). Updates an **existing** graph in place.

- `POST /catalog-studio/workflows/enrich/propose` — brief + current graph → proposal + **impact report**
- `GET /catalog-studio/workflows/:workflowId/impact` — references (schedules, org units, coordinator services, presets) and risk messages
- `POST /catalog-studio/workflows/enrich/apply` — persist enrichment; optional `allowRename` when the slug changes

Impact panel clarifies: **other flows are not deleted**, but anything referencing this procedure will run the enriched version.

## `WorkflowImpactPanel`

Renders references and severity-coded risks from `WorkflowImpactReport`.
