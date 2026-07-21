# Plantillas de economía de unidades financieras

Plantillas de inicio rápido para calcular CAC, LTV, margen de contribución y análisis de cohortes.

## Plantilla de definición de unidad

**Modelo de negocio**: [Suscripción / Transaccional / Marketplace / Freemium / Enterprise]

**Unidad de análisis**: [¿Qué estás midiendo?]
- Cliente (toda la relación)
- Suscripción (por período de suscripción)
- Transacción (por compra)
- SKU del producto (por producto vendido)
- Usuario (usuario activo)

**Periodo de tiempo**: [Cohortes mensuales/trimestrales/anuales]

**Segmentos** (si se analiza por segmento):
- [ ] Canal de adquisición (búsqueda paga, orgánica, referencia, etc.)
- [] Tipo de cliente (B2B vs B2C, SMB vs Enterprise)
- [] Geografía (EE.UU., UE, APAC)
- [] Nivel de producto (Gratis, Pro, Empresarial)

---

## Plantilla de cálculo CAC

**Costo de adquisición de clientes (CAC)** = Costos totales de adquisición ÷ Nuevos clientes adquiridos

### CAC completamente cargado

**Costos de ventas y marketing** (período: [Mes/Trimestre/Año])

| Categoría de costo | Cantidad | Notas |
|---------------|--------|-------|
| **Gasto en marketing** | $[X] | Anuncios pagos, marketing de contenidos, eventos, herramientas |
| **Salarios del equipo de ventas** | $[X] | Base + comisión + beneficios |
| **Herramientas y software de ventas** | $[X] | CRM, compromiso de ventas, análisis |
| **Salarios del equipo de marketing** | $[X] | Comercializadores, diseñadores, contratistas |
| **Asignación de gastos generales** | $[X] | % de costes de oficina y administración atribuibles a S&M |
| **Otro** | $[X] | [Especificar] |
| **Costo total de S&M** | **$[X]** | Suma de lo anterior |

**Nuevos clientes adquiridos** (mismo periodo): [N]

**CAC = $[Costo total] ÷ [N clientes] = $[CAC por cliente]**

### CAC por canal

Desglose el CAC por canal de adquisición para identificar los canales más/menos eficientes.

| Canal | Gasto en S&M | Nuevos clientes | CAC | Notas |
|---------|-----------|---------------|-----|-------|
| Búsqueda pagada | $[X] | [N] | $[X/N] | [Anuncios de Google, Bing] |
| Redes sociales pagadas | $[X] | [N] | $[X/N] | [Facebook, LinkedIn, etc.] |
| Contenido/SEO | $[X] | [N] | $[X/N] | [Orgánico, blog, herramientas SEO] |
| Referencia | $[X] | [N] | $[X/N] | [Costos del programa de recomendación] |
| Directo | $[X] | [N] | $[X/N] | [Escribiendo, reconocimiento de marca] |
| Otro | $[X] | [N] | $[X/N] | [Especificar] |
| **Totales** | **$[X]** | **[N]** | **$[CAC combinado]** | CAC combinado completamente cargado |

**Perspectiva**: [¿Qué canales son más o menos eficientes? ¿Dónde aumentar/disminuir el gasto?]

---

## Plantilla de cálculo de LTV

**Valor de por vida (LTV)** = Ingresos durante la vida del cliente × % de margen bruto

Elija el método de cálculo según el modelo de negocio:

### LTV (modelo de suscripción)

```
LTV = ARPU × Gross Margin % ÷ Monthly Churn Rate
```**Entradas**:
- **ARPU** (ingresos promedio por usuario): $[X]/mes
- **% de margen bruto**: [X]% (ingresos - COGS) ÷ ingresos
- **Tasa de abandono mensual**: [X]% (clientes perdidos ÷ clientes iniciales)

**Cálculo**:
- **Vida útil del cliente** = 1 ÷ Tasa de abandono = 1 ÷ [X]% = [Y] meses
- **LTV** = $[ARPU] × [Y meses] × [% de margen bruto] = **$[LTV]**

