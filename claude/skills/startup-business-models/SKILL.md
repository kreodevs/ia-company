---
name: startup-business-models
description: Usar al elegir o evaluar un modelo de ingresos de startup, métrica de pricing/valor, diseño de packaging/tiers, o calcular unit economics (LTV, CAC, payback, gross margin, NRR), incluyendo pricing usage-based/credit/AI y restricciones de compute/COGS variable.
---

# Modelos de negocio para startups

Flujo de trabajo sistemático para elegir modelos de ingresos, pricing y unit economics.

## Inicio rápido (inputs)

Pide el conjunto mínimo de inputs que haga la decisión significativa:

- Tipo de negocio: SaaS, usage-based/API, marketplace, servicios, hardware + servicio
- ICP/segmento(s): SMB / mid-market / enterprise (y bandas ACV/ARPA)
- Pricing y packaging actuales: value metric, tiers, límites, política de descuentos, cadencia de facturación
- Drivers de unit economics: CAC fully-loaded, gross margin/COGS (incluir LLM/infra/terceros), churn/retención, expansión (NRR)
- Restricciones: motion de ventas (PLG vs sales-led), restricciones de implementación (billing metering, proration), piso de gross margin, objetivo de payback

Si faltan números, avanza con rangos + supuestos explícitos y destaca qué medir a continuación.

## Flujo de trabajo

1) Clasificar el modelo
- Suscripción, usage-based, freemium, take-rate de marketplace, transaction fee, ads, outcome-based, credit-based, híbrido.

2) Construir snapshot de unit economics por segmento
- Usar `references/unit-economics-calculator.md` para fórmulas, benchmarks y errores comunes.
- Preferir vistas por cohorte/segmento sobre promedios mezclados.

3) Evaluar encaje del modelo y riesgos
- Alinear price metric con valor entregado y costo incurrido (especialmente usage + AI compute).
- Identificar modos de fallo: compresión de margen, selección adversa, conflicto de canal, explosión de costos de soporte, fricción de metering/overage.

4) Proponer cambios de pricing + packaging
- Usar `references/pricing-research-guide.md` para métodos WTP y scripts de entrevistas de pricing.
- Usar `assets/pricing-tier-design.md` para borrador de tiers, límites, triggers de upgrade y reglas de enforcement.

5) Definir medición y roll-out
- Definir métrica de éxito + guardrails, diseño de evaluación y ventanas de lag explícitas (conversión ahora, retención después).

6) Entregar output listo para decisión
- Recomendación, rationale, supuestos, escenarios (base/best/worst) y próximos experimentos.

## Heurísticas 2026 (dependientes del contexto)

- Priorizar payback y gross margin sobre un solo ratio; LTV:CAC es fácil de manipular.
- Objetivos SaaS típicos (orientativos, por segmento/etapa): LTV:CAC 3-5x, payback 6-12 meses (PLG) o 12-18 meses (sales-led temprano), NRR >100% (mid-market/enterprise) y gross margin >70% (solo software).
- Para productos usage-based / AI: modelar contribution margin por unidad (token/job/workflow) y definir guardrails de pricing (rate limits, mínimos, commit tiers, expiración de créditos).

## Skills relacionados (routing)

- [startup-idea-validation](../startup-idea-validation/)
- [startup-competitive-analysis](../startup-competitive-analysis/)
- [startup-fundraising](../startup-fundraising/)
- [startup-go-to-market](../startup-go-to-market/)

## Medición de cambios de pricing y diseño de experimentos
Usar cuando cambies pricing, packaging, value metric, límites, descuentos o cadencia de facturación.

### 1) Definir éxito y guardrails (antes del launch)
| Tipo | Ejemplos |
|------|----------|
| Métrica principal de éxito | Net revenue retention (NRR), ARPA/ARPU, gross margin %, payback period, upgrade rate, expansion MRR |
| Guardrails | Conversión de new logos, activation rate, refund rate, carga de soporte, churn (logo + revenue), duración del ciclo de ventas |

