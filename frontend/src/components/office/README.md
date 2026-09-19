# Office components

| Component | Role |
|-----------|------|
| `OfficeEncargoLivePanel` | Embeddable live war-room table for an encargo (trabajo hub + detail) |
| `CoordinatorChat` | Chat streaming; `executeRedirect` auto → war room (product) or `/office/trabajo` (general); thread memory in localStorage |
| `OfficeFloorPlan` | Virtual office floor — departments, reception, busy/idle (letter theme: white cards on pale gradient) |
| `OfficeScopeBar` | Product + org-unit scope selectors on the home office (`/office`) |
| `OfficePulseDrawer` | Collapsible KPI strip (Kreo `DashboardKPI`) — metrics hidden by default on home |
| `OfficeRecentArchive` | Last 5 documents from `/office/archive` (Kreo `Card`) |
| `OfficeReceptionOverlay` | Full-screen reception mode for coordinator chat |
| `DepartmentRoomView` | Shared department room — scope select (general/product), meeting table, **coordinator chat**, **department procedures**, extras slot |
| `DepartmentProceduresPanel` | Manual **procedimientos** (workflows) + **procedimientos programados** (AutonomousSchedule rules) for a virtual or custom department; **Usar** pre-fills the coordinator |
| `DepartmentWarRoomPanel` | Live department war room — SSE, handoffs, procedure context, run selector |
| `EncargoDeliveryPanel` | Client delivery links on encargo detail (create/copy/revoke/read-only `/d/:token` shares) |
| `DeliveryPreviewModal` | Preview delivery as the client will see it before sharing |
| `SpecialistProfileModal` | Specialist card — assign, template config, recent encargos, **documents** (archive) |
| `TeamProposalCard` | Plan UI with human role labels (`agentDisplayLabel`) and missing-role deep links |
| `OfficeOnboardingPanel` | Post-login checklist (Plantilla de especialistas → Org Studio → primer encargo) |

## Home layout (Oleada 1)

`/office` order: **floor plan → reception/chat lobby → archive sidebar → collapsed pulse metrics → services/ROI**.

- Reception card opens `OfficeReceptionOverlay` or scrolls to inline chat.
- Debug sidebar links require **Modo avanzado** in Settings → General (`frontend/src/lib/advanced-mode.ts`).

Pages: `OfficeTrabajoPage` at `/office/trabajo` — unified work hub (Oleada 2). Legacy `/office/encargos` and `/office/pendientes` redirect here.

Pages: `OfficeArchivePage` at `/office/archive` — unified document hub.

Department rooms show **Procedimientos del departamento** with **Nuevo procedimiento** / **Vincular existente** (creates or links workflows via `orgUnit.config.linkedWorkflowIds` or virtual dept tags), plus **Procedimientos programados**.

Configuration (admin): `/settings/procedures` (grouped catalog), `/settings/specialists` (agent/skill templates). Legacy `/office/workflows` and `/ai-team` redirect or remain as aliases.

API: `GET /office/departments/:slug/procedures`, `GET /org-units/:id/procedures`, `GET /office/procedures`, `GET /office/departments/:slug/team`, `GET /org-units/:id/team`.

Run→department association is centralized in `src/lib/office-run-department.ts` (`teamAgents` at launch + workflow steps + `_history`).

Onboarding dismisses via `localStorage` key `ac.office-onboarding-v1`.
