# Errores estadísticos comunes

## Interpretaciones erróneas del valor P

### Error 1: Valor P = La hipótesis de probabilidad es cierta
**Concepto erróneo:** p = 0,05 significa que hay un 5% de probabilidad de que la hipótesis nula sea cierta.

**Realidad:** El valor P es la probabilidad de observar datos tan extremos (o más) *si* la hipótesis nula es cierta. No dice nada sobre la probabilidad de que la hipótesis sea cierta.

**Interpretación correcta:** "Si realmente no hubiera ningún efecto, observaríamos datos tan extremos sólo el 5% de las veces".

### Error 2: No significativo = Sin efecto
**Concepto erróneo:** p > .05 demuestra que no hay ningún efecto.

**Realidad:** Ausencia de evidencia ≠ evidencia de ausencia. Los resultados no significativos pueden indicar:
- Poder estadístico insuficiente
- El efecto real es demasiado pequeño para detectarlo.
- Alta variabilidad
- Tamaño de muestra pequeño

**Mejor enfoque:**
- Informar intervalos de confianza.
- Realizar análisis de potencia.
- Considere las pruebas de equivalencia

### Error 3: Significativo = Importante
**Concepto erróneo:** Significancia estadística significa importancia práctica.

**Realidad:** Con muestras grandes, los efectos triviales se vuelven "significativos". Una diferencia estadísticamente significativa de 0,1 puntos de coeficiente intelectual no tiene sentido en la práctica.

**Mejor enfoque:**
- Tamaños de efecto de informe
- Considere la importancia práctica.
- Utilice intervalos de confianza.

### Error 4: P = 0,049 frente a P = 0,051
**Concepción errónea:** Estos son significativamente diferentes porque uno cruza el umbral de 0,05.

**Realidad:** Estos representan evidencia casi idéntica. El umbral de 0,05 es arbitrario.

**Mejor enfoque:**
- Tratar los valores p como medidas continuas de evidencia.
- Informar valores p exactos
- Considerar el contexto y la evidencia previa.

### Error 5: Pruebas unilaterales sin justificación
**Concepto erróneo:** Las pruebas de una cola son potencia adicional gratuita.

**Realidad:** Las pruebas de una cola suponen que los efectos sólo pueden ir en una dirección, lo cual rara vez es cierto. A menudo se utilizan para aumentar artificialmente la importancia.

**Cuando corresponda:** Sólo cuando los efectos en una dirección sean teóricamente imposibles o equivalentes a nulos.

## Problemas de comparaciones múltiples

### Error 6: Pruebas múltiples sin corrección
**Problema:** Probar 20 hipótesis con p < 0,05 da aproximadamente un 65 % de posibilidades de que se produzca al menos un falso positivo.

**Ejemplos:**
- Probar muchos resultados
- Probar muchos subgrupos
- Realización de múltiples análisis intermedios.
- Pruebas en múltiples momentos

**Soluciones:**
- Corrección de Bonferroni (dividir α por el número de pruebas)
- Control de tasa de descubrimiento falso (FDR)
- Preespecificar el resultado primario
- Tratar los análisis exploratorios como generadores de hipótesis.

### Error 7: Pesca de análisis de subgrupos
**Problema:** Probar muchos subgrupos hasta encontrar significancia.

**Por qué es problemático:**
- Infla la tasa de falsos positivos
- A menudo se informa sin divulgación.
- "La interacción fue significativa en las mujeres" puede ser aleatorio

**Soluciones:**
- Preespecificar subgrupos
- Utilice pruebas de interacción, no pruebas separadas.
- Requerir replicación
- Correcto para comparaciones múltiples

### Error 8: cambio de resultados
**Problema:** Analizar muchos resultados y reportar solo los significativos.

**Signos de detección:**
- Se enfatizan los resultados secundarios.
- Informe de resultados incompleto
- Discrepancia entre registro y publicación

**Soluciones:**
- Preregistrar todos los resultados
- Informar todos los resultados planificados.
- Distinguir primaria de secundaria.

## Problemas de potencia y tamaño de muestra

### Error 9: Estudios con poca potencia
**Problema:** Las muestras pequeñas tienen baja probabilidad de detectar efectos reales.

**Consecuencias:**
- Alta tasa de falsos negativos
- Es más probable que los resultados significativos sean falsos positivos.
- Tamaños del efecto sobreestimados (cuando son significativos)

**Soluciones:**
- Realizar un análisis de potencia a priori.
- Apunta a 80-90% de potencia
- Considere el tamaño del efecto de investigaciones anteriores.

### Error 10: Análisis de potencia post-hoc
**Problema:** Calcular la potencia después de ver los resultados es circular y poco informativo.

**Por qué inútil:**
- Los resultados no significativos siempre tienen un bajo "poder post hoc"
- Recapitula el valor p sin nueva información.