### 2) Elegir diseño de evaluación
| Diseño | Mejor cuando | Cómo leer resultados |
|--------|-----------|---------------------|
| A/B (randomizado) | Flujos self-serve / PLG | Comparar conversión, ARPA, refunds y retención downstream por asignación |
| Cohorte holdout/control | El pricing es difícil de randomizar | Comparar cohortes tratadas vs. holdout emparejadas por segmento, canal y mes de inicio |
| Rollout escalonado (por tiempo) | Contratos enterprise, ciclos de facturación | Comparar pre/post con cohorte paralela (aún no expuesta) para reducir sesgo estacional |
| Rollout geo/cuenta | Regiones/segmentos separables | Comparar regiones/segmentos; vigilar cambios en mix de canal |

### 3) Usar ventanas de lag explícitas (evitar conclusiones prematuras)
- Lag corto (días a 2 semanas): conversión checkout, activación, fricción del ciclo de ventas, picos de refund/soporte.
- Lag medio (4 a 8 semanas): upgrades, expansion MRR, crecimiento de usage, comportamiento de descuentos, efectos de proration.
- Lag largo (90 a 180+ días, B2B): churn, net revenue retention, resultados de renovación, riesgo de contracción.

### 4) Reportar vista "all-in" (no solo conversión)
- Calidad de revenue: net revenue tras refunds, descuentos y créditos; impacto en gross margin (incluyendo compute/COGS variable).
- Segmentos: desglosar por plan, banda de seats, canal, banda ACV/ARR y antigüedad del cliente (nuevo vs. renovación).
- Regla de decisión: escribir umbral go/no-go (ejemplo: "NRR +2pts sin caída >0.5pt en activación y sin aumento >10% en carga de soporte").

## Métricas SaaS (leer cuando haga falta)

Usar `references/saas-metrics-playbook.md` para definiciones y templates (MRR/ARR, churn, NRR, Quick Ratio, Magic Number, burn multiple, foco por etapa).

## Recursos

| Recurso | Propósito |
|----------|---------|
| [unit-economics-calculator.md](references/unit-economics-calculator.md) | Cálculos LTV, CAC, payback |
| [pricing-research-guide.md](references/pricing-research-guide.md) | Metodología de investigación WTP |
| [saas-metrics-playbook.md](references/saas-metrics-playbook.md) | Deep dive en métricas SaaS |

## Plantillas

| Template | Propósito |
|----------|---------|
| [business-model-canvas.md](assets/business-model-canvas.md) | Diseño completo del modelo |
| [unit-economics-worksheet.md](assets/unit-economics-worksheet.md) | Calcular y rastrear métricas |
| [pricing-tier-design.md](assets/pricing-tier-design.md) | Worksheet de pricing y packaging |

## Datos

| Archivo | Propósito |
|------|---------|
| [sources.json](data/sources.json) | Recursos de modelos de negocio |

---

## Hacer / Evitar (Ene 2026)

### Hacer

- Definir tu value metric (seat/usage/outcome) y validar willingness-to-pay temprano.
- Incluir drivers de COGS en decisiones de pricing (especialmente usage-based).
- Usar guardrails de descuento y lógica de renovación (evitar deals ad-hoc).

### Evitar

- Pricing como pensamiento posterior ("lo resolveremos después").
- Ceguera de margen (enviar crecimiento de usage que destruye gross margin).
- Cálculos de LTV engañosos por cohortes inmaduras.

## Cómo se ve lo bueno

- Packaging: value metric clara, lógica de tiers y política de descuentos (con reglas de enforcement).
- Unit economics: CAC, gross margin, churn, payback y retención definidos y ligados a cohortes.
- Supuestos: una hoja de inputs, rangos/sensibilidades y escenarios (base/best/worst).
- Experimentos: cambios de pricing probados con reglas de decisión (no rollouts por "gut feel").
- Riesgos: compresión de margen, selección adversa, conflicto de canal y costo de soporte modelados.

## Opcional: AI / Automatización

Usar solo cuando se solicite explícitamente y sea compatible con políticas.

- Resumir investigación de pricing y snapshots competitivos; verificar manualmente antes de actuar.
- Borrador de copy de pricing page; humanos verifican claims y consistencia con contratos.