### LTV (modelo transaccional)

```
LTV = AOV × Purchase Frequency × Gross Margin % × Customer Lifetime (years)
```**Entradas**:
- **AOV** (Valor promedio del pedido): $[X] por transacción
- **Frecuencia de compra**: [Y] compras/año
- **Margen bruto %**: [Z]%
- **Vida útil del cliente**: [N] años

**Cálculo**:
- **Ingresos anuales por cliente** = $[AOV] × [Frecuencia] = $[X]/año
- **LTV** = $[Ingresos anuales] × [Años de vida útil] × [% de margen bruto] = **$[LTV]**

### LTV (Mercado/Plataforma)

```
LTV = GMV per user × Take Rate × Gross Margin % ÷ Churn Rate
```**Entradas**:
- **GMV por usuario** (mensual): $[X]
- **Tasa de aceptación**: [Y]% (% de GMV de la plataforma)
- **% de margen bruto**: [Z]% (después de costos variables)
- **Tasa de abandono mensual**: [C]%

**Cálculo**:
- **Ingresos mensuales por usuario** = $[GMV] × [Take Rate] = $[X]/mes
- **Vida útil del cliente** = 1 ÷ [Curn] = [Y] meses
- **LTV** = $[Revisión mensual] × [Vida útil] × [% de margen bruto] = **$[LTV]**

### LTV por cohorte (retención observada)

Más preciso: utilice datos de retención reales de cohortes.

**Tabla de retención de cohorte de ejemplo** (% de clientes restantes):

| Mes | Cohorte enero | Cohorte febrero | Cohorte marzo | Promedio |
|-------|------------|------------|------------|-----------------|
| 0 | 100% | 100% | 100% | 100% |
| 1 | 95% | 94% | 96% | 95% |
| 2 | 88% | 86% | 89% | 88% |
| 3 | 80% | 78% | 82% | 80% |
| 6 | 65% | 62% | - | 64% |
| 12 | 45% | - | - | 45% |

**Cálculo LTV**:
- Suma: Ingresos del mes 0 + (Retención del mes 1 × ingresos) + (Retención del mes 2 × ingresos) +...
- **LTV** = ARPU × Margen bruto × Σ(% de retención) = **$[X]**

---

## Plantilla de margen de contribución

**Margen de contribución %** = (Ingresos - Costos variables) ÷ Ingresos

### Ingresos y costos variables

| Artículo | Por unidad | Notas |
|------|----------|-------|
| **Ingresos** | $[X] | Cuota de suscripción / Precio de venta / Valor de transacción |
| **Costos variables:** | | (costos que escalan con cada unidad) |
| - Dientes | $[X] | Costo del producto, fabricación |
| - Alojamiento / Infraestructura | $[X] | Costos del servidor por usuario |
| - Procesamiento de pagos | $[X] | Tarifas de Stripe/PayPal (~2-3%) |
| - Soporte | $[X] | Tiempo de atención por cliente |
| - Envío | $[X] | Cumplimiento, entrega |
| - Otras variables | $[X] | [Especificar] |
| **Costos variables totales** | **$[Y]** | Suma |
| **Margen de contribución** | **$[X-Y]** | Ingresos - Costos variables |
| **Margen de contribución %** | **[(X-Y)/X]%** | Margen como % |

**Interpretación**:
- **Alto margen (>60%)**: Economía unitaria sólida, espacio para un CAC alto
- **Margen medio (40-60%)**: Aceptable, necesita una gestión disciplinada del CAC
- **Margen bajo (<40%)**: desafiante, requiere una adquisición muy eficiente o un LTV alto

**Palancas para mejorar el margen**:
- [] Aumentar el precio (mejorar los ingresos por unidad)
- [ ] Reducir COGS (negociar costos de proveedores, economías de escala)
- [ ] Optimizar la infraestructura (reducir los costos de alojamiento por usuario)
- [] Automatizar el soporte (reducir el tiempo de soporte manual)
- [ ] Negociar tarifas de pago (menores costos de procesamiento)

