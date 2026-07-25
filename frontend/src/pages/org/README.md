# Org OS pages

| Route | Page | Purpose |
|-------|------|---------|
| `/org-units` | `OrgUnitsPage.tsx` | List departments |
| `/org-units/:id` | `OrgUnitDetailPage.tsx` | Launch team runs, linked products, config, design.md, artifact gallery |
| `/org-studio` | `OrgStudioPage.tsx` | AI-assisted department creator (template → propose → apply) |

**Product link:** Product settings → Department + work item type (`client`, `campaign`, …).

**Deploy note:** run migration `20250724210000_org_os` before using these routes.
