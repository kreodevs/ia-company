---
name: scientific-critical-thinking
description: "Evaluar el rigor de la investigación. Evaluar metodología, diseño experimental, validez estadística, sesgos, confusión, calidad de la evidencia (GRADE, Cochrane ROB), para el análisis crítico de afirmaciones científicas."
allowed-tools: [Read, Write, Edit, Bash]
---

# Pensamiento científico crítico

## Descripción general

El pensamiento crítico es un proceso sistemático para evaluar el rigor científico. Evaluar la metodología, el diseño experimental, la validez estadística, los sesgos, los factores de confusión y la calidad de la evidencia utilizando los marcos GRADE y Cochrane ROB. Aplicar esta habilidad para el análisis crítico de afirmaciones científicas.

## Cuándo utilizar esta habilidad

Esta habilidad debe usarse cuando:
- Evaluación de la metodología de investigación y el diseño experimental.
- Evaluación de la validez estadística y la calidad de la evidencia.
- Identificar sesgos y factores de confusión en los estudios.
- Revisar afirmaciones y conclusiones científicas.
- Realización de revisiones sistemáticas o metanálisis.
- Aplicar evaluaciones de riesgo de sesgo GRADE o Cochrane
- Proporcionar análisis críticos de trabajos de investigación.

## Mejora visual con esquemas científicos

**Al crear documentos con esta habilidad, considere siempre agregar diagramas y esquemas científicos para mejorar la comunicación visual.**

Si su documento aún no contiene esquemas o diagramas:
- Utilice la habilidad **esquemas científicos** para generar diagramas con calidad de publicación impulsados por IA
- Simplemente describe el diagrama que deseas en lenguaje natural.
- Nano Banana Pro generará, revisará y refinará automáticamente el esquema

**Para documentos nuevos:** Los esquemas científicos deben generarse de forma predeterminada para representar visualmente conceptos clave, flujos de trabajo, arquitecturas o relaciones descritas en el texto.

**Cómo generar esquemas:**

```bash
python scripts/generate_schematic.py "your diagram description" -o figures/output.png
```La IA automáticamente:
- Cree imágenes con calidad de publicación y con el formato adecuado.
- Revisar y perfeccionar a través de múltiples iteraciones.
- Garantizar la accesibilidad (apto para daltónicos, alto contraste)
- Guardar resultados en el directorio de figuras/

**Cuándo agregar esquemas:**
- Diagramas del marco de pensamiento crítico.
- Árboles de decisión de identificación de sesgos.
- Diagramas de flujo de evaluación de la calidad de la evidencia.
- Diagramas de metodología de evaluación GRADE
- Marcos de evaluación de riesgo de sesgo
- Visualizaciones de evaluación de validez.
- Cualquier concepto complejo que se beneficie de la visualización.

Para obtener orientación detallada sobre la creación de esquemas, consulte la documentación de habilidades de esquemas científicos.

---

## Capacidades principales

### 1. Crítica de la metodología

Evaluar la metodología de investigación en cuanto a rigor, validez y posibles fallas.

**Aplicar cuando:**
- Revisión de trabajos de investigación.
- Evaluación de diseños experimentales.
- Evaluación de protocolos de estudio.
- Planificación de nuevas investigaciones.

**Marco de evaluación:**

1. **Evaluación del diseño del estudio**
   - ¿Es el diseño apropiado para la pregunta de investigación?
   - ¿Puede el diseño respaldar las afirmaciones causales que se hacen?
   - ¿Son apropiados y adecuados los grupos de comparación?
   - Considerar si está justificado el diseño experimental, cuasiexperimental u observacional.

