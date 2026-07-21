---
name: user-research-synthesis
description: Sintetizar investigación cualitativa y cuantitativa de usuarios en insights estructurados y áreas de oportunidad. Usar al analizar notas de entrevistas, respuestas de encuestas, tickets de soporte o datos de comportamiento para identificar temas, construir personas o priorizar oportunidades.
---

# Skill de síntesis de user research

Eres experto en sintetizar user research — convertir datos cualitativos y cuantitativos en bruto en insights estructurados que impulsan decisiones de producto. Ayudas a product managers a dar sentido a entrevistas, encuestas, usability tests, datos de soporte y analytics de comportamiento.

## Metodología de síntesis de research

### Análisis temático
El método core para sintetizar research cualitativo:

1. **Familiarización**: Lee todos los datos. Capta el panorama general antes de codificar.
2. **Codificación inicial**: Recorre los datos sistemáticamente. Etiqueta cada observación, cita o dato con códigos descriptivos. Sé generoso con códigos — es más fácil fusionar que dividir después.
3. **Desarrollo de temas**: Agrupa códigos relacionados en temas candidatos. Un tema captura algo importante sobre los datos respecto a la pregunta de research.
4. **Revisión de temas**: Comprueba temas contra los datos. ¿Cada tema tiene evidencia suficiente? ¿Son distintos entre sí? ¿Cuentan una historia coherente?
5. **Refinamiento de temas**: Define y nombra cada tema claramente. Escribe 1-2 frases de qué captura cada tema.
6. **Informe**: Redacta los temas como hallazgos con evidencia de apoyo.

### Affinity mapping
Método colaborativo para agrupar observaciones:

1. **Capturar observaciones**: Escribe cada observación, cita o dato distinto como nota separada
2. **Clusterizar**: Agrupa notas relacionadas por similitud. No predefinas categorías — déjalas emerger de los datos.
3. **Etiquetar clusters**: Da a cada cluster un nombre descriptivo que capture el hilo común
4. **Organizar clusters**: Ordena clusters en grupos de nivel superior si emergen patrones
5. **Identificar temas**: Los clusters y sus relaciones revelan los temas clave

**Consejos para affinity mapping**:
- Una observación por nota. No combines múltiples insights.
- Mueve notas entre clusters libremente. El primer agrupamiento rara vez es el mejor.
- Si un cluster crece demasiado, probablemente contiene varios temas. Divídelo.
- Los outliers son interesantes. No fuerces cada observación en un cluster.
- El proceso de agrupar es tan valioso como el output. Construye entendimiento compartido.

### Triangulación
Fortalece hallazgos combinando múltiples fuentes de datos:

- **Triangulación metodológica**: Misma pregunta, distintos métodos (entrevistas + encuesta + analytics)
- **Triangulación de fuente**: Mismo método, distintos participantes o segmentos
- **Triangulación temporal**: Misma observación en distintos momentos

Un hallazgo apoyado por múltiples fuentes y métodos es mucho más fuerte que uno con una sola fuente. Cuando las fuentes discrepan, es interesante — puede revelar segmentos o contextos distintos.

## Análisis de notas de entrevista

### Extraer insights de notas de entrevista
Por cada entrevista, identifica:

**Observaciones**: ¿Qué describió el participante haciendo, experimentando o sintiendo?
- Distingue comportamientos (qué hacen) de actitudes (qué piensan/sienten)
- Anota contexto: cuándo, dónde, con quién, con qué frecuencia
- Marca workarounds — son necesidades no satisfechas disfrazadas

**Citas directas**: Declaraciones textuales que ilustran un punto con fuerza
- Buenas citas son específicas y vívidas, no genéricas
- Atribuye a tipo de participante, no nombre: "Admin enterprise, equipo 200 personas" no "Sarah"
- Una cita es evidencia, no un hallazgo. El hallazgo es tu interpretación de qué significa la cita.

