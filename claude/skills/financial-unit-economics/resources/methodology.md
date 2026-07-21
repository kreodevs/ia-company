# Metodología de la economía de la unidad financiera

Técnicas avanzadas de cálculo, análisis y optimización de la economía unitaria.

## Tabla de contenidos
1. [Costo de adquisición de clientes (CAC)](#1-costo-adquisición-de-clientes-cac)
2. [Valor de por vida (LTV)](#2-valor-de por vida-ltv)
3. [Análisis del margen de contribución] (#3-análisis-del-margen-de-contribución)
4. [Análisis de cohorte](#4-análisis de cohorte)
5. [Interpretación de la economía unitaria](#5-interpretación-de-la-economía-unitaria)
6. [Temas avanzados](#6-temas-avanzados)

---

## 1. Costo de adquisición de clientes (CAC)

### Componentes CAC completamente cargados

**Fórmula**: CAC = (Costos totales de S&M) ÷ Nuevos clientes adquiridos

**Costos de ventas y marketing (S&M) a incluir**:
- **Gasto en marketing**: anuncios pagados (Google, Facebook, LinkedIn), marketing de contenidos, herramientas SEO, eventos, patrocinios.
- **Compensación del equipo de ventas**: Salarios base, comisiones, bonos, beneficios, impuestos
- **Remuneración del equipo de marketing**: especialistas en marketing, diseñadores, escritores, contratistas
- **Herramientas de ventas**: CRM (Salesforce, HubSpot), participación de ventas (Outreach, SalesLoft), análisis
- **Herramientas de marketing**: Automatización de marketing (Marketo, Pardot), analíticas (Google Analytics, Mixpanel), plataformas publicitarias
- **Asignación de gastos generales**: parte del espacio de oficina, soporte administrativo, costos de TI atribuibles a los equipos S&M
- **Honorarios de agencia/consultor**: Agencias externas, autónomos, consultores de marketing o ventas.

**Qué NO incluir** (no costos de adquisición):
- Ingeniería/desarrollo de producto (construir el producto, no adquirir clientes)
- Éxito/soporte del cliente (retener clientes, no adquirir)
- General y administrativo (no directamente relacionado con la adquisición)

### Período de tiempo para CAC

**Haga coincidir los costos con el período de ingresos**: si calcula el CAC mensual, utilice los costos mensuales de S&M y los nuevos clientes mensuales.

**Efecto de retraso**: el CAC gastado hoy puede generar clientes el próximo mes. Ajustar si hay un retraso significativo (por ejemplo, ciclos de ventas largos). Utilice un retraso de 1 a 3 meses para las ventas empresariales.

**Ejemplo**:
- Mes 1: gasto en S&M de $50 000, 100 clientes adquiridos → CAC = $500
- Pero si los clientes que gastaron en el mes 1 provinieron de anuncios publicados en el mes 0, ajuste en consecuencia.

### CAC por canal

Desglosar el CAC por canal revela qué canales son eficientes e ineficientes.

**Método**: realice un seguimiento del gasto y de los nuevos clientes por canal.

**Ejemplo**:

| Canal | Gasto en S&M | Nuevos clientes | CAC | TVL | LTV/CAC |
|---------|-----------|---------------|-----|-----|---------|
| Búsqueda pagada | $30 mil | 100 | $300 | $900 | 3.0 |
| Orgánico | $10 mil | 100 | $100 | $1,200 | 12.0 |
| Referencia | 5 mil dólares | 50 | $100 | $1,500 | 15.0 |
| Redes sociales pagadas | $20 mil | 50 | $400 | $700 | 1,75 |

**Perspectiva**: Los productos orgánicos y de referencia tienen mejores resultados económicos (CAC bajo, LTV alto). Paid Social no es rentable (LTV/CAC <2:1). Acción: aumentar la inversión orgánica/referida, suspender las redes sociales pagas.

### Tendencias del CAC a lo largo del tiempo

**Monitorear las tendencias del CAC**: ¿El CAC aumenta o disminuye con el tiempo?

**Causas del aumento del CAC**:
- Saturación del mercado (canales fáciles agotados)
- Mayor competencia (los competidores aumentan los costos publicitarios)
- Debilitamiento del ajuste producto-mercado (más difícil conseguir clientes)
- Gasto ineficiente (orientación deficiente, tasas de conversión bajas)

**Causas de la caída del CAC**:
- Tasas de conversión mejoradas (mejores páginas de destino, mensajes)
- Conocimiento de la marca (más tráfico directo/orgánico)
- Crecimiento impulsado por el producto (viralidad, boca a boca)
- Optimización de canales (centrándose en los canales de mejor rendimiento)

---

## 2. Valor de por vida (LTV)

### Métodos de cálculo de LTV

**Método 1: LTV simple (suscripción)**

```
LTV = ARPU × Gross Margin % ÷ Monthly Churn Rate
```**Cuándo usarlo**: SaaS en etapa inicial, datos limitados, necesita una estimación rápida.

**Ejemplo**:
- ARPU = $50/mes
- Margen Bruto = 80%
- Rotación mensual = 5%
- LTV = $50 × 80% ÷ 0,05 = $50 × 80% × 20 meses = $800

**Método 2: LTV basado en cohortes (más preciso)**

Realice un seguimiento de la retención real por cohorte y sume los ingresos durante los períodos observados.

```
LTV = ARPU × Gross Margin × Σ(Retention at month i)
```**Cohorte de ejemplo** (adquirida en enero de 2024):

| Mes | % de retención | Ingresos (ARPU × Retención) | Acumulado |
|-------|-------------|----------------------|------------|
| 0 | 100% | $50 × 1,0 = $50 | $50 |
| 1 | 95% | $50 × 0,95 = $47,50 | $97,50 |
| 2 | 88% | $50 × 0,88 = $44 | $141,50 |
| 3 | 80% | $50 × 0,80 = $40 | $181,50 |
| 6 | 60% | $50 × 0,60 = $30 | ~$280 |
| 12 | 40% | $50 × 0,40 = $20 | ~$450 |

LTV = $450 × 80% margen bruto = **$360**

Nota: Esto es más conservador que el LTV simple ($800) porque la deserción anticipada es mayor que el promedio.

**Método 3: LTV predictivo (aprendizaje automático)**

Utilice datos históricos para predecir patrones futuros de retención y gasto. Enfoque avanzado para empresas con grandes conjuntos de datos.

**Entradas**: Atributos del cliente (demografía, comportamiento, canal de adquisición), datos históricos de compra/abandono.

**Modelo**: el modelo de regresión, análisis de supervivencia o ML predice el LTV para cada segmento de clientes.

### LTV para diferentes modelos de negocio

**Transaccional (Comercio electrónico)**:

```
LTV = AOV × Purchase Frequency × Gross Margin % × Customer Lifetime (years)
```**Ejemplo**:
- AOV = $100
- Compras/año = 3
- Margen Bruto = 50%
- Vida útil = 2 años
- LTV = $100 × 3 × 50% × 2 = $300

**Mercado**:

```
LTV = GMV per user × Take Rate × Gross Margin % ÷ Churn Rate
```**Ejemplo** (viaje compartido):
- GMV mensual por pasajero = $200 (viajes totales)
- Tasa de toma = 25%
- Margen bruto = 80% (después del procesamiento del pago)
- Rotación mensual = 10%
- Vida útil = 1 ÷ 0,10 = 10 meses
- Ingresos mensuales = $200 × 25% = $50
- LTV = $50 × 10 meses × 80% = $400

**Gratis**:

```
Blended LTV = (Free-to-Paid Conversion % × Paid User LTV) - (Free User Costs × Avg Free User Lifetime)
```**Ejemplo**:
- 100 usuarios gratuitos, 5% convertido a pago
- LTV pagado = $1,000
- Costo de usuario gratuito = $2/mes (alojamiento), vida útil promedio de 6 meses
- LTV combinado = (0,05 × $1000) - ($2 × 6) = $50 - $12 = $38 por usuario gratuito

### Mejorando el LTV

**Palancas para aumentar el LTV**:

1. **Reducir la deserción**: mejorar la incorporación, el compromiso con el producto y el éxito del cliente. Reducción del 1% de abandono → aumento del LTV del 10-25%.
2. **Aumentar el ARPU**: ventas adicionales, ventas cruzadas, niveles premium, precios basados ​​en el uso.
3. **Mejorar el margen bruto**: Reducir los COGS, optimizar la infraestructura, negociar mejores tarifas.
4. **Extender la vida útil**: contratos a largo plazo, facturación anual (bloquea a los clientes).

**Ejemplo de impacto** (SaaS):
- Actual: ARPU $50, Rotación 5%, Margen 80% → LTV = $800
- Reducir la deserción al 4%: LTV = $50 × 80% ÷ 0,04 = $1000 (+25%)
- Aumentar el ARPU a $60: LTV = $60 × 80% ÷ 0,05 = $960 (+20%)
- Ambos: LTV = $60 × 80% ÷ 0,04 = $1200 (+50%)

---

## 3. Análisis del margen de contribución

### Fórmula de margen de contribución

```
Contribution Margin = Revenue - Variable Costs
Contribution Margin % = (Revenue - Variable Costs) ÷ Revenue
```**Costos variables** (escala con cada unidad):
- COGS (costo de bienes vendidos)
- Hosting/infraestructura por usuario
- Tarifas de procesamiento de pagos (2-3% de los ingresos)
- Atención al cliente (tiempo por cliente)
- Envío/cumplimiento
- Costos específicos de la transacción

**Costos fijos** (NO incluyen):
- Salarios de ingeniería (construir producto una vez)
- Alquiler, servicios públicos
- Equipos de administración, recursos humanos y finanzas.

### Margen de contribución por modelo de negocio

**SaaS**:
- Ingresos: suscripción de $100/mes
- Costos variables: $15 hosting + $3 honorarios de pago = $18
- Margen de contribución: $100 - $18 = $82
- % de margen: 82%

**Comercio electrónico**:
- Ingresos: $80 venta de producto
- Costos variables: $30 COGS + $5 de envío + $2,40 de gastos de pago = $37,40
- Margen de contribución: $80 - $37,40 = $42,60
- Margen %: 53%

**Mercado**:
- GMV: transacción de $200
- Tasa de adquisición: 20% → Ingresos = $40
- Costos variables: $2 tarifas de pago + $3 de soporte = $5
- Margen de contribución: $40 - $5 = $35
- % de margen: 87,5% (de los ingresos de la plataforma)

### Mejora del margen de contribución

**Palancas**:
1. **Aumentar precios**: Aumenta directamente los ingresos por unidad.
2. **Reducir COGS**: Negociar costos de proveedores, economías de escala, integración vertical.
3. **Optimizar la infraestructura**: Alojamiento del tamaño adecuado, utilizar proveedores más baratos, optimizar el uso.
4. **Automatizar el soporte**: el autoservicio, los chatbots y la base de conocimientos reducen el tiempo de soporte manual.
5. **Negociar tarifas**: tasas de procesamiento de pagos más bajas (descuentos por volumen), reducir los costos de transacción.

**Ejemplo** (Comercio electrónico):
- Actual: Ingresos $80, COGS $30, Margen 53%
- Negociar COGS a $25: Margen = ($80 - $32,40) / $80 = 59,5% (+6,5pp)
- Aumentar precio a $90: Margen = ($90 - $37.65) / $90 = 58% (+5pp)
- Ambos: Margen = ($90 - $32,65) / $90 = 63,7% (+10,7pp)

---

## 4. Análisis de cohorte

### Por qué es importante el análisis de cohortes

**Problema con los promedios**: la combinación de todos los clientes oculta tendencias importantes. Los primeros clientes pueden tener un comportamiento diferente al de los clientes recientes.

**Análisis de cohorte**: realice un seguimiento de los clientes agrupados por período de adquisición (mes, trimestre) para ver cómo evolucionan las métricas.

**Beneficios**:
- Detectar tendencias que mejoran o empeoran
- Comparar canales/segmentos
- Previsión del LTV futuro en función del comportamiento observado.

### Creación de una tabla de cohortes de retención

**Estructura**: Filas = cohortes (mes de adquisición), Columnas = meses desde la adquisición.

**Ejemplo**:

| Cohorte | M0 | M1 | M2 | M3 | M6 | M12 |
|--------|----|----|----|----|----|----|
| enero de 2024 | 100% | 92% | 84% | 78% | 62% | 42% |
| febrero de 2024 | 100% | 90% | 81% | 75% | 60% | - |
| marzo de 2024 | 100% | 93% | 86% | 80% | 65% | - |
| abril de 2024 | 100% | 91% | 83% | 77% | - | - |

**Perspectivas**:
- **Mejora de la retención**: cohorte de marzo (93% de retención M1) > cohorte de enero (92%). Mejoras del producto funcionando.
- **Retención estable a largo plazo**: ~60 % en M6 en todas las cohortes. LTV predecible.

### Calcular el LTV a partir de cohortes

**Método**: suma de los ingresos en cada período, ponderados por la retención.

**Ejemplo** (cohorte de enero de 2024, ARPU $50, margen 80%):

LTV = $50 × 80% × (1,0 + 0,92 + 0,84 + 0,78 + ... + 0,42 en M12)

Suma aproximada del % de retención = ~9,5 meses equivalente

LTV = $50 × 80% × 9,5 = **$380**

**Más preciso**: sume todos los meses observados y extrapole la cola en función de la estabilización de la tasa de abandono.

### Análisis de cohorte por canal

Compare la retención y el LTV en todos los canales de adquisición.

**Ejemplo**:

| Canal | M0 | M1 | M3 | M6 | M12 | TVL |
|---------|----|----|----|----|-----|-----|
| Orgánico | 100% | 95% | 85% | 70% | 55% | $450 |
| Búsqueda pagada | 100% | 88% | 75% | 55% | 35% | $300 |
| Referencia | 100% | 97% | 90% | 75% | 60% | $500 |

**Información**: La recomendación tiene la mejor retención y LTV. La búsqueda pagada tiene la peor retención (alta rotación temprana). Concéntrese en el crecimiento de las referencias.

### Tendencias a monitorear

1. **Forma de la curva de retención**: ¿Se estabiliza (se aplana) la deserción después de unos meses o continúa acelerándose?
2. **Mejora de la cohorte**: ¿Las cohortes más nuevas se retienen mejor que las cohortes más antiguas? (Las mejoras del producto funcionan)
3. **Diferencias de canales**: ¿Qué canales generan clientes más fijos?
4. **Tiempo de recuperación**: ¿Cuánto tiempo pasará hasta que los ingresos acumulados (× margen) > CAC?

---

## 5. Interpretación de la economía unitaria

### Puntos de referencia de la relación LTV/CAC| Proporción | Evaluación | Recomendación |
|-------|------------|----------------|
| <1:1 | **Insostenible** | Perder dinero con cada cliente. Arreglar o pivotar. |
| 1-2:1 | **Marginales** | Apenas rentable. No escales todavía. |
| 2-3:1 | **Aceptable** | Trabajo de economía unitaria. Optimice antes de escalar. |
| 3-5:1 | **Bueno** | Puede crecer de manera rentable. Escalar el gasto en marketing. |
| >5:1 | **Excelente** | Economía fuerte. Crecimiento agresivo, reunir capital. |

**Por qué el objetivo es 3:1**:
- 1× cubre CAC
- 1× cubre gastos operativos (I+D, G&A, éxito del cliente)
- 1× beneficio

**El contexto importa**:
- **Periodo de recuperación**: 10:1 LTV/CAC con recuperación de 24 meses es peor que 4:1 con recuperación de 6 meses (tensión de efectivo).
- **Tamaño del mercado**: LTV/CAC bajo es aceptable si el mercado es enorme (aún puede generar grandes negocios).
- **Etapa**: Las empresas emergentes en etapa temprana pueden aceptar 2-3:1 mientras encuentran el ajuste del producto al mercado. La etapa de crecimiento debe apuntar a >3:1.

### Puntos de referencia del período de recuperación

| Recuperación de la inversión | Evaluación | Impacto en efectivo |
|---------|------------|-------------|
| <6 meses | **Excelente** | Puede reinvertir rápidamente, impulsar un crecimiento rápido. |
| 6-12 meses | **Bueno** | Manejable, estándar para SaaS. |
| 12-18 meses | **Aceptable** | Necesita capital paciente, crecimiento más lento. |
| >18 meses | **Desafiante** | Gran gasto de efectivo, riesgoso. Difícil de escalar. |

**Por qué es importante la recuperación de la inversión**: Recuperación corta = recuperación rápida del capital = puede reinvertir en crecimiento sin necesidad de financiación externa.

**Ejemplo**:
- Empresa A: LTV/CAC 8:1, Payback 18 meses → Alto consumo de efectivo, lenta reinversión a pesar del buen ratio.
- Empresa B: LTV/CAC 4:1, Payback 6 meses → Reinversión más rápida, puede escalar de forma más agresiva.

### Métricas de eficiencia de efectivo

**Recuperación de CAC (específico de SaaS)**:

```
CAC Payback (months) = S&M Spend ÷ (New ARR × Gross Margin %)
```**Ejemplo**:
- Gasto en S&M del primer trimestre: 100.000 dólares
- Nuevo ARR agregado: $120k
- Margen Bruto: 80%
- Recuperación de CAC = $100 mil ÷ ($120 mil × 80%) = 1,04 trimestres = ~3,1 meses

**Eficiencia en ventas (Número mágico)**:

```
Sales Efficiency = (New ARR in Quarter) ÷ (S&M Spend in Prior Quarter)
```**Puntos de referencia**:
- <0,75: Crecimiento ineficiente y no rentable
- 0,75-1,0: Aceptable
- >1,0: Crecimiento eficiente y rentable
- >1,5: Altamente eficiente

**Ejemplo**:
- Gasto en S&M del primer trimestre: 200.000 dólares
- Nuevo ARR del segundo trimestre: 180.000 dólares
- Eficiencia de ventas = $180k / $200k = 0,9 (aceptable)

---

## 6. Temas avanzados

### Retención de ingresos netos (NRR)

**Fórmula**:

```
NRR = (Starting ARR + Expansion - Contraction - Churn) ÷ Starting ARR
```**Componentes**:
- **ARR inicial**: Ingresos de la cohorte al inicio del período
- **Expansión**: ventas adicionales, ventas cruzadas, crecimiento del uso
- **Contracción**: Degradaciones, uso reducido
- **Curn**: Clientes que se van

**Ejemplo**:
- ARR inicial (cohorte de enero de 2024): $ 100 000
- Expansión (upsells): +$25k
- Contracción (rebajas): -$5k
- Rotación (clientes perdidos): -$10k
- ARR final: $100k + $25k - $5k - $10k = $110k
- NRR = 110 000 $ / 100 000 $ = **110 %**

**Puntos de referencia**:
- <100%: Reducción de los ingresos de los clientes existentes (malo)
- 100-110%: crecimiento pequeño y estable debido a la expansión
- 110-120%: buena y fuerte expansión
- >120%: Excelente, los ingresos crecen incluso sin nuevos clientes

**Por qué es importante el NRR**: >100 % de NRR significa que puede aumentar los ingresos sin agregar nuevos clientes. Potente efecto compuesto.

### Economía unitaria para diferentes etapas

**Etapa inicial (encontrar la adecuación del producto al mercado)**:
- Objetivo: LTV/CAC >2:1
- Enfoque: encontrar canales repetibles y escalables
- Aceptable: CAC más alto, recuperación de la inversión más prolongada durante la iteración

**Etapa de crecimiento (escalado)**:
- Objetivo: LTV/CAC >3:1, Payback <12 meses
- Enfoque: optimizar canales, mejorar la retención
- Necesidad: Crecimiento eficiente para justificar el aumento del gasto.

**Etapa tardía (madura)**:
- Objetivo: LTV/CAC >4:1, Payback <6 meses, NRR >110%
- Enfoque: Rentabilidad, expansión de márgenes
- Optimizar: cada canal, reducir CAC, maximizar LTV

### Economía unitaria multiproducto

**Desafío**: Los clientes pueden comprar varios productos. ¿Cómo atribuir valor?

**Enfoques**:

1. **LTV a nivel de cliente**: suma los ingresos de todos los productos comprados por el cliente.
   - LTV = Ingresos totales del cliente × Margen

2. **LTV a nivel de producto**: realice un seguimiento del LTV por separado por producto.
   - Útil si los productos tienen diferentes márgenes y patrones de retención.

3. **LTV mezclado**: Peso por mezcla de productos.
   - LTV combinado = (% Producto A × LTV_A) + (% Producto B × LTV_B) + ...

**Ejemplo** (SaaS con dos niveles):
- 70% de suscripción a Básico ($50/mes, LTV $800)
- 30 % de suscripción a Pro ($150/mes, LTV $2400)
- LTV combinado = (0,7 × $800) + (0,3 × $2400) = $560 + $720 = $1280

### Análisis de sensibilidad

Pruebe cómo los cambios en los supuestos impactan la economía unitaria.

**Variables a probar**:
- Tasa de abandono (+/- 1-2%)
- ARPU (+/- 10-20%)
- CAC (+/- 10-20%)
- Margen bruto (+/- 5-10%)

**Ejemplo**:
- Caso base: LTV $1000, CAC $250, relación 4:1
- La rotación aumenta 5% → 4%: LTV cae a $800, relación 3.2:1 (aún aceptable)
- La rotación aumenta 5% → 6%: LTV cae a $667, relación 2,7:1 (marginal)
- CAC aumenta un 20% a $300: la relación cae a 3,3:1 (aún es buena)

**Perspectiva**: Las economías unitarias son sensibles a la deserción. Los pequeños aumentos en la rotación perjudican significativamente el LTV.

### Dinámica competitiva

**CAC aumenta con el tiempo** debido a:
- Saturación del mercado (clientes más fáciles ya adquiridos)
- Competencia (guerras de ofertas en anuncios, mayores costos de ventas/marketing)
- Agotamiento del canal (rendimientos decrecientes en los canales)

**Estrategias**:
1. **Construir fosos**: la marca, los efectos de red y los costos de cambio reducen la dependencia de la adquisición paga.
2. **Crecimiento impulsado por el producto**: la viralidad, el boca a boca y el crecimiento orgánico reducen el CAC.
3. **Ampliar TAM**: Ingrese a nuevos mercados y segmentos para acceder a clientes sin explotar.
4. **Mejorar la conversión**: mejores productos, mensajes y procesos de ventas → más clientes con el mismo gasto.

**Ejemplo** (panorama competitivo):
- Año 1: CAC $200, LTV $1000, relación 5:1
- Año 3: CAC $350 (competencia), LTV $1,200 (mejoras de retención), Ratio 3.4:1
- Año 5: CAC $500, LTV $1,500, Ratio 3:1

**Perspectiva**: Incluso con el aumento del CAC, la mejora del LTV (retención, ventas adicionales) mantiene una proporción saludable.

## Conclusiones clave

1. **CAC debe estar completamente cargado**: incluya todos los costos de S&M (salarios, herramientas, gastos generales). Desglosar por canal.
2. **LTV requiere datos de cohorte**: realice un seguimiento de la retención por cohorte y extrapola de forma conservadora. No confíes en los promedios.
3. **El margen de contribución establece un límite máximo**: Se necesita un margen alto (>60% SaaS, >40% comercio electrónico) para una economía viable.
4. **Tanto la relación como la recuperación son importantes**: relación 5:1 con recuperación de 24 meses < 3:1 con recuperación de 6 meses (eficiencia de efectivo).
5. **Retención > Adquisición**: Las pequeñas mejoras en la rotación tienen un impacto exponencial en el LTV. Priorizar la retención.
6. **Análisis a nivel de canal**: las métricas combinadas ocultan la verdad. Analice CAC/LTV por canal y optimice el gasto en consecuencia.
7. **Actualización trimestral**: La economía unitaria evoluciona con la escala, los cambios del mercado y la competencia. Vuelva a calcular periódicamente.