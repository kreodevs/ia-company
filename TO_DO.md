# TO_DO — Catalog Studio (Agent & Skill LLM)

> **Decisiones de producto (2026-07-24)**
> 1. Skills nuevas: **siempre explícitas** — el humano aprueba cada creación (propose ≠ apply).
> 2. UX: hub **Equipo IA** (`/ai-team`) con tabs Agentes | Habilidades | Crear agente | Crear habilidad.
> 3. Catálogo **solo tenant**; el LLM **prefiere reutilizar** agentes/skills existentes antes de inventar.
> 4. **Límite de coste** en propose (maxTokens + rate limit por tenant).

**Leyenda:** `[ ]` pendiente · `[~]` en progreso · `[x]` hecho

---

## Fase 0–4 — (completadas)

Ver commits `8c36231`, `66bd375`.

---

## Fase 2 — Agent Studio (LLM)

- [x] **2.7** Vincular a `orgUnitId`: apply → `config.linkedAgentNames` + UI selector + deep link desde dept.

---

## Fase 5 — UX Equipo IA

- [x] **5.4** Onboarding vertical post-login (`OfficeOnboardingPanel` en `/office`)

---

## Fase 6 — Cierre comercial (post-MVP)

- [ ] **6.1** Entrega cliente (link read-only artefactos)
- [ ] **6.2** Cadencia por dept. + work item
- [ ] **6.3** ROI por departamento / work item
- [x] **6.4** Plantillas verticales adicionales (`sales-revops`, `customer-success`, `seo-content-studio`, `finance-pricing`)

---

## Fase 7 — Documentación y calidad

- [x] **7.2** Tests integración apply → list + org link → `tests/integration/catalog-studio.test.ts`

---

## Registro de avance

| Fecha | Commit / nota |
|-------|----------------|
| 2026-07-24 | Creado TO_DO.md; arranque Fase 0–2 + 5.1 |
| 2026-07-24 | Fase 0–2 backend + hub `/ai-team` → `8c36231` |
| 2026-07-24 | Manual, Mejorar con IA, Org Studio, coordinador LLM → `66bd375` |
| 2026-07-24 | Tanda 3: orgUnitId apply, onboarding office, tests integración (sin commit) |
| 2026-07-24 | 6.4: cuatro plantillas verticales en Org Studio (sin commit) |
