# Org OS components

Kreo-compatible UI for departments (Org Units).

| Component | Role |
|-----------|------|
| `SchemaDynamicForm.tsx` | Renders `configSchema` JSON (Kreo DynamicForm field contract). |
| `ArtifactGallery.tsx` | DataTable-style gallery: status updates, detail view, typed deliverables. |

**Phase 2:** artifacts auto-populate from agent handoffs when a product is linked to a department (`orgUnitId`). Status workflow: `draft` → `approved` → `published` → `archived`.

See [ADR-org-os](../../../docs/cto/ADR-org-os.md).