---

## Plantilla de análisis de cohorte

Realice un seguimiento de la retención, el LTV y la recuperación de la inversión por cohorte de adquisición de clientes (mes, canal, segmento).

### Tabla de cohorte de retención

| Cohorte (mes de adquisición) | M0 | M1 | M2 | M3 | M6 | M12 | TVL | CAC | LTV/CAC | Recuperación (meses) |
|---------------------------------|----|----|----|----|----|----|-----|-----|---------|------------------|
| enero de 2024 | 100% | 92% | 84% | 78% | 62% | 42% | $1,200 | $300 | 4.0 | 4.5 |
| febrero de 2024 | 100% | 90% | 81% | 75% | 60% | - | $1,150 | $320 | 3.6 | 5.0 |
| marzo de 2024 | 100% | 93% | 86% | 80% | 65% | - | $1,300 | $280 | 4.6 | 4.0 |
| abril de 2024 | 100% | 91% | 83% | 77% | - | - | $1,100 | $350 | 3.1 | 5.5 |
| **Promedio** | **100%** | **91,5%** | **83,5%** | **77,5%** | **62,3%** | **42%** | **$1,188** | **$313** | **3,8** | **4,8** |

**Perspectivas**:
- [¿Las cohortes más nuevas tienen un rendimiento mejor o peor que las cohortes más antiguas?]
- [¿Qué cohortes tienen mejor/peor retención?]
- [¿Está mejorando el LTV con el tiempo?]
- [¿El CAC está aumentando o disminuyendo?]

### Cohorte por canal

| Canal | # Clientes | LTV promedio | CAC promedio | LTV/CAC | Retención de 12M | Recuperación (meses) |
|---------|-------------|---------|---------|---------|---------------|------------------|
| Búsqueda pagada | 500 | $800 | $250 | 3.2 | 35% | 6.0 |
| Orgánico | 300 | $1,500 | $150 | 10.0 | 55% | 3.0 |
| Referencia | 200 | $1,800 | $100 | 18.0 | 60% | 2.5 |
| Redes sociales pagadas | 400 | $700 | $300 | 2.3 | 30% | 7.0 |
| **Totales** | **1.400** | **$1,050** | **$225** | **4,7** | **42%** | **5.0** |

**Perspectivas**:
- [Mejores canales: referencia (LTV alto, CAC bajo, recuperación rápida, retención alta)]
- [Peores canales: redes sociales pagadas (LTV bajo, CAC alto, recuperación lenta, retención baja)]
- [Acción: aumentar la inversión en referencias, reducir o pausar las redes sociales pagas]

---

## Plantilla de interpretación

### Análisis del ratio LTV/CAC

**Su LTV/CAC**: [X:1]| Gama | Evaluación | Acción |
|-------|------------|--------|
| <1:1 | **Insostenible**: Perder dinero con cada cliente | Detener el crecimiento, arreglar el modelo o pivotar |
| 1:1 - 2:1 | **Marginal**: Apenas rentable | No escale todavía, mejore la retención o reduzca el CAC |
| 2:1 - 3:1 | **Aceptable**: Trabajo de economía unitaria | Optimizar antes de escalar |
| 3:1 - 5:1 | **Bueno**: Puede crecer de manera rentable | Escalar el gasto en marketing |
| >5:1 | **Excelente**: Economía sólida | Escala agresiva, reunir capital |

**Su evaluación**: [Basado en la proporción anterior]

### Análisis del período de recuperación

**Su período de recuperación**: [X] meses

| Gama | Evaluación | Impacto en efectivo |
|-------|------------|-------------|
| <6 meses | **Excelente**: Rápida recuperación del capital | Puede reinvertir rápidamente e impulsar el crecimiento |
| 6-12 meses | **Bueno**: Recuperación razonable | Necesidades de efectivo manejables |
| 12-18 meses | **Aceptable**: Recuperación más lenta | Necesita capital paciente |
| >18 meses | **Desafiante**: Recuperación a largo plazo | Alto consumo de efectivo y riesgoso |

