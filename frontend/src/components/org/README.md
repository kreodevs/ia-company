# Org OS components

Kreo-compatible UI for departments (Org Units).

| Component | Role |
|-----------|------|
| `SchemaDynamicForm.tsx` | Adapter: org `configSchema` → Kreo `DynamicForm` (`@/components/organisms/DynamicForm`). |
| `ArtifactGallery.tsx` | Kreo `DataTable` gallery with status workflow and detail panel. |

Kreo `DataTable` (TanStack Table) and `Calendar` (react-day-picker) pulled from Kreo registry — headless, no PrimeReact.
| `OrgArtifactsPanel.tsx` | Compact war-room panel: recent department artifacts with link to full gallery. |

**Phase 5:** Munger preview on propose; multi work items; orchestration scoped by department; war room passes org context to coordinator.

See [ADR-org-os](../../../docs/cto/ADR-org-os.md).
