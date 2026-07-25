# TO_DO — Catalog Studio (Agent & Skill LLM)

> **Decisiones de producto (2026-07-24)**
> 1. Skills nuevas: **siempre explícitas** — el humano aprueba cada creación (propose ≠ apply).
> 2. UX: hub **Equipo IA** (`/ai-team`) con tabs Agentes | Habilidades | Crear agente | Crear habilidad.
> 3. Catálogo **solo tenant**; el LLM **prefiere reutilizar** agentes/skills existentes antes de inventar.
> 4. **Límite de coste** en propose (maxTokens + rate limit por tenant).

**Leyenda:** `[ ]` pendiente · `[~]` en progreso · `[x]` hecho

---

## Fase 0 — Contrato y reutilización

- [x] **0.1** Tipos `SkillStudioProposal`, `AgentStudioProposal`, `StudioMungerReview` → `src/lib/catalog-studio-types.ts`
- [x] **0.2** Utilidades LLM compartidas → `src/lib/catalog-studio-llm.ts` (parse JSON, tenant model, rate limit, maxTokens)
- [x] **0.3** Few-shot desde plantillas → `src/lib/catalog-studio-fewshots.ts`
- [x] **0.4** `slugifyCatalogName` + helpers tenant → `src/lib/tenant-catalog.ts` (`ensureTenantSkill`, mover `ensureTenantAgents` desde org-studio)
- [x] **0.5** Refactor `org-studio-llm.ts` para importar desde `catalog-studio-llm.ts`
- [x] **0.6** Tests unitarios helpers (slug, parse JSON) → `tests/catalog-studio.test.ts`

---

## Fase 1 — Skill Studio (LLM)

- [x] **1.1** `proposeSkillWithLlm` → `src/lib/skill-studio.ts`
- [x] **1.2** `reviewSkillProposalWithMunger`
- [x] **1.3** `applySkillProposal` (requiere `approved: true` en body)
- [x] **1.4** Rutas `POST /catalog-studio/skills/propose|apply` → `src/server/routes/catalog-studio.ts`
- [x] **1.5** Registrar rutas en `src/server/index.ts`
- [x] **1.6** API frontend `api.catalogStudio.skills.*`
- [x] **1.7** UI tab **Crear habilidad** en `AiTeamHubPage`
- [x] **1.8** i18n `catalogStudio` es/en
- [x] **1.9** Tests `tests/catalog-studio.test.ts` (apply gates / parse JSON)
- [x] **1.10** Manual ayuda — sección Skill Studio

---

## Fase 2 — Agent Studio (LLM)

- [x] **2.1** `proposeAgentWithLlm` → `src/lib/agent-studio.ts`
- [x] **2.2** Resolución skills: existentes vs `newSkills[]` (aprobación explícita por skill en apply)
- [x] **2.3** `reviewAgentProposalWithMunger`
- [x] **2.4** `applyAgentProposal` (`approved: true`, `approvedNewSkillNames: string[]`)
- [x] **2.5** Rutas `POST /catalog-studio/agents/propose|apply`
- [x] **2.6** API frontend + tab **Crear agente**
- [ ] **2.7** Opcional v1: vincular a `orgUnitId` en config dept. (propose acepta orgUnitId; apply pendiente UI)
- [x] **2.8** Tests apply gates en `tests/catalog-studio.test.ts`
- [x] **2.9** Botón «Mejorar con IA» en `AgentForm` / `SkillsPage` (rellenar borrador)

---

## Fase 3 — Org Studio unificado

- [x] **3.1** LLM refina `suggestedAgents[]` en Org Studio (además de summary/design.md)
- [x] **3.2** Apply dept.: skills faltantes → proponer crear (UI confirmación), no silenciar `continue`
- [x] **3.3** Reutilizar `tenant-catalog` en todo el flujo org

---

## Fase 4 — Coordinador dinámico

- [x] **4.1** `selectOfficeAgentsWithLlm` — elige agentes del catálogo tenant (`office-coordinator-llm.ts`)
- [x] **4.2** Tarjeta «Falta rol X» → deep link Agent Studio con brief (`TeamProposalCard`)
- [x] **4.3** Scope departamento prioriza agentes del dept. (ya en `planOfficeTask` + LLM preferredNames)

---

## Fase 5 — UX Equipo IA

- [x] **5.1** Hub `/ai-team` — tabs Agentes | Habilidades | Crear agente | Crear habilidad
- [x] **5.2** Nav **Tu oficina** → Equipo IA; quitar catálogo de depuración
- [x] **5.3** Redirect `/agents`, `/skills`, `/debug/agents`, `/debug/skills` → `/ai-team?tab=…`
- [ ] **5.4** Onboarding vertical post-login
- [x] **5.5** Actualizar manual ayuda completo

---

## Fase 6 — Cierre comercial (post-MVP)

- [ ] **6.1** Entrega cliente (link read-only artefactos)
- [ ] **6.2** Cadencia por dept. + work item
- [ ] **6.3** ROI por departamento / work item
- [ ] **6.4** Plantillas verticales adicionales

---

## Fase 7 — Documentación y calidad

- [x] **7.1** ADR `docs/cto/ADR-catalog-studio.md`
- [ ] **7.2** Tests integración propose → apply → list agents (requiere LLM mock/DB)
- [x] **7.3** README `frontend/src/pages/ai-team/README.md`

---

## Registro de avance

| Fecha | Commit / nota |
|-------|----------------|
| 2026-07-24 | Creado TO_DO.md; arranque Fase 0–2 + 5.1 |
| 2026-07-24 | Fase 0–2 backend + rutas API + hub `/ai-team` + i18n + tests + ADR → `8c36231` |
| 2026-07-24 | Tanda 2: manual ayuda, Mejorar con IA, Org Studio agents/skills, coordinador LLM + missing roles (sin commit) |
