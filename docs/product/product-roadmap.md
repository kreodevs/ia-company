# Roadmap de producto — Auto Company Platform

> **Actualizado:** 2026-08-01  
> **North star:** Tú operas tu empresa con la plataforma, generas ingresos reales con un trabajo paralelo, y después alquilas oficinas a solopreneurs en tu instancia multi-tenant.  
> **Principio:** Producto primero. Lanzamiento (web, legal, marketing) cuando el piloto (tú) ya cobra o entrega valor cobrable.

---

## Estado actual (baseline)

| Área | Nota | Comentario |
|------|------|------------|
| Oficina virtual (plantas, deptos, archive) | **9/10** | Fases 1–3 y 5 largely done |
| War room unificado | **9/10** | `useWarRoomTeam`, coordinator aside, idle seats |
| Entrega cliente externa | **8.5/10** | G+H done; PIN/PDF server = 10/10 |
| Motor workflows + encargos | **7.5/10** | Funciona; gaps en veto, entregables, safety |
| Multi-tenant + admin | **8/10** | Listo para 2º tenant técnico |
| Licencia + modelo negocio | **✅** | AGPL-3.0 + `docs/licensing.md` |
| Lanzamiento comercial | **2/10** | Sin pricing público, terms, landing — **aposta** |

---

## Fases (solo producto)

```text
Fase A ──► Fase B ──► Fase C ──► Fase D ──► [ Lanzamiento ]
 Piloto      Ingresos    1er tenant    Self-host      (después)
  (tú)        (tú)         (SaaS)      comunidad
```

---

## Fase A — Piloto operativo (tú, 2–3 semanas)

**Objetivo:** Usar la plataforma a diario sin workarounds. Si a ti no te sirve, no alquilas nada.

| # | Entrega | Por qué | Esfuerzo |
|---|---------|---------|----------|
| A1 | **Deploy prod al día** — `migrate deploy`, worker, Redis, backfill scope si aplica | G+H y war room no existen en prod sin esto | S |
| A2 | **Munger veto = hard stop** — run se bloquea al detectar VETO en output | ✅ Implementado en `engine.ts` | — |
| A3 | **Shell safety unificada** — misma policy en `run_shell_command` y tools | ✅ `shell-policy.ts` | — |
| A4 | **Entregables fiables** — dedupe docs, listado agent-docs visible post-run | Convergence usa `shouldSkipHandoffDocPersist` | M |
| A5 | **PIN opcional en `/d/:token`** | ✅ `accessPinHash` + gate UI | — |
| A6 | **Flujo diario documentado para ti** | ✅ [`/help/guia-piloto`](/help/guia-piloto) + [`pilot-daily-flow.md`](./pilot-daily-flow.md) | — |

**Criterio de salida:** Completas 1 encargo real de punta a punta (brief → docs → link entrega → cliente lo abre) en prod.

**Explícitamente NO en Fase A:** landing, pricing, blog, PDF server-side, meta-autopilot 24/7.

---

## Fase B — Loop de ingresos (tú, 3–4 semanas)

**Objetivo:** Primer ingreso atribuible a output de la plataforma (consultoría, micro-SaaS, deliverable vendido).

| # | Entrega | Por qué | Esfuerzo |
|---|---------|---------|----------|
| B1 | **Un vertical empaquetado** en `projects/` — procedimientos + workflows preconfigurados (ej. SnapOG, auditoría repo, informe mercado) | Ship > plan; caso de uso vendible | L |
| B2 | **Tracking revenue en producto** — UI para `revenueUsd`, fase, notas de cierre en el producto que operas | Ramen profitability medible | S |
| B3 | **Hub documental ≤3 clicks** — pulir `/office/archive` + link desde encargo entregado | Encuentras y reenvías deliverables rápido | S |
| B4 | **Encargo → entrega sin salir de Office** — wizard compartir visible en flujo post-`DELIVERED` | Menos pasos = más entregas | S |
| B5 | **Notificación `delivery_viewed`** en bandeja Office (ya backend) — confirmar UX | Sabes cuándo el cliente abrió | S |
| B6 | **Seed `research-drilldown`** + guard `tenantHasActiveRun` en launch | Evita pivots rotos y runs solapados | S |

**Criterio de salida:** Registras ≥1 ingreso (aunque sea manual) ligado a un encargo completado en la plataforma.

**Defer:** Stripe automático, CAC, dashboards financieros avanzados.

---

## Fase C — Primer tenant de pago (4–6 semanas)

**Objetivo:** Un solopreneur externo paga por su oficina en tu instancia. Producto multi-tenant validado comercialmente.