**Mejor enfoque:**
- Calcular intervalos de confianza.
- Plan de replicación con muestra adecuada.
- Realizar análisis de potencia prospectivos para futuros estudios.

### Error 11: Falacia de muestra pequeña
**Problema:** Confiar en resultados de muestras muy pequeñas.

**Problemas:**
- Alta variabilidad de muestreo
- Los valores atípicos tienen una gran influencia
- Supuestos de pruebas violados.
- Intervalos de confianza muy amplios.

**Pautas:**
- Sea escéptico con n < 30
- Verifique las suposiciones cuidadosamente
- Considere pruebas no paramétricas.
- Replicar hallazgos

## Malentendidos sobre el tamaño del efecto### Error 12: Ignorar el tamaño del efecto
**Problema:** Centrarse sólo en la importancia, no en la magnitud.

**Por qué es problemático:**
- Importancia ≠ importancia
- No se puede comparar entre estudios
- No informa decisiones prácticas.

**Soluciones:**
- Informe siempre los tamaños del efecto
- Utilizar medidas estandarizadas (d, r, η² de Cohen)
- Interpretar usando convenciones de campo.
- Considerar una diferencia mínima clínicamente importante.

### Error 13: malinterpretar los tamaños de efectos estandarizados
**Problema:** Tratar el d = 0,5 de Cohen como "medio" sin contexto.

**Realidad:**
- Las normas específicas del campo varían
- Algunos campos tienen efectos típicos más grandes.
- La importancia en el mundo real depende del contexto.

**Mejor enfoque:**
- Comparar con efectos en el mismo dominio.
- Considerar las implicaciones prácticas.
- Mire también los tamaños de los efectos sin procesar

### Error 14: Confundir la variación explicada con la importancia
**Problema:** "Solo explica el 5% de la variación" = sin importancia.

**Realidad:**
- La altura explica ~5% de la variación en el salario de los jugadores de la NBA, pero es crucial
- Los fenómenos complejos tienen muchos pequeños contribuyentes.
- Precisión predictiva ≠ importancia causal

**Consideración:** El contexto importa más que el porcentaje por sí solo.

## Correlación y causalidad

### Error 15: La correlación implica causalidad
**Problema:** Inferir causalidad a partir de la correlación.

**Explicaciones alternativas:**
- Causación inversa (B causa A, no A causa B)
- Confusión (C causa tanto A como B)
- Coincidencia
- Sesgo de selección

**Criterios de causalidad:**
- Precedencia temporal
- Covariación
- No hay alternativas plausibles
- Idealmente: manipulación experimental.

### Escollo 16: Falacia ecológica
**Problema:** Inferir relaciones a nivel individual a partir de datos a nivel de grupo.

**Ejemplo:** Los países con más consumo de chocolate tienen más premios Nobel no significa que comer chocolate te haga ganar premios Nobel.

**Por qué es problemático:** Las correlaciones a nivel de grupo pueden no ser válidas a nivel individual.

### Escollo 17: La paradoja de Simpson
**Problema:** La tendencia aparece en grupos pero se invierte cuando se combina (o viceversa).

**Ejemplo:** El tratamiento parece peor en general pero mejor en cada subgrupo.

**Causa:** Variable de confusión distribuida de manera diferente entre los grupos.

**Solución:** Considere los factores de confusión y observe el nivel de análisis adecuado.

## Errores de regresión y modelado

### Error 18: sobreajuste
**Problema:** El modelo se ajusta bien a los datos de muestra pero no generaliza.

**Causas:**
- Demasiados predictores en relación con el tamaño de la muestra
- Ruido de ajuste en lugar de señal.
- Sin validación cruzada

**Soluciones:**
- Utilice validación cruzada
- Regresión penalizada (LASSO, cresta)
- Conjunto de prueba independiente
- Modelos más simples

### Error 19: Extrapolación más allá del rango de datos
**Problema:** Predecir fuera del rango de datos observados.

**Por qué peligroso:**
- Es posible que las relaciones no se mantengan fuera del rango observado
- Mayor incertidumbre que no se refleja en las predicciones.

**Solución:** Sólo interpolar; evitar la extrapolación.

### Error 20: Ignorar los supuestos del modelo
**Problema:** Usar pruebas estadísticas sin verificar suposiciones.

**Infracciones comunes:**
- No normalidad (para pruebas paramétricas)
- Heteroscedasticidad (varianzas desiguales)
- No independencia
- Linealidad
- Sin multicolinealidad

**Soluciones:**
- Verificar supuestos con diagnóstico.
- Utilice métodos robustos
- Transformar datos
- Utilizar alternativas no paramétricas apropiadas

### Error 21: Tratar las covariables no significativas como si eliminaran los factores de confusión
**Problema:** "Controlamos por X y no fue significativo, por lo que no es un factor de confusión".

