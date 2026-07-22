# Ops UI components

Components used by [`OpsPage.tsx`](../pages/OpsPage.tsx) — the autonomous company control panel.

## `OpsFlowStepper.tsx`

Horizontal stepper showing the four company phases:

1. **Discover** — `opportunity-discovery` workflow fills the idea pipeline
2. **Evaluate** — human approves an idea → `new-product-evaluation` workflow
3. **Build** — on agent GO, code lands in `projects/{slug}/` via `feature-development`
4. **Grow** — launch and pricing workflows

Highlights the current phase from `companyPhase` in `/ops/portfolio`.

## `OpsSchedulesPanel.tsx`

Lists all `AutonomousSchedule` records for the tenant:

- **Meta** — dynamic orchestrator (pause / change interval / run now)
- **Workflow** — fixed workflow on interval (pause / change interval / run now / cancel)

Uses `PUT /schedules/:id`, `DELETE /schedules/:id`, `POST /schedules/:id/run-now`.

## Related API actions (Ops page)

| UI action | API | Effect |
|-----------|-----|--------|
| Evaluar con agentes | `POST /products/pipeline/:id/evaluate` | Marks GO + starts evaluation workflow |
| NO-GO | `PUT /products/pipeline/:id` | Discards idea |
| Enfocar | `POST /products/:id/focus` | Sets meta-cycle focus product |
| Ejecutar ciclo meta | `POST /schedules/:id/run-now` | Orchestrator picks next workflow |