2. **Análisis de validez**
   - **Validez interna:** ¿Podemos confiar en la inferencia causal?
     - Verificar la calidad de la aleatorización
     - Evaluar el control de confusión.
     - Evaluar el sesgo de selección.
     - Revisar los patrones de desgaste/abandono
   - **Validez externa:** ¿Se generalizan los resultados?
     - Evaluar la representatividad de la muestra.
     - Considerar la validez ecológica del entorno.
     - Evaluar si las condiciones coinciden con la aplicación objetivo.
   - **Validez de constructo:** ¿Las medidas capturan los constructos previstos?
     - Revisar la validación de mediciones.
     - Verificar definiciones operativas.
     - Evaluar si las medidas son directas o indirectas.
   - **Validez de la conclusión estadística:** ¿Son sólidas las inferencias estadísticas?
     - Verificar potencia/tamaño de muestra adecuados
     - Comprobar cumplimiento de supuestos
     - Evaluar la idoneidad de la prueba.

3. **Control y cegamiento**
   - ¿Se implementó correctamente la aleatorización (generación de secuencia, ocultamiento de la asignación)?
   - ¿Fue factible e implementado el cegamiento (participantes, proveedores, evaluadores)?
   - ¿Son apropiadas las condiciones de control (placebo, control activo, ningún tratamiento)?
   - ¿Podría el sesgo de rendimiento o de detección afectar los resultados?

4. **Calidad de medición**
   - ¿Los instrumentos están validados y son confiables?
   - ¿Las medidas son objetivas cuando es posible o subjetivas con limitaciones reconocidas?
   - ¿Está estandarizada la evaluación de resultados?
   - ¿Se utilizan múltiples medidas para triangular los hallazgos?

**Referencia:** Consulte `references/scientific_method.md` para obtener principios detallados y`references/experimental_design.md` para una lista de verificación de diseño completa.

### 2. Detección de sesgos

Identificar y evaluar posibles fuentes de sesgo que podrían distorsionar los hallazgos.

**Aplicar cuando:**
- Revisar investigaciones publicadas.
- Diseño de nuevos estudios.
- Interpretar evidencia contradictoria
- Evaluación de la calidad de la investigación.

**Revisión de sesgo sistemático:**1. **Sesgos cognitivos (investigador)**
   - **Sesgo de confirmación:** ¿Solo se destacan los hallazgos de respaldo?
   - **HARKing:** ¿Las hipótesis se formularon a priori o se formaron después de ver los resultados?
   - **Sesgo de publicación:** ¿Faltan resultados negativos en la literatura?
   - **Elección selectiva:** ¿Se presenta la evidencia de forma selectiva?
   - Verificar la transparencia del plan de preinscripción y análisis.

2. **Sesgos de selección**
   - **Sesgo de muestreo:** ¿Es la muestra representativa de la población objetivo?
   - **Sesgo de voluntariado:** ¿Los participantes se autoseleccionan de manera sistemática?
   - **Sesgo de deserción:** ¿La deserción escolar es diferencial entre grupos?
   - **Sesgo de supervivencia:** ¿Son sólo los "supervivientes" visibles en la muestra?
   - Examinar los diagramas de flujo de los participantes y comparar las características iniciales.

3. **Sesgos de medición**
   - **Sesgo del observador:** ¿Podrían las expectativas influir en las observaciones?
   - **Sesgo de recuerdo:** ¿Los informes retrospectivos son sistemáticamente inexactos?
   - **Deseabilidad social:** ¿Están las respuestas sesgadas hacia la aceptabilidad?
   - **Sesgo del instrumento:** ¿Las herramientas de medición se equivocan sistemáticamente?
   - Evaluar el cegamiento, la validación y la objetividad de la medición.

4. **Sesgos de análisis**
   - **P-hacking:** ¿Se realizaron múltiples análisis hasta que surgió la importancia?
   - **Cambio de resultados:** ¿Se reemplazaron los resultados no significativos por otros significativos?
   - **Informes selectivos:** ¿Se informan todos los análisis planificados?
   - **Pesca de subgrupos:** ¿Se realizaron análisis de subgrupos sin corrección?
   - Verifique el registro del estudio y compárelo con los resultados publicados.

5. **Confusión**
   - ¿Qué variables podrían afectar tanto la exposición como el resultado?
   - ¿Se midieron y controlaron los factores de confusión (estadísticamente o por diseño)?
   - ¿Podrían los factores de confusión no medidos explicar los hallazgos?
   - ¿Existen explicaciones alternativas plausibles?