**Realidad:** Las covariables no significativas aún pueden ser factores de confusión importantes. Importancia ≠ confusión.

**Solución:** Incluir covariables teóricamente importantes independientemente de su importancia.

### Error 22: Efectos de enmascaramiento de colinealidad
**Problema:** Cuando los predictores están altamente correlacionados, los efectos reales pueden parecer no significativos.

**Manifestaciones:**
- Grandes errores estándar
- Coeficientes inestables
- Cambios de signo al agregar/eliminar variables

**Detección:**
- Factores de inflación de varianza (VIF)
- Matrices de correlación

**Soluciones:**
- Eliminar predictores redundantes
- Combinar variables correlacionadas
- Utilizar métodos de regularización.

## Usos indebidos de pruebas específicas

### Error 23: Prueba T para múltiples grupos
**Problema:** Realizar múltiples pruebas t en lugar de ANOVA.

**Por qué está mal:** Infla dramáticamente la tasa de error tipo I.

**Enfoque correcto:**
- Utilice ANOVA primero
- Seguir con comparaciones planificadas o pruebas post-hoc con corrección

### Error 24: Correlación de Pearson para relaciones no lineales
**Problema:** Uso de la r de Pearson para relaciones curvas.**Por qué es engañoso:** r mide únicamente relaciones lineales.

**Soluciones:**
- Verifique primero los diagramas de dispersión
- Utilice ρ de Spearman para relaciones monótonas.
- Considere modelos polinomiales o no lineales.

### Error 25: Chi cuadrado con frecuencias esperadas pequeñas
**Problema:** Prueba de chi-cuadrado con recuentos de células esperados < 5.

**Por qué está mal:** Viola los supuestos de la prueba, los valores p son inexactos.

**Soluciones:**
- Prueba exacta de Fisher
- Combinar categorías
- Aumentar el tamaño de la muestra.

### Error 26: Pruebas emparejadas versus independientes
**Problema:** Uso de pruebas de muestras independientes para datos pareados (o viceversa).

**Por qué está mal:**
- Desperdicio de energía (datos pareados analizados como independientes)
- Viola el supuesto de independencia (datos independientes analizados en pares)

**Solución:** Prueba de coincidencia con el diseño.

## Interpretaciones erróneas del intervalo de confianza

### Error 27: IC del 95% = Probabilidad del 95% Valor verdadero dentro
**Concepto erróneo:** "95% de probabilidad de que el valor real esté en este intervalo".

**Realidad:** El valor real está o no en este intervalo específico. Si repitiéramos el estudio muchas veces, el 95% de los intervalos resultantes contendrían el valor real.

**Mejor interpretación:** "Tenemos un 95 % de confianza en que este intervalo contiene el valor real".

### Error 28: CI superpuestos = no hay diferencia
**Problema:** Suponer que los intervalos de confianza superpuestos no significan una diferencia significativa.

**Realidad:** Los IC superpuestos son menos estrictos que las pruebas de diferencias. Dos IC pueden superponerse aunque la diferencia entre grupos sea significativa.

**Pauta:** La superposición de la estimación puntual con otros IC es más relevante que la superposición de intervalos.

### Error 29: ignorar el ancho de CI
**Problema:** Centrarse únicamente en si CI incluye cero, no precisión.

**Por qué es importante:** Los IC amplios indican una alta incertidumbre. Los efectos "significativos" con IC enormes son menos convincentes.

**Considere:** Tanto la importancia como la precisión.

## Confusiones bayesianas versus frecuentistas

### Error 30: Mezclar interpretaciones bayesianas y frecuentistas
**Problema:** Hacer afirmaciones bayesianas a partir de análisis frecuentistas.

**Ejemplos:**
- "La hipótesis de probabilidad es verdadera" (bayesiana) a partir del valor p (frecuentista)
- "Evidencia de nulo" de un resultado no significativo (el frecuentador no puede admitir nulo)

**Solución:**
- Sea claro sobre el marco.
- Utilice métodos bayesianos para preguntas bayesianas.
- Utilizar factores de Bayes para comparar hipótesis.

### Error 31: Ignorar la probabilidad previa
**Problema:** Tratar todas las hipótesis como igualmente probables inicialmente.

**Realidad:** Las afirmaciones extraordinarias necesitan pruebas extraordinarias. La plausibilidad previa importa.

**Considerar:**
- Plausibilidad dado el conocimiento existente.
- Plausibilidad del mecanismo
- Tarifas base

## Problemas de transformación de datos

### Error 32: dicotomizar variables continuas
**Problema:** Dividir variables continuas en límites arbitrarios.

**Consecuencias:**
- Pérdida de información y poder.
- Distinciones arbitrarias
- Descartar las diferencias individuales

