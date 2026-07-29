# Office components

| Component | Role |
|-----------|------|
| `CoordinatorChat` | Chat + plan + execute encargos |
| `OfficeFloorPlan` | Virtual office floor — departments, reception, busy/idle |
| `DepartmentRoomView` | Shared department room — scope select (general/product), meeting table, **coordinator chat**, extras slot |
| `TeamProposalCard` | Plan UI with missing-role deep links |
| `OfficeOnboardingPanel` | Post-login checklist (Equipo IA → Org Studio → primer encargo) |

Pages: `OfficeArchivePage` at `/office/archive` — unified document hub.

Onboarding dismisses via `localStorage` key `ac.office-onboarding-v1`.