| # | Entrega | Por qué | Esfuerzo |
|---|---------|---------|----------|
| C1 | **Planes por tenant** — límites LLM/mes, seats, storage en admin (extender lo existente) | Control de margen | M |
| C2 | **Onboarding tenant guiado** — post-`/setup`: agentes seed, 1 procedimiento ejemplo, tour Office | Time-to-first-encargo < 1h | M |
| C3 | **Stripe suscripción** — checkout + webhook + portal (producto, no marketing site) | Cobro recurrente automatizado | L |
| C4 | **Aislamiento verificado** — audit rápido tenant A no ve datos tenant B | Requisito antes de cobrar | M |
| C5 | **Branding entrega por tenant** — defaults sensatos; tenant edita en Settings | Ya casi done (G+H) | S |
| C6 | **Impersonation + runbook soporte** — doc interno 1 página para ti como ops | Operar 5–10 tenants sin morir | S |

**Criterio de salida:** 1 tenant paga 1 mes. Tú no tocas su infra; ellos no tocan la tuya.

**Defer:** QR, webhooks delivery, plantillas email editables, PDF server-side (salvo que el tenant lo exija).

---

## Fase D — Self-host sólido (paralelo ligero, 2–3 semanas)

**Objetivo:** Comunidad AGPL puede instalar sola; tú vendes instalación VPS como consultoría opcional.

| # | Entrega | Por qué | Esfuerzo |
|---|---------|---------|----------|
| D1 | **Quickstart verificado** — README → docker compose → `/setup` en máquina limpia | Funnel OSS | S |
| D2 | **`.env.production.example` completo** — todas las vars documentadas | Menos tickets soporte | S |
| D3 | **Script healthcheck** — API + worker + Redis + PG | Dokploy/VPS diagnóstico | S |
| D4 | **COMMERCIAL-LICENSE.md** plantilla — dual licensing para enterprise | Monetización B2B futura | S |

**Criterio de salida:** Tercero clona repo e instala sin llamarte (o te paga solo el setup).

---

## Backlog producto (prioridad media — entre fases)

Cosas valiosas pero **después** de A–C si no bloquean al piloto:

| Item | Fase sugerida | Notas |
|------|---------------|-------|
| War room `/team/light` poll | B | Performance cuando muchos runs |
| OpenCode panel en war room | B | Hoy hay que ir a `/runs/:id` |
| Planta espacial animada (wireframe Fase 4) | Post-C | Vanity; motor ya funciona |
| PDF server-side | Post-C o bajo demanda | Print browser basta para piloto |
| Audit CSV export delivery views | C | Compliance tenant pro |
| Meta-orchestrator rotación multi-producto | Post-ingresos | Autonomía 24/7 no es tu MVP |
| Skills runner dinámico MCP | Post-ingresos | Prompt estático funciona |
| Revenue Stripe ingest automático | C+ | Manual OK en Fase B |
| i18n keys rotas restantes | A/B | Polish |
| Tests e2e encargo → docs → delivery | B | Confianza regresión |

---

## Lanzamiento (explícitamente AL FINAL)

**No hacer hasta Fase C cumplida** (o al menos B con ingreso real):

| Item | Cuándo |
|------|--------|
| Landing pública + pricing page | Pre-tenant #2 |
| Terms of Service / Privacy (hosted SaaS) | Antes de tenant #2 |
| Página “Oficina alquilada vs self-host” | Con pricing |
| Product Hunt / contenido / SEO | Con case study tuyo |
| Open Graph image generada por tenant | Nice-to-have |
| Favicon por tenant en entrega | Nice-to-have |
| QR en panel delivery | Distribución, no core |

---

## Métricas que importan (en orden)

1. **Encargos completados / semana** (piloto)
2. **Deliverables entregados a cliente externo / mes**
3. **Ingresos atribuidos** (`revenueUsd` o Stripe)
4. **Time-to-first-encargo** (nuevo tenant)
5. **MRR tenants hosted**
6. **Self-host installs / mes** (comunidad)

No optimizar aún: stars GitHub, page views, features shipped count.

---

## Tu stack semanal recomendado (piloto)

| Día | Foco producto |
|-----|---------------|
| Lun–Vie (30–60 min) | 1 encargo o avance en procedimiento activo |
| 1 bloque / semana | Fase A o B item concreto (no más de 1) |
| Fin de semana opcional | Revisar entregas cliente + anotar fricción UX |

La plataforma debe **pagarse en tiempo ahorrado e ingresos generados**, no en horas de desarrollo adicional.

---

## Referencias

| Doc | Contenido |
|-----|-----------|
| [`external-client-roadmap.md`](./external-client-roadmap.md) | Detalle entrega 8.5 → 10/10 |
| [`virtual-office-design.md`](./virtual-office-design.md) | UX oficina — fases implementadas |
| [`../licensing.md`](../licensing.md) | Self-host vs oficina alquilada |
| [`../GAPS.md`](../GAPS.md) | Gaps motor (algunos ya resueltos) |

---

*Próxima revisión del roadmap: al cerrar Fase A (criterio de salida cumplido).*