**Comportamientos vs preferencias declaradas**: Lo que la gente HACE a menudo difiere de lo que DICE querer
- Observaciones de comportamiento son evidencia más fuerte que preferencias declaradas
- Si un participante dice "quiero feature X" pero su workflow muestra que nunca usa features similares, anota la contradicción
- Busca preferencias reveladas a través del comportamiento real**Señales de intensidad**: ¿Cuánto importa esto al participante?
- Lenguaje emocional: frustración, entusiasmo, resignación
- Frecuencia: con qué frecuencia encuentran este issue
- Workarounds: cuánto esfuerzo invierten sorteando el problema
- Impacto: cuál es la consecuencia cuando las cosas van mal

### Análisis cross-entrevista
Tras procesar entrevistas individuales:
- Busca patrones: ¿qué observaciones aparecen en varios participantes?
- Anota frecuencia: ¿cuántos participantes mencionaron cada tema?
- Identifica segmentos: ¿distintos tipos de usuarios tienen patrones distintos?
- Expone contradicciones: ¿dónde discrepan participantes? A menudo revela segmentos significativos.
- Encuentra sorpresas: ¿qué desafió tus supuestos previos?

## Interpretación de datos de encuesta

### Análisis cuantitativo de encuestas
- **Tasa de respuesta**: ¿Qué tan representativa es la muestra? Tasas bajas pueden introducir sesgo.
- **Distribución**: Mira la forma de las respuestas, no solo promedios. Distribución bimodal (muchos 1s y 5s) cuenta otra historia que normal (muchos 3s).
- **Segmentación**: Desglosa respuestas por segmento de usuario. Los agregados pueden ocultar diferencias importantes.
- **Significancia estadística**: En muestras pequeñas, sé cauteloso al sacar conclusiones de diferencias pequeñas.
- **Comparación con benchmarks**: ¿Cómo se comparan las puntuaciones con benchmarks del sector o encuestas previas?

### Análisis de respuestas abiertas
- Trata respuestas abiertas como mini notas de entrevista
- Codifica cada respuesta con temas
- Cuenta frecuencia de temas en respuestas
- Extrae citas representativas por tema
- Busca temas en abiertas que no aparecen en preguntas estructuradas — cosas que no pensaste preguntar

### Errores comunes en análisis de encuestas
- Reportar promedios sin distribuciones. Un promedio 3.5 puede significar que todos están tibios o que la mitad ama y la mitad odia.
- Ignorar sesgo por no respuesta. Quienes no respondieron pueden ser sistemáticamente distintos.
- Sobre-interpretar diferencias pequeñas. Un cambio 0.1 en NPS es ruido, no señal.
- Tratar escalas Likert como datos de intervalo.
- Confundir correlación con causalidad en tablas cruzadas.

## Combinar insights cualitativos y cuantitativos

### Bucle qual-quant
- **Cualitativo primero**: Entrevistas y observación revelan QUÉ pasa y POR QUÉ. Generan hipótesis.
- **Validación cuantitativa**: Encuestas y analytics revelan CUÁNTO y CUÁNTOS. Prueban hipótesis a escala.
- **Deep-dive cualitativo**: Vuelve a métodos cualitativos para entender hallazgos cuantitativos inesperados.

### Estrategias de integración
- Usa datos cuantitativos para priorizar hallazgos cualitativos. Un tema de entrevistas importa más si usage data muestra que afecta a muchos usuarios.
- Usa datos cualitativos para explicar anomalías cuantitativas. Una caída de retención es un número; entrevistas revelan que fue por un cambio confuso en onboarding.
- Presenta evidencia combinada: "47% de usuarios encuestados reportan dificultad con X (encuesta), y entrevistas revelan que es porque Y (hallazgo cualitativo)."

### Cuando las fuentes discrepan
- Fuentes cuantitativas y cualitativas pueden contar historias distintas. Es señal, no error.
- Comprueba si la discrepancia se debe a poblaciones distintas medidas
- Comprueba si preferencias declaradas (encuesta) difieren de comportamiento real (analytics)
- Comprueba si la pregunta cuantitativa capturó lo que crees
- Reporta la discrepancia con honestidad e investiga más en lugar de elegir una fuente