**Su evaluación**: [Basado en la recuperación anterior]

### Marco de decisión combinado

| Tus métricas | Recomendación |
|----------------------|----------------|
| LTV/CAC: [X:1] | [Evaluación del cuadro anterior] |
| Recuperación de la inversión: [Y] meses | [Evaluación del cuadro anterior] |
| Margen bruto: [Z]% | [Bueno ≥60% (SaaS) / ≥40% (comercio electrónico), o necesita mejorar] |
| **En general** | **[Detener / Optimizar / Escalar / Escalar agresivamente]** |

### Recomendaciones

**Precio**:
- [ ] [Aumentar precio para mejorar margen y LTV]
- [ ] [Agregar nivel premium para ventas adicionales]
- [ ] [Reducir el precio para aumentar la conversión]
- [ ] [No se necesitan cambios]

**Canales**:
- [ ] [Aumentar gasto en: [canales con mejor LTV/CAC]]
- [ ] [Reducir o pausar el gasto en: [canales con LTV/CAC deficiente]]
- [ ] [Probar nuevos canales: [sugerencias]]

**Retención**:
- [ ] [Mejorar la incorporación para reducir la deserción temprana]
- [] [Agregar funciones para aumentar la participación]
- [ ] [Programa de éxito del cliente para clientes de alto valor]
- [ ] [Programa de fidelización/recomendación para aumentar la repetición]

**Crecimiento**:
- [ ] [Escale agresivamente: la economía apoya el crecimiento]
- [ ] [Optimizar primero: mejorar las métricas antes de escalar]
- [ ] [Pausar el crecimiento: arreglar la economía unitaria]

**Efectivo y recaudación de fondos**:
- [ ] [Recaudar financiación para impulsar el crecimiento (si LTV/CAC >3:1 y recuperación <12 meses)]
- [ ] [Centrarse en la rentabilidad (si LTV/CAC 2-3:1 y recuperación de la inversión 12-18 meses)]
- [ ] [Reducir el consumo (si LTV/CAC <2:1)]

---

## Ejemplo rápido: inicio de SaaS

**Unidad**: Cliente (suscripción)

**CAC**: marketing de 20.000 dólares, 100 clientes → **CAC de 200 dólares**

**LTV**:
-ARPU: $100/mes
- Margen Bruto: 80%
- Rotación mensual: 5% → Vida útil = 1/0,05 = 20 meses
- **LTV** = $100 × 20 × 80% = **$1,600**

**Métricas**:
- **LTV/CAC**: $1,600 / $200 = **8:1** ✓ Excelente
- **Reembolso**: $200 ÷ ($100 × 80%) = **2,5 meses** ✓ Excelente
- **Margen bruto**: **80%** ✓ Fuerte

**Recomendación**: **Escala agresiva**. La economía es excelente (LTV/CAC de 8:1, recuperación de la inversión en 2,5 meses). Recaudar capital, aumentar el gasto en marketing entre 2 y 3 veces, contratar un equipo de ventas y expandirse a nuevos canales.

---

## Errores comunes que se deben evitar

1. **No utilizar datos de cohorte**: no promedie la retención en todos los períodos de tiempo. Las cohortes recientes pueden comportarse de manera diferente.
2. **Excluyendo costos**: No olvide salarios de ventas, soporte, tarifas de pago, reembolsos.
3. **Vanity LTV**: No proyecte LTV de 5 años con 1 mes de datos. Utilice únicamente retención observada.
4. **Ignorar canales**: no mezcle CAC en todos los canales. Analiza cada uno por separado.
5. **Costos fijos versus costos variables**: no incluya los costos fijos (ingeniería, alquiler) en el margen de contribución. Solo costos variables que aumentan con las unidades.
6. **Sin actualizar**: Vuelva a calcular trimestralmente. La economía unitaria cambia a medida que se escala, el mercado cambia y la competencia se intensifica.