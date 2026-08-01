# Office components

| Component | Role |
|-----------|------|
| `CoordinatorChat` | Chat streaming (TanStack AI SSE) + HITL plan approval + execute encargos; legacy REST via `frontend/src/lib/office-chat-config.ts` |
| `OfficeFloorPlan` | Virtual office floor — departments, reception, busy/idle (letter theme: white cards on pale gradient) |
| `DepartmentRoomView` | Shared department room — scope select (general/product), meeting table, **coordinator chat**, **department procedures**, extras slot |
| `DepartmentProceduresPanel` | Lists workflows as **procedimientos** for a virtual or custom department; **Usar** pre-fills the coordinator |
| `DepartmentWarRoomPanel` | Live department war room — SSE, handoffs, procedure context, run selector |
| `EncargoDeliveryPanel` | Client delivery links on encargo detail (create/copy/revoke read-only `/d/:token` shares) |
| `SpecialistProfileModal` | Specialist card — assign, template config, recent encargos, **documents** (archive) |
| `TeamProposalCard` | Plan UI with missing-role deep links |
| `OfficeOnboardingPanel` | Post-login checklist (Plantilla de especialistas → Org Studio → primer encargo) |

Pages: `OfficeArchivePage` at `/office/archive` — unified document hub.

Department rooms (`/office/departments/:slug`, `/org-units/:id`) show **Procedimientos del departamento** — workflows grouped by specialist roster, with one-click launch into the coordinator.

Configuration (admin): `/settings/procedures` (grouped catalog), `/settings/specialists` (agent/skill templates). Legacy `/office/workflows` and `/ai-team` redirect or remain as aliases.

API: `GET /office/departments/:slug/procedures`, `GET /org-units/:id/procedures`, `GET /office/procedures`, `GET /office/departments/:slug/team`, `GET /org-units/:id/team`.

Run→department association is centralized in `src/lib/office-run-department.ts` (`teamAgents` at launch + workflow steps + `_history`).

Onboarding dismisses via `localStorage` key `ac.office-onboarding-v1`.
