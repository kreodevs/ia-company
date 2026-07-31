# Mis pendientes

Route: `/office/pendientes` (`PendingDecisionsPage`).

Human inbox for Go/No-Go decision proposals:

| Tab | Statuses |
|-----|----------|
| Por aprobar | `pending_review`, `drilling` |
| Aprobadas | `approved` |
| Rechazadas | `rejected`, `cancelled` |

Actions (pending tab only): approve, reject, request drill-down. Team evidence opens via `DecisionEvidencePanel`.

Sidebar entry **Mis pendientes** shows a badge with `pendingDecisions` from `GET /office/dashboard`.

Legacy `/decisions` redirects here. Debug KPI view remains at `/debug/decisions`.
