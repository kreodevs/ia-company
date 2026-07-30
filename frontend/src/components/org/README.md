# Org components

| Component | Role |
|-----------|------|
| `DepartmentStaffPanel` | Full department roster (template + added roles, no cap) + link existing agents + embedded Agent Studio hiring assistant |
| `DepartmentSettingsPanel` | Settings tab with sub-tabs: Details, Operations, Operating profile, Design & artifacts (`?tab=settings&section=`) |
| `OrgArtifactsPanel` | Compact war-room panel for recent department artifacts |
| `ArtifactGallery` | Full artifact browser with filters |
| `SchemaDynamicForm` | Org unit config editor from JSON schema |

## Department staffing

Inside `/org-units/:id` use the tabs **Sala de reuniones | Personal | Configuración** (or `?tab=staff` / `?tab=settings&section=profile` from the list).

**Configuración** sub-tabs: **Datos | Operaciones | Perfil operativo | Diseño y artefactos** (`section=profile|operations|config|assets`).

List page (`/org-units`) offers **Gestionar personal** and **Editar departamento** on each card.

**Personal** hiring sub-tabs: **Crear nuevo | Incorporar existente** (`?tab=staff&hire=create|incorporate`). Incorporate lists tenant agents not yet in this roster, including those assigned to other departments.

- **¿Qué puesto me falta?** — auto-brief from gap analysis on missing template roles
- **Añadir nuevo puesto** — propose roles beyond the starter template
- **Crear con IA** per missing role — pre-filled brief for Agent Studio
- **Vincular agente existente** — attach an agent from Equipo IA to this department

API: `GET /org-units/:id/staff`, `POST /org-units/:id/staff/link`, `POST /org-units/:id/staff/unlink`, `POST /catalog-studio/agents/propose|apply` with `orgUnitId`.
