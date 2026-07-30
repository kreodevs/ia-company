# Org components

| Component | Role |
|-----------|------|
| `DepartmentStaffPanel` | Full department roster (template + added roles, no cap) + link existing agents + embedded Agent Studio hiring assistant |
| `OrgArtifactsPanel` | Compact war-room panel for recent department artifacts |
| `ArtifactGallery` | Full artifact browser with filters |
| `SchemaDynamicForm` | Org unit config editor from JSON schema |

## Department staffing

Inside `/org-units/:id` use the tabs **Sala de reuniones | Personal | Configuración** (or `?tab=staff` / `?tab=settings` from the list).

List page (`/org-units`) offers **Gestionar personal** and **Editar departamento** on each card.

- **¿Qué puesto me falta?** — auto-brief from gap analysis on missing template roles
- **Añadir nuevo puesto** — propose roles beyond the starter template
- **Crear con IA** per missing role — pre-filled brief for Agent Studio
- **Vincular agente existente** — attach an agent from Equipo IA to this department

API: `GET /org-units/:id/staff`, `POST /org-units/:id/staff/link`, `POST /org-units/:id/staff/unlink`, `POST /catalog-studio/agents/propose|apply` with `orgUnitId`.
