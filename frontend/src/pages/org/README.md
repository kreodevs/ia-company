# Org OS pages

| Route | Page | Purpose |
|-------|------|---------|
| `/org-units` | `OrgUnitsPage.tsx` | List departments |
| `/org-units/:id` | `OrgUnitDetailPage.tsx` | **Department room** (same layout as virtual salas) + launch, config, artifacts |
| `/org-studio` | `OrgStudioPage.tsx` | AI-assisted department creator (template → propose → apply) |

Custom departments opened from the **office floor plan** (`/office`) use the same war-room visual as virtual rooms (`/office/departments/:slug`).

Each department room includes:
- **Scope select** — general exploration or a specific product before launching work
- **Coordinator chat** — replaces the old specialists list; propose team + approve encargos in-room

**Product link:** Product settings → Department + work item type (`client`, `campaign`, …).

**Deploy note:** run migration `20250724210000_org_os` before using these routes.
