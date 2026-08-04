# Org OS pages

| Route | Page | Purpose |
|-------|------|---------|
| `/org-units` | `OrgUnitsPage.tsx` | List departments — PageHeader + Breadcrumbs Kreo |
| `/org-units/:id` | `OrgUnitDetailPage.tsx` | Department room + Breadcrumbs en navegación |
| `/org-studio` | `OrgStudioPage.tsx` | AI-assisted department creator — PageHeader + Breadcrumbs |

Custom departments opened from the **office floor plan** (`/office`) use the same war-room visual as virtual rooms (`/office/departments/:slug`).

Each department room includes:
- **Scope select** — general exploration or a specific product before launching work
- **Coordinator chat** — replaces the old specialists list; propose team + approve encargos in-room
- **Plantilla del departamento** — roster of roles + **Asistente de contratación** (Agent Studio embedded) to create missing agents with skills and MCP tools

**Product link:** Product settings → Department + work item type (`client`, `campaign`, …).

**Deploy note:** run migration `20250724210000_org_os` before using these routes.
