# Office components

| Component | Role |
|-----------|------|
| `CoordinatorChat` | Chat streaming (TanStack AI SSE) + HITL plan approval + execute encargos; legacy REST via `frontend/src/lib/office-chat-config.ts` |
| `OfficeFloorPlan` | Virtual office floor — departments, reception, busy/idle (letter theme: white cards on pale gradient) |
| `DepartmentRoomView` | Shared department room — scope select (general/product), meeting table, **coordinator chat**, extras slot |
| `TeamProposalCard` | Plan UI with missing-role deep links |
| `OfficeOnboardingPanel` | Post-login checklist (Equipo IA → Org Studio → primer encargo) |

Pages: `OfficeArchivePage` at `/office/archive` — unified document hub.

Onboarding dismisses via `localStorage` key `ac.office-onboarding-v1`.
