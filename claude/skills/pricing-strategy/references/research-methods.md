# Métodos de investigación de precios

## Medidor de sensibilidad de precios de Van Westendorp

La encuesta de Van Westendorp identifica el rango de precios aceptable para su producto.

### Las cuatro preguntas

Pregunte a cada encuestado:
1. "¿A qué precio consideraría que [el producto] es tan caro que no consideraría comprarlo?" (Demasiado caro)
2. "¿A qué precio consideraría que [el producto] tiene un precio tan bajo que cuestionaría su calidad?" (Demasiado barato)
3. "¿A qué precio consideraría que [el producto] está empezando a ser caro, pero aún así podría considerarlo?" (Caro/lado alto)
4. "¿A qué precio consideraría que [el producto] es una ganga, una excelente compra por su dinero?" (Barato/buen valor)

### Cómo analizar

1. Trazar distribuciones acumulativas para cada pregunta.
2. Encuentra las intersecciones:
   - **Punto de baratura marginal (PMC):** "Demasiado barato" cruza "Caro"
   - **Punto de Costo Marginal (PME):** "Demasiado caro" cruza "Barato"
   - **Punto de precio óptimo (OPP):** "Demasiado barato" cruza "Demasiado caro"
   - **Punto de precio de indiferencia (IDP):** "Caro" cruza "Barato"

**El rango de precios aceptable:** PMC a PME
**Zona de precios óptima:** Entre OPP e IDP

### Consejos para encuestas
- Se necesitan entre 100 y 300 encuestados para obtener datos fiables.
- Segmentar por persona (diferente disposición a pagar)
- Utilice descripciones de productos realistas.
- Considere agregar preguntas de intención de compra

### Salida de muestra

```
Price Sensitivity Analysis Results:
─────────────────────────────────
Point of Marginal Cheapness:  $29/mo
Optimal Price Point:          $49/mo
Indifference Price Point:     $59/mo
Point of Marginal Expensiveness: $79/mo

Recommended range: $49-59/mo
Current price: $39/mo (below optimal)
Opportunity: 25-50% price increase without significant demand impact
```---

## Análisis MaxDiff (mejor-peor escala)

MaxDiff identifica qué características valoran más los clientes, informando las decisiones de embalaje.

### Cómo funciona

1. Enumere entre 8 y 15 funciones que podría incluir
2. Muestre a los encuestados conjuntos de 4 o 5 funciones a la vez.
3. Pregunte: "¿Cuál es MÁS importante? ¿Cuál es MENOS importante?"
4. Repita en varios conjuntos hasta que se comparen todas las funciones.
5. El análisis estadístico produce puntuaciones de importancia.

### Ejemplo de pregunta de encuesta

```
Which feature is MOST important to you?
Which feature is LEAST important to you?

□ Unlimited projects
□ Custom branding
□ Priority support
□ API access
□ Advanced analytics
```

### Analizando resultados

Las funciones se clasifican por puntuación de utilidad:
- Alta utilidad = Imprescindible (incluir en el nivel base)
- Utilidad media = Diferenciador (uso para separación de niveles)
- Baja utilidad = Es bueno tenerlo (nivel premium o corte)

### Uso de MaxDiff para embalaje

| Puntuación de utilidad | Decisión de embalaje |
|---------------|-------------------|
| 20% superior | Incluir en todos los niveles (apuestas de mesa) |
| 20-50% | Uso para diferenciar niveles |
| 50-80% | Sólo niveles superiores |
| 20% inferior | Considere cortar o agregar un complemento premium |

---

## Disposición a pagar encuestas

**Método directo (simple pero sesgado):**
"¿Cuánto pagarías por [producto]?"

**Mejor: método Gabor-Granger:**
"¿Comprarías [producto] a [$X]?" (Sí/No)
Variar el precio entre los encuestados para construir la curva de demanda.

**Aún mejor: análisis conjunto:**
Mostrar paquetes de productos a diferentes precios
Los encuestados eligen la opción preferida
El análisis estadístico revela la sensibilidad al precio por característica

---

## Análisis de correlación valor-uso

### 1. Datos de uso del instrumento
Realice un seguimiento de cómo los clientes utilizan su producto:
- Frecuencia de uso de funciones
- Métricas de volumen (usuarios, registros, llamadas API)
- Métricas de resultados (ingresos generados, tiempo ahorrado)

### 2. Correlacionarse con el éxito del cliente
- ¿Qué patrones de uso predicen la retención?
- ¿Qué patrones de uso predicen la expansión?
- ¿Qué clientes pagan más y por qué?

### 3. Identificar umbrales de valor
- ¿A qué nivel de uso lo "entienden" los clientes?
- ¿A qué nivel de uso se expanden?
- ¿A qué nivel de uso debería aumentar el precio?

### Análisis de ejemplo

```
Usage-Value Correlation Analysis:
─────────────────────────────────
Segment: High-LTV customers (>$10k ARR)
Average monthly active users: 15
Average projects: 8
Average integrations: 4

Segment: Churned customers
Average monthly active users: 3
Average projects: 2
Average integrations: 0

Insight: Value correlates with team adoption (users)
        and depth of use (integrations)

Recommendation: Price per user, gate integrations to higher tiers
```