**Referencia:** Consulte `references/common_biases.md` para obtener una taxonomía completa de sesgos con estrategias de detección y mitigación.

### 3. Evaluación del análisis estadístico

Evaluar críticamente los métodos, la interpretación y la presentación de informes estadísticos.

**Aplicar cuando:**
- Revisar la investigación cuantitativa.
- Evaluación de reclamaciones basadas en datos.
- Evaluación de resultados de ensayos clínicos.
- Revisión de metanálisis

**Lista de verificación de revisión estadística:**

1. **Tamaño de muestra y potencia**
   - ¿Se realizó un análisis de poder a priori?
   - ¿Es la muestra adecuada para detectar efectos significativos?
   - ¿El estudio tiene poca potencia (problema común)?
   - ¿Los resultados significativos de muestras pequeñas hacen sospechar que los tamaños del efecto están inflados?

2. **Pruebas estadísticas**
   - ¿Las pruebas son apropiadas para el tipo y distribución de datos?
   - ¿Se verificaron y cumplieron los supuestos de la prueba?
   - ¿Están justificadas las pruebas paramétricas o deberían utilizarse alternativas no paramétricas?
   - ¿El análisis coincide con el diseño del estudio (p. ej., emparejado versus independiente)?

3. **Múltiples comparaciones**
   - ¿Se probaron múltiples hipótesis?
   - ¿Se aplicó corrección (Bonferroni, FDR, otros)?
   - ¿Se distinguen los resultados primarios de los secundarios/exploratorios?
   - ¿Podrían los resultados ser falsos positivos de múltiples pruebas?

4. **Interpretación del valor P**
   - ¿Se interpretan correctamente los valores p (probabilidad de los datos si nulo es verdadero)?
   - ¿La falta de significación se interpreta incorrectamente como "sin efecto"?
   - ¿Se confunde la significación estadística con la importancia práctica?
   - ¿Se informan los valores p exactos o sólo "p < .05"?
   - ¿Hay agrupaciones sospechosas justo debajo de  .05?

5. **Tamaños del efecto e intervalos de confianza**
   - ¿Se informan los tamaños del efecto junto con la importancia?
   - ¿Se proporcionan intervalos de confianza para mostrar precisión?
   - ¿Es significativo el tamaño del efecto en términos prácticos?
   - ¿Se interpretan los tamaños de efecto estandarizados con el contexto específico del campo?

6. **Datos faltantes**
   - ¿Cuántos datos faltan?
   - ¿Se considera el mecanismo de datos faltantes (MCAR, MAR, MNAR)?
   - ¿Cómo se tratan los datos faltantes (supresión, imputación, máxima verosimilitud)?
   - ¿Los datos faltantes podrían sesgar los resultados?

7. **Regresión y modelado**
   - ¿Está el modelo sobreajustado (demasiados predictores, sin validación cruzada)?
   - ¿Se hacen predicciones fuera del rango de datos (extrapolación)?
   - ¿Se abordan las cuestiones de multicolinealidad?
   - ¿Se verifican los supuestos del modelo?

8. **Errores comunes**
   - Correlación tratada como causalidad.
   - Ignorar la regresión a la media.
   - Descuido de la tasa base
   - Falacia del francotirador de Texas (búsqueda de patrones en ruido)
   - Paradoja de Simpson (confusión por subgrupos)

**Referencia:** Consulte `references/statistical_pitfalls.md` para conocer los errores detallados y las prácticas correctas.

### 4. Evaluación de la calidad de la evidenciaEvaluar sistemáticamente la solidez y la calidad de la evidencia.

**Aplicar cuando:**
- Sopesar la evidencia para las decisiones.
- Realización de revisiones bibliográficas.
- Comparar hallazgos contradictorios
- Determinar la confianza en las conclusiones.

**Marco de evaluación de evidencia:**

1. **Jerarquía de diseño del estudio**
   - Revisiones sistemáticas/metanálisis (el más alto para los efectos de la intervención)
   - Ensayos controlados aleatorios
   - Estudios de cohorte
   - Estudios de casos y controles
   - Estudios transversales
   - Series de casos/informes
   - Opinión de expertos (la más baja)

   **Importante:** Los diseños de nivel superior no siempre son de mejor calidad. Un estudio observacional bien diseñado puede ser más sólido que un ECA mal realizado.