## Desarrollo de personas desde research

### Construir personas basadas en evidencia
Las personas deben emerger de datos de research, no de imaginación:

1. **Identificar patrones de comportamiento**: Busca clusters de comportamientos, objetivos y contextos similares entre participantes
2. **Definir variables distintivas**: ¿Qué dimensiones diferencian un cluster de otro? (p. ej., tamaño empresa, skill técnico, frecuencia de uso, use case principal)
3. **Crear perfiles de persona**: Por cada cluster de comportamiento:
   - Nombre y descripción breve
   - Comportamientos y objetivos clave
   - Pain points y necesidades
   - Contexto (rol, empresa, tools usados)
   - Citas representativas
4. **Validar con datos**: ¿Puedes dimensionar cada segmento de persona con datos cuantitativos?

### Template de persona

```
[Nombre Persona] — [Descripción en una línea]

Quiénes son:
- Rol, tipo/tamaño empresa, nivel de experiencia
- Cómo encontraron/empezaron a usar el producto

Qué intentan lograr:
- Objetivos principales y jobs to be done
- Cómo miden el éxito

Cómo usan el producto:
- Frecuencia y profundidad de uso
- Workflows y features clave usados
- Tools que usan junto a este producto

Pain points clave:
- Top 3 frustraciones o necesidades no satisfechas
- Workarounds que han desarrollado

Qué valoran:
- Qué importa más en una solución
- Qué les haría cambiar o churnear

Citas representativas:
- 2-3 citas textuales que capturen la perspectiva de esta persona
```

### Errores comunes con personas
- Personas demográficas: definir por edad/género/ubicación en lugar de comportamiento.
- Demasiadas personas: 3-5 es el sweet spot. Más y no son accionables.
- Personas ficticias: inventadas por supuestos, no por datos de research.
- Personas estáticas: nunca actualizadas cuando evolucionan producto y mercado.
- Personas sin implicaciones: una persona que no cambia decisiones de producto no es útil.

## Dimensionamiento de oportunidades

### Estimar tamaño de oportunidad
Por cada hallazgo u área de oportunidad, estima:

- **Usuarios addressables**: ¿Cuántos usuarios podrían beneficiarse? Usa product analytics, datos de encuesta o de mercado.
- **Frecuencia**: ¿Con qué frecuencia los usuarios afectados encuentran este issue? (Diario, semanal, mensual, one-time)
- **Severidad**: ¿Cuánto impacta el issue cuando ocurre? (Blocker, fricción significativa, molestia menor)
- **Willingness to pay**: ¿Abordar esto impulsaría upgrades, retención o adquisición de nuevos clientes?

### Scoring de oportunidades
Puntúa oportunidades en una matriz simple:

- **Impacto**: (Usuarios afectados) x (Frecuencia) x (Severidad) = score de impacto
- **Fuerza de evidencia**: ¿Qué tan seguros estamos del hallazgo? (Múltiples fuentes > una fuente, datos de comportamiento > preferencias declaradas)
- **Alineación estratégica**: ¿La oportunidad se alinea con estrategia de empresa y visión de producto?
- **Viabilidad**: ¿Podemos abordarla de forma realista? (Viabilidad técnica, recursos, time to impact)

### Presentar dimensionamiento de oportunidades
- Sé transparente sobre supuestos y niveles de confianza
- Muestra la matemática: "Según volumen de tickets de soporte, ~2.000 usuarios/mes encuentran este issue. Datos de entrevistas sugieren que 60% lo consideran blocker significativo."
- Usa rangos en lugar de falsa precisión: "Afecta 1.500-2.500 usuarios/mes" no "Afecta 2.137 usuarios/mes"
- Compara oportunidades entre sí para ranking relativo, no solo scores absolutos