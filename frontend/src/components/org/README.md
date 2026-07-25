# Org OS components

Kreo-compatible UI for departments (Org Units).

| Component | Role |
|-----------|------|
| `SchemaDynamicForm.tsx` | Renders `configSchema` JSON (Kreo DynamicForm field contract). Supports `color` natively until Kreo pull succeeds. |
| `ArtifactGallery.tsx` | DataTable-style gallery: status updates, detail view, typed deliverables. |
| `OrgArtifactsPanel.tsx` | Compact war-room panel: recent department artifacts with link to full gallery. |

**Phase 5:** Munger preview on propose; multi work items; orchestration scoped by department; war room passes org context to coordinator.

See [ADR-org-os](../../../docs/cto/ADR-org-os.md).