2. **Calidad dentro del tipo de diseño**
   - Evaluación del riesgo de sesgo (use la herramienta adecuada: Cochrane ROB, Newcastle-Ottawa, etc.)
   - Rigor metodológico
   - Transparencia y exhaustividad de los informes.
   - Conflictos de intereses

3. **Consideraciones de GRADO (si corresponde)**
   - Comience con el tipo de diseño (RCT = alto, observacional = bajo)
   - **Rebajar de categoría para:**
     - Riesgo de sesgo
     - Inconsistencia entre estudios
     - Indirectidad (población/intervención/resultado incorrectos)
     - Imprecisión (intervalos de confianza amplios, muestras pequeñas)
     - Sesgo de publicación
   - **Actualización para:**
     - Grandes tamaños de efecto
     - Relaciones dosis-respuesta
     - Los factores de confusión reducirían (no aumentarían) el efecto.

4. **Convergencia de evidencia**
   - **Más fuerte cuando:**
     - Múltiples replicaciones independientes
     - Diferentes grupos y entornos de investigación.
     - Diferentes metodologías convergen en la misma conclusión.
     - La evidencia mecanicista y empírica se alinean
   - **Más débil cuando:**
     - Grupo único de estudio o investigación.
     - Hallazgos contradictorios en la literatura.
     - Sesgo de publicación evidente
     - Sin intentos de replicación

5. **Factores contextuales**
   - Plausibilidad biológica/teórica
   - Coherencia con el conocimiento establecido.
   - Temporalidad (la causa precede al efecto)
   - Especificidad de la relación
   - Fuerza de asociación

**Referencia:** Consulte `references/evidence_hierarchy.md` para conocer la jerarquía detallada, el sistema GRADE y las herramientas de evaluación de calidad.

### 5. Identificación de falacias lógicas

Detectar y nombrar errores lógicos en argumentos y afirmaciones científicas.

**Aplicar cuando:**
- Evaluación de afirmaciones científicas.
- Revisar las secciones de discusión/conclusión.
- Evaluación de la comunicación de divulgación científica.
- Identificar razonamientos erróneos.

**Falacias comunes en la ciencia:**

1. **Falacias de causalidad**
   - **Post hoc ergo propter hoc:** "B siguió a A, por lo que A causó B"
   - **Correlación = causalidad:** Asociación confusa con causalidad
   - **Causa inversa:** Confundir causa con efecto
   - **Falacia de causa única:** Atribuir resultados complejos a un factor

2. **Falacias de generalización**
   - **Generalización apresurada:** Conclusiones amplias a partir de muestras pequeñas
   - **Falacia anecdótica:** Historias personales como prueba
   - **Selección selectiva:** Seleccionar solo evidencia de respaldo
   - **Falacia ecológica:** Patrones grupales aplicados a individuos

3. **Falacias de autoridades y fuentes**
   - **Apelación a la autoridad:** "Lo dijo el experto, entonces es verdad" (sin pruebas)
   - **Ad hominem:** Persona atacante, no argumento.
   - **Falacia genética:** Juzgar por origen, no por méritos
   - **Apelación a la naturaleza:** "Natural = bueno/seguro"

4. **Falacias estadísticas**
   - **Negligencia de la tasa base:** Ignorando la probabilidad anterior
   - **Francotirador de Texas:** Encontrar patrones en datos aleatorios
   - **Comparaciones múltiples:** No corregir para múltiples pruebas
   - **Falacia del fiscal:** Confundir P(E|H) con P(H|E)

5. **Falacias estructurales**
   - **Falsa dicotomía:** "A o B" cuando existen más opciones
   - **Movimiento de objetivos:** Cambiar los estándares de evidencia después de que se cumplan
   - **Pregunta inicial:** Razonamiento circular
   - **Hombre de paja:** Tergiversar argumentos para atacarlos

