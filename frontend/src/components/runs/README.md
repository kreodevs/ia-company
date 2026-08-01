# Run UI components

## `RunScopeBadge`

Shows whether a run is **company-level** (discovery, weekly review) vs **product** or **department** operation.

Data sources (in order):

1. API fields `scopeLevel` + `scopeLabelKey` on encargos
2. `_scopeContract` in run `sharedMemory`
3. Workflow name fallback for company-scoped templates (`opportunity-discovery`, etc.)

Used on `/runs`, `/runs/:id`, and `/office/encargos/:runId`.

i18n: `runs.scope.*`
