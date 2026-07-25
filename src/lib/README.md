# `src/lib` — backend domain modules

Shared server-side logic for Auto Company Platform (Org OS, Catalog Studio, Office, workflows).

## Business templates (`business-templates.ts`)

Platform verticals seeded into `BusinessTemplate` via `seedBusinessTemplates()` in `org-studio.ts`. Org Studio lists them at `/org-studio/templates`.

| Slug | Name | `OrgUnitType` |
|------|------|---------------|
| `marketing-agency` | Digital Marketing Agency | `marketing_agency` |
| `product-studio` | Product Studio (default) | `product_studio` |
| `sales-revops` | Sales & RevOps | `department` |
| `customer-success` | Customer Success | `department` |
| `seo-content-studio` | SEO & Content Studio | `marketing_agency` |
| `finance-pricing` | Finance & Pricing | `department` |
| `custom-department` | Custom Department | `custom` |

Each definition includes:

- `configSchema` / `configDefaults` — DynamicForm-compatible department config
- `tokens` + `designMd` — brand and voice for agents
- `suggestedAgents` — tenant agents created on apply (skill names reference platform skills in `claude/skills/`)
- `suggestedWorkflows` — platform workflow names from `seed-platform.ts`
- `artifactTypes` — gallery types for deliverables

To add a vertical: extend `business-templates.ts`, append to `PLATFORM_BUSINESS_TEMPLATES`, and add tests in `tests/org-studio.test.ts`. DB rows upsert on next `listBusinessTemplates()` call.