6. **Falacias científicas específicas**
   - **Galileo gambito:** "Se rieron de Galileo, así que mi idea marginal es correcta"
   - **Argumento por ignorancia:** "No se ha demostrado que sea falso, por lo que es cierto"
   - **Falacia del Nirvana:** Rechazar soluciones imperfectas
   - **Infalsificabilidad:** Hacer afirmaciones no comprobables

**Al identificar falacias:**
- Nombra la falacia específica
- Explique por qué el razonamiento es erróneo.
- Identificar qué evidencia sería necesaria para una inferencia válida.
- Tenga en cuenta que el razonamiento falaz no prueba que la conclusión sea falsa, solo que este argumento no la respalda.

**Referencia:** Consulte `references/logical_fallacies.md` para obtener un catálogo completo de falacias con ejemplos y estrategias de detección.

### 6. Orientación sobre el diseño de la investigaciónProporcionar orientación constructiva para la planificación de estudios rigurosos.

**Aplicar cuando:**
- Ayudar a diseñar nuevos experimentos.
- Planificación de proyectos de investigación.
- Revisión de propuestas de investigación.
- Mejora de los protocolos de estudio.

**Proceso de diseño:**

1. **Refinamiento de la pregunta de investigación**
   - Garantizar que la pregunta sea específica, respondible y falsificable.
   - Verificar que aborda un vacío o contradicción en la literatura.
   - Confirmar viabilidad (recursos, ética, tiempo)
   - Definir variables operativamente.

2. **Selección de diseño**
   - Emparejar el diseño con la pregunta (causal → experimental; asociacional → observacional)
   - Considerar la viabilidad y las limitaciones éticas.
   - Elija entre temas, dentro de los temas o diseños mixtos
   - Planificar diseños factoriales si se prueban múltiples factores.

3. **Estrategia de minimización de sesgos**
   - Implementar la aleatorización cuando sea posible.
   - Planificar el cegamiento en todos los niveles factibles (participantes, proveedores, evaluadores)
   - Identificar y planificar el control de factores de confusión (aleatorización, emparejamiento, estratificación, ajuste estadístico)
   - Estandarizar todos los procedimientos.
   - Plan para minimizar el desgaste

4. **Planificación de muestra**
   - Realizar un análisis de potencia a priori (especificar efecto esperado, potencia deseada, alfa)
   - Tener en cuenta el desgaste en el tamaño de la muestra.
   - Definir criterios claros de inclusión/exclusión.
   - Considerar la estrategia y la viabilidad de contratación.
   - Plan de representatividad de la muestra.

5. **Estrategia de medición**
   - Seleccionar instrumentos validados y confiables.
   - Utilice medidas objetivas cuando sea posible.
   - Planificar múltiples medidas de constructos clave (triangulación)
   - Garantizar que las medidas sean sensibles a los cambios esperados.
   - Establecer procedimientos de confiabilidad entre evaluadores.

6. **Planificación del análisis**
   - Preespecificar todas las hipótesis y análisis.
   - Designar claramente el resultado primario
   - Planificar pruebas estadísticas con comprobaciones de supuestos.
   - Especificar cómo se manejarán los datos faltantes.
   - Planificar para informar los tamaños del efecto y los intervalos de confianza.
   - Considere múltiples correcciones de comparación

7. **Transparencia y Rigor**
   - Plan de estudio y análisis de preinscripción
   - Utilice pautas de informes (CONSORT, STROBE, PRISMA)
   - Planifique informar todos los resultados, no solo los significativos.
   - Distinguir los análisis confirmatorios de los exploratorios.
   - Comprometerse a compartir datos/códigos

**Referencia:** Consulte `references/experimental_design.md` para obtener una lista de verificación de diseño integral que cubre todas las etapas, desde la pregunta hasta la difusión.

### 7. Evaluación de reclamos

Evaluar sistemáticamente las afirmaciones científicas para determinar su validez y respaldo.

**Aplicar cuando:**
- Evaluación de conclusiones en artículos.
- Evaluación de informes de investigación en los medios.
- Revisión de reclamos de resúmenes o introducciones.
- Comprobar si los datos respaldan las conclusiones.