**Excepciones:** Puntos de corte clínicamente significativos con una fuerte justificación.

**Mejor:** Mantenga la continuidad o utilice varias categorías.

### Error 33: intentar múltiples transformaciones
**Problema:** Probar muchas transformaciones hasta encontrar significado.

**Por qué es problemático:** Infla el error tipo I, es una forma de p-hacking.

**Mejor enfoque:**
- Preespecificar transformaciones
- Utilice transformaciones basadas en teoría.
- Corregir para pruebas múltiples si se explora

## Problemas de datos faltantes

### Error 34: Eliminación por lista de forma predeterminada
**Problema:** Eliminación automática de todos los casos a los que les faltan datos.

**Consecuencias:**
- Potencia reducida
- Posible sesgo si los datos no faltan completamente al azar (MCAR)

**Mejores enfoques:**
- Imputación múltiple
- Métodos de máxima verosimilitud
- Analizar patrones de falta.

### Error 35: Ignorar los mecanismos de datos faltantes
**Problema:** No considerar por qué faltan datos.

**Tipos:**
- MCAR (Falta completamente al azar): Es seguro eliminarlo
- MAR (Falta al azar): Puede imputar
- MNAR (Falta no al azar): puede sesgar los resultados

**Solución:** Analizar patrones, utilizar métodos apropiados, considerar análisis de sensibilidad.

## Problemas de publicación e informes

### Error 36: Informes selectivos
**Problema:** Reportar únicamente resultados significativos o análisis favorables.

**Consecuencias:**
- La literatura parece más consistente que la realidad.
- Metanálisis sesgados
- Esfuerzo de investigación desperdiciado

**Soluciones:**
- Preinscripción
- Informar todos los análisis.
- Utilizar pautas de presentación de informes (CONSORT, PRISMA, etc.)### Error 37: redondear a p < 0,05
**Problema:** Informar valores p exactos de forma selectiva (p. ej., p = 0,049 pero p < 0,05 para 0,051).

**Por qué es problemático:** Oculta los valores cercanos al umbral y permite evadir la detección de p-hacking.

**Mejor:** Informe siempre los valores p exactos.

### Error 38: No compartir datos
**Problema:** No hacer que los datos estén disponibles para verificación o reanálisis.

**Consecuencias:**
- No se pueden verificar los resultados
- No se puede incluir en los metanálisis
- Obstaculiza el progreso científico

**Mejores prácticas:** Comparta datos a menos que las preocupaciones de privacidad lo prohíban.

## Validación cruzada y generalización

### Error 39: Sin validación cruzada
**Problema:** Probar el modelo con los mismos datos utilizados para crearlo.

**Consecuencia:** Estimaciones de rendimiento demasiado optimistas.

**Soluciones:**
- Dividir datos (entrenamiento/prueba)
- Validación cruzada K-fold
- Muestra de validación independiente

### Error 40: fuga de datos
**Problema:** Información del equipo de prueba que se filtra en el entrenamiento.

**Ejemplos:**
- Normalizar antes de dividir
- Selección de funciones en el conjunto de datos completo
- Incluyendo información temporal.

**Consecuencia:** Métricas de rendimiento infladas.

**Prevención:** Todas las decisiones de preprocesamiento se toman utilizando únicamente datos de entrenamiento.

## Errores del metanálisis

### Escollo 41: Manzanas y Naranjas
**Problema:** Combinar estudios con diferentes diseños, poblaciones o medidas.

**Equilibrio:** Necesita homogeneidad pero también integralidad.

**Soluciones:**
- Criterios de inclusión claros
- Análisis de subgrupos
- Metarregresión para moderadores.

### Error 42: ignorar el sesgo de publicación
**Problema:** Los estudios publicados sobreestiman resultados significativos.

**Consecuencias:** Efectos sobreestimados en los metanálisis.

**Detección:**
- Gráficos de embudo
- Recortar y rellenar
- PET-PEESE
- Análisis de curva P

**Soluciones:**
- Incluir estudios inéditos
- Registrar reseñas
- Utilizar métodos de corrección de sesgos.

## Mejores prácticas generales

1. **Estudios previos al registro** - Distinga los confirmatorios de los exploratorios
2. **Informar de forma transparente**: todos los análisis, no solo los significativos
3. **Verifique los supuestos** - No aplique pruebas a ciegas
4. **Utilice pruebas apropiadas** - Haga coincidir la prueba con los datos y el diseño
5. **Tamaños de los efectos del informe**: no solo valores p
6. **Considere la importancia práctica**: no solo estadística
7. **Replicar hallazgos** - Un estudio rara vez es definitivo
8. **Compartir datos y código** - Habilitar verificación
9. **Utilice intervalos de confianza**: muestre incertidumbre
10. **Piense causalmente con cuidado**: la mayoría de las investigaciones son correlacionales