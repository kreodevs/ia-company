---
name: financial-unit-economics
description: Usar al evaluar viabilidad del modelo de negocio, analizar rentabilidad por cliente/producto/transacción, validar métricas de startup (CAC, LTV, payback period), tomar decisiones de pricing, evaluar escalabilidad, comparar modelos de negocio, o cuando el usuario mencione unit economics, ratio CAC/LTV, contribution margin, rentabilidad por cliente, break-even analysis, o necesite determinar si un negocio puede ser rentable a escala.
---

# Unit economics financieros

## Tabla de contenidos
- [Propósito](#propósito)
- [Cuándo usar](#cuándo-usar)
- [¿Qué es?](#qué-es)
- [Flujo de trabajo](#flujo-de-trabajo)
- [Patrones comunes](#patrones-comunes)
- [Guardrails](#guardrails)
- [Referencia rápida](#referencia-rápida)

## Propósito

Los unit economics financieros analizan la rentabilidad de unidades individuales (clientes, productos, transacciones) para determinar si un modelo de negocio es viable y escalable. Este skill te guía para calcular métricas clave (CAC, LTV, contribution margin), interpretar ratios, realizar análisis por cohortes y tomar decisiones basadas en datos sobre pricing, gasto en marketing y estrategia de crecimiento.

## Cuándo usar

Usa este skill cuando:

- **Validación del modelo de negocio**: Determinar si startup/nuevo producto puede ser rentable a escala
- **Decisiones de pricing**: Fijar precios según márgenes objetivo y economics del cliente
- **Gasto en marketing**: Evaluar ROI de canales de adquisición, optimizar CAC
- **Estrategia de crecimiento**: Decidir cuándo escalar (levantar funding, aumentar gasto) según unit economics
- **Roadmap de producto**: Priorizar features que mejoren retención o reduzcan churn (aumentar LTV)
- **Pitch a inversores**: Demostrar viabilidad del modelo con métricas CAC, LTV, payback
- **Optimización de canal**: Comparar rentabilidad entre segmentos de clientes o canales de adquisición
- **Modelos de suscripción**: Analizar revenue recurrente, churn, curvas de retención por cohorte
- **Economics de marketplace**: Modelar take rate, economics supply/demand, liquidez
- **Planificación financiera**: Forecast de cash flow, runway, burn rate basado en unit economics

Frases trigger: "unit economics", "CAC/LTV", "customer acquisition cost", "lifetime value", "contribution margin", "payback period", "customer profitability", "break-even", "cohort analysis", "is this business viable?"

## ¿Qué es?

Los **unit economics financieros** miden rentabilidad al nivel más granular (por cliente, producto o transacción) para entender si el revenue de una unidad supera el costo de adquirirla y servirla.

**Componentes core**:
- **CAC (Customer Acquisition Cost)**: Gasto total sales/marketing ÷ nuevos clientes adquiridos
- **LTV (Lifetime Value)**: Revenue del cliente en su lifetime menos costos variables
- **Contribution Margin**: (Revenue - Costos variables) ÷ Revenue (como %)
- **Ratio LTV/CAC**: Mide retorno de inversión en adquisición (objetivo: 3:1 o superior)
- **Payback Period**: Meses para recuperar CAC del revenue del cliente
- **Análisis por cohortes**: Rastrear métricas en el tiempo por grupos de clientes (por mes/canal de adquisición)

**Ejemplo rápido:**

**Escenario**: Startup SaaS, modelo de suscripción ($100/mes), analizando unit economics.

**Métricas**:
- **CAC**: $20k gasto marketing, 100 nuevos clientes → CAC = $200
- **Revenue mensual por cliente**: $100
- **Costos variables**: $20/cliente/mes (hosting, soporte)
- **Gross margin**: ($100 - $20) / $100 = 80%
- **Churn mensual**: 5% → Lifetime promedio = 1 / 0.05 = 20 meses
- **LTV**: $100 revenue × 20 meses × 80% margin = $1,600
- **LTV/CAC**: $1,600 / $200 = 8:1 ✓ (saludable, >3:1)
- **Payback period**: $200 CAC ÷ ($100 × 80% margin) = 2.5 meses ✓ (bueno, <12 meses)

**Interpretación**: Unit economics sólidos. Cada cliente genera 8× su costo de adquisición. Se puede escalar marketing con rentabilidad. Payback en 2.5 meses = recuperación rápida de capital.

**Beneficios core**:
- **Sistema de alerta temprana**: Detectar modelos insostenibles antes de escalar pérdidas
- **Crecimiento basado en datos**: Saber cuándo los unit economics justifican aumentar gasto
- **Optimización de canal**: Identificar qué canales de adquisición son rentables
- **Poder de pricing**: Cuantificar impacto de cambios de precio en rentabilidad
- **Confianza de inversores**: Demostrar camino a rentabilidad con métricas claras

## Flujo de trabajo

Copia este checklist y rastrea tu progreso:

```
Progreso de análisis de unit economics:
- [ ] Paso 1: Definir la unidad
- [ ] Paso 2: Calcular CAC
- [ ] Paso 3: Calcular LTV
- [ ] Paso 4: Evaluar contribution margin
- [ ] Paso 5: Analizar cohortes
- [ ] Paso 6: Interpretar y recomendar
```**Paso 1: Definir la unidad**

¿Cuál es tu unidad de análisis? (Cliente, SKU de producto, transacción, suscripción). Ver [resources/template.md](resources/template.md#unit-definition-template).

**Paso 2: Calcular CAC**

Costos totales de adquisición (sales + marketing) ÷ unidades nuevas adquiridas. Desglosar por canal si aplica. Ver [resources/template.md](resources/template.md#cac-calculation-template) y [resources/methodology.md](resources/methodology.md#1-customer-acquisition-cost-cac).

**Paso 3: Calcular LTV**

Revenue en lifetime de la unidad menos costos variables. Usar datos de cohorte para retención/churn. Ver [resources/template.md](resources/template.md#ltv-calculation-template) y [resources/methodology.md](resources/methodology.md#2-lifetime-value-ltv).

**Paso 4: Evaluar contribution margin**

(Revenue - Costos variables) ÷ Revenue. Identificar palancas para mejorar margin. Ver [resources/template.md](resources/template.md#contribution-margin-template) y [resources/methodology.md](resources/methodology.md#3-contribution-margin-analysis).

**Paso 5: Analizar cohortes**

Rastrear retención, LTV, payback por cohorte de clientes (mes/canal/segmento de adquisición). Ver [resources/template.md](resources/template.md#cohort-analysis-template) y [resources/methodology.md](resources/methodology.md#4-cohort-analysis).

**Paso 6: Interpretar y recomendar**

Evaluar ratio LTV/CAC, payback period, eficiencia de cash. Hacer recomendaciones (pricing, canales, crecimiento). Ver [resources/template.md](resources/template.md#interpretation-template) y [resources/methodology.md](resources/methodology.md#5-interpreting-unit-economics).

Validar usando [resources/evaluators/rubric_financial_unit_economics.json](resources/evaluators/rubric_financial_unit_economics.json). **Estándar mínimo**: Puntuación media ≥ 3.5.

## Patrones comunes

**Patrón 1: Modelo de suscripción SaaS**
- **Métricas clave**: MRR, ARR, churn rate, LTV/CAC, payback period, CAC payback
- **Cálculo**: LTV = ARPU × Gross Margin % ÷ Churn Rate
- **Benchmarks**: LTV/CAC ≥3:1, Payback <12 meses, Churn <5% mensual (B2C) o <2% (B2B)
- **Palancas**: Reducir churn (aumentar LTV), upsell/cross-sell (aumentar ARPU), optimizar canales (reducir CAC)
- **Cuándo**: Negocio de suscripción, revenue recurrente, retención crítica

**Patrón 2: E-commerce / Transaccional**
- **Métricas clave**: AOV (Average Order Value), repeat purchase rate, contribution margin por pedido, CAC
- **Cálculo**: LTV = AOV × Purchase Frequency × Gross Margin % × Customer Lifetime (años)
- **Benchmarks**: Contribution margin ≥40%, Repeat purchase rate ≥25%, LTV/CAC ≥2:1
- **Palancas**: Aumentar AOV (bundling, upsells), impulsar repeat purchases (loyalty programs), reducir costos variables
- **Cuándo**: Negocio transaccional, e-commerce, retail

**Patrón 3: Marketplace / Platform**
- **Métricas clave**: Take rate, GMV (Gross Merchandise Value), CAC supply/demand, liquidez
- **Cálculo**: LTV = GMV por usuario × Take Rate × Gross Margin % ÷ Churn Rate
- **Benchmarks**: Take rate 10-30%, LTV/CAC ≥3:1 en ambos lados, network effects activos
- **Palancas**: Aumentar take rate (servicios de valor añadido), mejorar matching (aumentar GMV), balancear supply/demand
- **Cuándo**: Marketplace de dos lados, negocio platform

**Patrón 4: Freemium / PLG (Product-Led Growth)**
- **Métricas clave**: Free-to-paid conversion rate, time to convert, paid user LTV, blended CAC
- **Cálculo**: Blended LTV = (Free users × Conversion % × Paid LTV) - (Free user costs)
- **Benchmarks**: Conversion ≥2%, Time to convert <90 días, Paid LTV/CAC ≥4:1
- **Palancas**: Aumentar conversion rate (mejorar producto, optimizar paywall), reducir time to value, bajar CAC vía viralidad
- **Cuándo**: Product-led growth, modelo freemium, producto viral

**Patrón 5: Enterprise / Ventas high-touch**
- **Métricas clave**: CAC (incluyendo costos del equipo de ventas), sales cycle length, NRR (Net Revenue Retention), LTV
- **Cálculo**: LTV = ACV (Annual Contract Value) × Gross Margin % × Average Customer Lifetime (años)
- **Benchmarks**: LTV/CAC ≥3:1, Sales efficiency (ARR added ÷ S&M spend) ≥1.0, NRR ≥110%
- **Palancas**: Acortar sales cycle, aumentar ACV (upsell, tiers premium), mejorar retención (NRR)
- **Cuándo**: Ventas enterprise, ACV alto, ciclos de venta largos

## Guardrails

**Requisitos críticos:**1. **CAC fully-loaded**: Incluir todos los costos de adquisición (salarios sales, gasto marketing, tools, asignación overhead). Subestimar CAC hace que los unit economics parezcan mejores de lo real.

2. **Costos variables reales**: Solo costos que escalan con cada unidad (COGS, hosting por usuario, transaction fees). No incluir costos fijos (rent, core engineering). LTV requiere margin preciso.

3. **LTV basado en cohortes**: No promediar todos los clientes. Cohortes tempranas ≠ recientes. Rastrear curvas de retención por cohorte. LTV debe basarse en retención observada, no supuestos.

4. **El horizonte temporal importa**: LTV es predicción. Usar supuestos conservadores. En productos nuevos, estimaciones LTV son poco fiables. Ponderar más cohortes recientes.

5. **Payback period vs. LTV/CAC**: Ambos importan. LTV/CAC alto pero payback largo (>18 meses) tensiona cash. Payback rápido (<6 meses) permite reinversión rápida.

6. **Análisis por canal**: Métricas blended ocultan la verdad. CAC y LTV varían por canal. Analizar por separado para optimizar gasto.

7. **La retención es rey**: Pequeños cambios en churn tienen impacto exponencial en LTV. Mejorar churn mensual de 5% a 4% aumenta LTV 25%.

8. **Piso de gross margin**: Necesitas ≥60% gross margin para SaaS, ≥40% para e-commerce. Margin bajo = ratio LTV/CAC alto pero cash flow pobre.

**Errores comunes:**

- ❌ **Ignorar churn**: Asumir que los clientes se quedan para siempre
- ❌ **LTV vanidad**: Retención irreal (p. ej., LTV 5 años con 1 mes de datos)
- ❌ **CAC blended**: Mezclar canales rentables e irrentables
- ❌ **No actualizar**: Los unit economics cambian; recalcular trimestralmente
- ❌ **Costos faltantes**: Olvidar soporte, payment processing, fraude, refunds
- ❌ **Escalar prematuramente**: Crecer antes de que funcionen los unit economics (LTV/CAC <2:1)

## Referencia rápida

**Fórmulas clave:**

```
CAC = (Sales + Marketing Costs) ÷ New Customers Acquired

LTV (subscription) = ARPU × Gross Margin % ÷ Monthly Churn Rate

LTV (transactional) = AOV × Purchase Frequency × Gross Margin % × Lifetime (years)

Contribution Margin % = (Revenue - Variable Costs) ÷ Revenue

LTV/CAC Ratio = Lifetime Value ÷ Customer Acquisition Cost

Payback Period (months) = CAC ÷ (Monthly Revenue × Gross Margin %)

CAC Payback (months) = S&M Spend ÷ (New ARR × Gross Margin %)

Gross Margin % = (Revenue - COGS) ÷ Revenue

Customer Lifetime (months) = 1 ÷ Monthly Churn Rate

MRR (Monthly Recurring Revenue) = Sum of all monthly subscriptions

ARR (Annual Recurring Revenue) = MRR × 12

ARPU (Average Revenue Per User) = Total Revenue ÷ Total Users

NRR (Net Revenue Retention) = (Starting ARR + Expansion - Contraction - Churn) ÷ Starting ARR
```**Benchmarks (varía por etapa e industria):**

| Métrica | Bueno | Aceptable | Pobre |
|--------|------|------------|------|
| **Ratio LTV/CAC** | ≥5:1 | 3:1 - 5:1 | <3:1 |
| **Payback Period** | <6 meses | 6-12 meses | >18 meses |
| **Gross Margin (SaaS)** | ≥80% | 60-80% | <60% |
| **Gross Margin (E-commerce)** | ≥50% | 40-50% | <40% |
| **Churn mensual (B2C SaaS)** | <3% | 3-7% | >7% |
| **Churn mensual (B2B SaaS)** | <1% | 1-3% | >3% |
| **CAC Payback (SaaS)** | <12 meses | 12-18 meses | >18 meses |
| **NRR (SaaS)** | ≥120% | 100-120% | <100% |

**Framework de decisión:**

| LTV/CAC | Payback | Recomendación |
|---------|---------|----------------|
| <1:1 | Cualquiera | **Detener**: Pierdes dinero en cada cliente. Corregir modelo o pivotar. |
| 1:1 - 2:1 | >12 meses | **Precaución**: Economics marginales. No escalar aún. |
| 2:1 - 3:1 | 6-12 meses | **Optimizar**: Economics aceptables. Mejorar antes de escalar. |
| 3:1 - 5:1 | <12 meses | **Escalar**: Buen economics. Invertir en crecimiento con rentabilidad. |
| >5:1 | <6 meses | **Escalar agresivamente**: Economics excelentes. Levantar capital, aumentar gasto. |

**Inputs requeridos:**
- **Datos de revenue**: Pricing, ARPU, AOV, frecuencia de transacción
- **Datos de costo**: Gasto sales/marketing, COGS, costos variables por cliente
- **Datos de retención**: Churn rate, curvas por cohorte, repeat purchase behavior
- **Datos de canal**: CAC por canal, LTV por segmento
- **Periodo temporal**: Definición de cohorte, rango histórico

**Outputs producidos:**
-`unit-economics-analysis.md`: Análisis completo con CAC, LTV, ratios, desgloses por cohorte
-`cohort-retention-table.csv`: Curvas de retención por cohorte
-`channel-profitability.csv`: CAC y LTV por canal de adquisición
-`recommendations.md`: Recomendaciones de pricing, canal y crecimiento