**Proceso de evaluación de reclamos:**

1. **Identifique el reclamo**
   - ¿Qué se reclama exactamente?
   - ¿Es una afirmación causal, asociativa o descriptiva?
   - ¿Qué tan sólida es la afirmación (probada, probable, sugerida, posible)?

2. **Evaluar la evidencia**
   - ¿Qué pruebas se aportan?
   - ¿La evidencia es directa o indirecta?
   - ¿Son pruebas suficientes para la solidez de la reclamación?
   - ¿Se descartan explicaciones alternativas?

3. **Verifique la conexión lógica**
   - ¿Se derivan conclusiones de los datos?
   - ¿Hay saltos lógicos?
   - ¿Se utilizan datos correlacionales para respaldar afirmaciones causales?
   - ¿Se reconocen las limitaciones?

4. **Evaluar la proporcionalidad**
   - ¿Es la confianza proporcional a la solidez de la evidencia?
   - ¿Se utilizan adecuadamente las palabras de cobertura?
   - ¿Se restan importancia a las limitaciones?
   - ¿Está claramente etiquetada la especulación?

5. **Compruebe si hay sobregeneralización**
   - ¿Las afirmaciones se extienden más allá de la muestra estudiada?
   - ¿Se reconocen las restricciones poblacionales?
   - ¿Se reconoce la dependencia del contexto?
   - ¿Se incluyen advertencias sobre la generalización?

6. **Banderas rojas**
   - Lenguaje causal a partir de estudios correlacionales.
   - "Prueba" o certeza absoluta
   - Citas cuidadosamente seleccionadas
   - Ignorar evidencia contradictoria.
   - Descartar limitaciones
   - Extrapolación más allá de los datos

**Proporcione comentarios específicos:**
- Cite el reclamo problemático.
- Explique qué evidencia se necesitaría para respaldarlo.
- Sugerir un lenguaje de cobertura apropiado si está justificado.
- Distinguir entre datos (lo que se encontró) e interpretación (lo que significa)

## Pautas de solicitud

### Enfoque general

1. **Sea constructivo**
   - Identificar fortalezas y debilidades.
   - Sugerir mejoras en lugar de limitarse a criticar.
   - Distinguir entre defectos fatales y limitaciones menores.
   - Reconocer que toda investigación tiene limitaciones2. **Sea específico**
   - Señalar instancias específicas (por ejemplo, "La Tabla 2 muestra..." o "En la sección Métodos...")
   - Citar declaraciones problemáticas.
   - Proporcionar ejemplos concretos de problemas.
   - Hacer referencia a principios o estándares específicos violados.

3. **Sea proporcionado**
   - Haga coincidir la gravedad de las críticas con la importancia del problema.
   - Distinguir entre amenazas importantes a la validez y preocupaciones menores.
   - Considerar si los problemas afectan las conclusiones primarias.
   - Reconocer la incertidumbre en sus propias valoraciones.

4. **Aplicar estándares consistentes**
   - Utilice los mismos criterios en todos los estudios.
   - No aplique estándares más estrictos a los hallazgos que no le gustan
   - Reconoce tus propios prejuicios potenciales
   - Basar los juicios en la metodología, no en los resultados.

5. **Considere el contexto**
   - Reconocer las limitaciones prácticas y éticas.
   - Considere normas específicas de campo para tamaños de efectos y métodos.
   - Reconocer contextos exploratorios versus confirmatorios.
   - Tener en cuenta las limitaciones de recursos en la evaluación de estudios.

### Al ofrecer críticas

**Estructurar comentarios como:**

1. **Resumen:** Breve descripción de lo evaluado
2. **Fortalezas:** Lo que se hizo bien (importante para la credibilidad y el aprendizaje)
3. **Preocupaciones:** Problemas organizados por gravedad
   - Cuestiones críticas (amenazan la validez de las conclusiones principales)
   - Cuestiones importantes (afectan a la interpretación pero no fatalmente)
   - Problemas menores (vale la pena señalar pero no cambiar las conclusiones)
4. **Recomendaciones específicas:** Sugerencias prácticas para mejorar
5. **Evaluación general:** Conclusión equilibrada sobre la calidad de la evidencia y lo que se puede concluir.**Utilice terminología precisa:**
- Nombrar sesgos, falacias y cuestiones metodológicas específicas.
- Referenciar normas y lineamientos establecidos
- Citar principios de la metodología científica.
- Utilizar términos técnicos con precisión.

### Cuando no está seguro

- **Reconocer incertidumbre:** "Esto podría ser X o Y; la información adicional necesaria es Z"
- **Haga preguntas aclaratorias:** "¿Se hizo [detalle metodológico]? Esto afecta la interpretación".
- **Proporcione evaluaciones condicionales:** "Si se hizo X, entonces sigue Y; si no, entonces Z es motivo de preocupación"
- **Tenga en cuenta qué información adicional resolvería la incertidumbre**

## Materiales de referencia

Esta habilidad incluye materiales de referencia integrales que brindan marcos detallados para la evaluación crítica:

- ** `references/scientific_method.md`** - Principios básicos de la metodología científica, el proceso científico, criterios de evaluación crítica, señales de alerta en afirmaciones científicas, estándares de inferencia causal, revisión por pares y principios de ciencia abierta.

- ** `references/common_biases.md`** - Taxonomía integral de sesgos cognitivos, experimentales, metodológicos, estadísticos y de análisis con estrategias de detección y mitigación.

- ** `references/statistical_pitfalls.md`** - Errores estadísticos e interpretaciones erróneas comunes, incluidos malentendidos sobre el valor p, problemas de comparaciones múltiples, problemas con el tamaño de la muestra, errores con el tamaño del efecto, confusión entre correlación y causalidad, errores de regresión y problemas de metanálisis

- ** `references/evidence_hierarchy.md`** - Jerarquía de evidencia tradicional, sistema GRADE, criterios de evaluación de la calidad del estudio, consideraciones específicas del dominio, principios de síntesis de evidencia y marcos de decisión prácticos

- ** `references/logical_fallacies.md`** - Falacias lógicas comunes en el discurso científico organizadas por tipo (causalidad, generalización, autoridad, relevancia, estructura, estadística) con ejemplos y estrategias de detección.

- ** `references/experimental_design.md`** - Lista de verificación integral del diseño experimental que cubre preguntas de investigación, hipótesis, selección del diseño del estudio, variables, muestreo, cegamiento, aleatorización, grupos de control, procedimientos, medición, minimización de sesgos, gestión de datos, planificación estadística, consideraciones éticas, amenazas a la validez y estándares de presentación de informes.

**Cuándo consultar referencias:**
- Cargar referencias en contexto cuando se necesitan marcos detallados.
- Utilice grep para buscar referencias sobre temas específicos: `grep -r "pattern" references/`- Las referencias proporcionan profundidad; SKILL.md proporciona orientación sobre procedimientos
- Consulte referencias para obtener listas completas, criterios detallados y ejemplos específicos.

## Recuerda

**El pensamiento crítico científico se trata de:**
- Evaluación sistemática utilizando principios establecidos.
- Crítica constructiva que mejora la ciencia.
- Confianza proporcional a la fuerza de la evidencia.
- Transparencia sobre la incertidumbre y las limitaciones.
- Aplicación coherente de las normas.
- Reconocimiento de que toda investigación tiene limitaciones.
- Equilibrio entre escepticismo y apertura a la evidencia.**Distinga siempre entre:**
- Datos (lo que se observó) e interpretación (lo que significa)
- Correlación y causalidad
- Significación estadística e importancia práctica.
- Hallazgos exploratorios y confirmatorios.
- Lo que se sabe y lo que es incierto.
- Prueba contra una demanda y prueba de la nulidad

**Objetivos del pensamiento crítico:**
1. Identificar fortalezas y debilidades con precisión
2. Determinar qué conclusiones se respaldan.
3. Reconocer limitaciones e incertidumbres
4. Sugerir mejoras para trabajos futuros.
5. Avanzar en la comprensión científica