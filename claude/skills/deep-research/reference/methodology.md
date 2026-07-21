# Metodología de investigación profunda: proceso de 8 fases

## Descripción general

Este documento contiene la metodología detallada para realizar una investigación profunda. Las 8 fases representan un enfoque integral para recopilar, verificar y sintetizar información de múltiples fuentes.

---

## Fase 1: ALCANCE - Marco de la investigación

**Objetivo:** Definir los límites de la investigación y los criterios de éxito.

**Actividades:**
1. Descomponer la pregunta en componentes centrales.
2. Identificar las perspectivas de las partes interesadas
3. Definir los límites del alcance (lo que entra y lo que sale)
4. Establecer criterios de éxito
5. Enumere los supuestos clave para validar

**Aplicación Ultrathink:** Utilice un razonamiento ampliado para explorar múltiples encuadres de la pregunta antes de comprometerse con el alcance.

**Salida:** Documento de alcance estructurado con límites de investigación

---

## Fase 2: PLAN - Formulación de estrategias

**Objetivo:** Crear una hoja de ruta de investigación inteligente

**Actividades:**
1. Identificar fuentes primarias y secundarias
2. Mapear las dependencias del conocimiento (lo que se debe entender primero)
3. Cree una estrategia de consulta de búsqueda con variantes.
4. Enfoque de triangulación del plan
5. Estimar el tiempo/esfuerzo por fase
6. Definir puertas de calidad

**Gráfico de pensamientos:** Bifurquese en múltiples rutas de investigación potenciales y luego converja en una estrategia óptima.

**Resultado:** Plan de investigación con rutas de investigación priorizadas

---

## Fase 3: RECUPERACIÓN - Recopilación paralela de información

**Objetivo:** Recopilar sistemáticamente información de múltiples fuentes utilizando la ejecución paralela para obtener la máxima velocidad.

**CRÍTICO: Ejecute TODAS las búsquedas en paralelo usando un solo mensaje con múltiples llamadas a herramientas**

### Estrategia de descomposición de consultas

Antes de iniciar búsquedas, descomponga la pregunta de investigación en 5 a 10 ángulos de búsqueda independientes:

1. **Tema central (búsqueda semántica)** - Exploración del concepto principal basada en el significado
2. **Detalles técnicos (búsqueda de palabras clave)** - Términos específicos, API, implementaciones
3. **Desarrollos recientes (fecha filtrada)** - Novedades en 2024-2025
4. **Fuentes académicas (específicas del dominio)** - Artículos, investigaciones, análisis formales
5. **Perspectivas alternativas (comparación)** - Enfoques opuestos, críticas
6. **Fuentes estadísticas/datos** - Evidencia cuantitativa, métricas, puntos de referencia
7. **Análisis de la industria** - Aplicaciones comerciales, tendencias del mercado
8. **Análisis crítico/limitaciones**: problemas conocidos, modos de falla, casos extremos

### Protocolo de ejecución paralela

**Paso 1: Inicia TODAS las búsquedas simultáneamente (mensaje único)**

**CRÍTICO: Utilice la herramienta y los parámetros correctos para evitar errores**

Elija UN método de búsqueda por sesión de investigación:

**Opción A: usar WebSearch (integrado, no se requiere MCP)**
- Búsqueda web estándar con una cadena de consulta simple
- Parámetros:`query`(requerido)
- Opcional:`allowed_domains`, `blocked_domains`
- Ejemplo:`WebSearch(query="quantum computing 2025")`

**Opción B: Usar Exa MCP (si está disponible, es más potente)**
- Búsqueda avanzada semántica + palabras clave
- Nombre de la herramienta:`mcp__Exa__exa_search`
- Parámetros:`query`(requerido),`type`(automático/neural/palabra clave),`num_results`, `start_published_date`, `include_domains`
- Ejemplo:`mcp__Exa__exa_search(query="quantum computing", type="neural", num_results=10)`

**NUNCA mezcle estilos de parámetros**: esto provoca errores de "Parámetros de herramienta no válidos".

**Paso 2: generar agentes de inmersión profunda paralelos**

Utilice la herramienta Tarea con agentes de uso general (3-5 agentes) para:
- Análisis de artículos académicos (PDF, extracción detallada)
- Análisis profundos de la documentación (especificaciones técnicas, documentos API)
- Análisis de repositorios (ejemplos de código, implementaciones)
- Investigación de dominio especializada (requiere investigación de varios pasos)

**Ejemplo de ejecución paralela (usando WebSearch):**
```
[Single message with multiple tool calls]
- WebSearch(query="quantum computing 2025 state of the art")
- WebSearch(query="quantum computing limitations challenges")
- WebSearch(query="quantum computing commercial applications 2024-2025")
- WebSearch(query="quantum computing vs classical comparison")
- WebSearch(query="quantum error correction research", allowed_domains=["arxiv.org", "scholar.google.com"])
- Task(subagent_type="general-purpose", description="Analyze quantum computing papers", prompt="Deep dive into quantum computing academic papers from 2024-2025, extract key findings and methodologies")
- Task(subagent_type="general-purpose", description="Industry analysis", prompt="Analyze quantum computing industry reports and market data, identify commercial applications")
- Task(subagent_type="general-purpose", description="Technical challenges", prompt="Extract technical limitations and challenges from quantum computing research")
```

**Ejemplo de ejecución paralela (usando Exa MCP, si está disponible):**
```
[Single message with multiple tool calls]
- mcp__Exa__exa_search(query="quantum computing state of the art", type="neural", num_results=10, start_published_date="2024-01-01")
- mcp__Exa__exa_search(query="quantum computing limitations", type="keyword", num_results=10)
- mcp__Exa__exa_search(query="quantum computing commercial", type="auto", num_results=10, start_published_date="2024-01-01")
- mcp__Exa__exa_search(query="quantum error correction", type="neural", num_results=10, include_domains=["arxiv.org"])
- Task(subagent_type="general-purpose", description="Academic analysis", prompt="Analyze quantum computing academic papers")
```

**Paso 3: recopilar y organizar los resultados**

A medida que llegan los resultados:
1. Extraiga pasajes clave con metadatos de origen (título, URL, fecha, credibilidad)
2. Realizar un seguimiento de las lagunas de información que surjan
3. Siga tangentes prometedoras con búsquedas específicas adicionales
4. Mantener la diversidad de fuentes (mezcla académica, industrial, noticias, documentos técnicos)
5. Supervisar el umbral de calidad (consulte el patrón FFS a continuación)

### Patrón de búsqueda de primer fin (FFS)

**Finalización adaptativa basada en el umbral de calidad:**

**Puerta de calidad:** Continúe con la fase 4 cuando se alcance el PRIMER umbral:
- **Modo rápido:** Más de 10 fuentes con credibilidad promedio >60/100 O 2 minutos transcurridos
- **Modo estándar:** Más de 15 fuentes con credibilidad promedio >60/100 O 5 minutos transcurridos
- **Modo profundo:** Más de 25 fuentes con credibilidad promedio >70/100 O 10 minutos transcurridos
- **Modo UltraDeep:** Más de 30 fuentes con credibilidad promedio >75/100 O 15 minutos transcurridos

**Continuar búsquedas en segundo plano:**
- Si se alcanza el umbral antes de tiempo, continúe con las búsquedas paralelas en segundo plano.
- Fuentes adicionales utilizadas en la Fase 5 (SINTETIZACIÓN) para profundidad y diversidad
- Permite una progresión rápida sin sacrificar la minuciosidad

### Estándares de calidad

**Requisitos de diversidad de fuentes:**
- Mínimo 3 tipos de fuentes (académicas, industriales, noticias, documentos técnicos)
- Diversidad temporal (mezcla de fuentes recientes de 2024-2025 + fuentes fundamentales más antiguas)
- Diversidad de perspectivas (proponentes + críticos + análisis neutral)
- Diversidad geográfica (no sólo fuentes estadounidenses)

**Seguimiento de credibilidad:**
- Califique cada fuente de 0 a 100 usando source_evaluator.py
- Marcar fuentes de baja credibilidad (<40) para verificación adicional
- Priorizar fuentes de alta credibilidad (>80) para reclamos principales

**Técnicas:**
- Utilice WebSearch para obtener información actual (herramienta principal)
- Utilice WebFetch para profundizar en fuentes específicas (secundaria)
- Utilice la búsqueda Exa (a través de WebSearch con type="neural") para la exploración semántica
- Utilice Grep/Read para la documentación local
- Ejecutar código para análisis computacional (cuando sea necesario)
- Utilice la herramienta Tarea para generar agentes de recuperación paralelos (3-5 agentes)

**Salida:** Repositorio de información organizado con seguimiento de fuentes, puntajes de credibilidad y mapa de cobertura.

---

## Fase 4: TRIANGULAR - Verificación de referencias cruzadas

**Objetivo:** Validar la información a través de múltiples fuentes independientes.

**Actividades:**
1. Identificar reclamaciones que requieren verificación
2. Haga referencias cruzadas de más de 3 fuentes
3. Señalar contradicciones o incertidumbres
4. Evaluar la credibilidad de la fuente
5. Tenga en cuenta las áreas de consenso frente a las de debate
6. Estado de verificación de documentos por reclamo

**Estándares de calidad:**
- Las reclamaciones principales deben tener más de 3 fuentes independientes.
- Marcar cualquier información de fuente única
- Tenga en cuenta la actualidad de la información.
- Identificar posibles sesgos

**Salida:** Base de datos verificada con niveles de confianza

---

## Fase 4.5: REFINAMIENTO DEL ESQUEMA - Evolución dinámica (WebWeaver 2025)

**Objetivo:** Adaptar la dirección de la investigación en función de la evidencia descubierta.

**Problema resuelto:** Evita investigaciones "bloqueadas" cuando la evidencia apunta a conclusiones diferentes o descubre ángulos más importantes de los inicialmente planeados.

**Cuándo ejecutar:**
- **Solo modos Estándar/Profundo/UltraProfundo** (el modo Rápido omite esto)
- Después de que se complete la Fase 4 (TRIANGULADO)
- Antes de la Fase 5 (SINTETIZAR)

**Actividades:**

1. **Revisar el alcance inicial versus los hallazgos reales**
- Comparar el alcance de la Fase 1 con los descubrimientos de las Fases 3-4
- Identificar patrones inesperados o contradicciones.
- Tenga en cuenta los ángulos poco explorados que surgieron como críticos
- Marcar áreas sobreexploradas que resultaron menos importantes

2. **Evaluar la necesidad de adaptación del esquema**

**Señales de adaptación (CUALQUIER refinamiento desencadenante):**
- Los principales hallazgos contradicen las suposiciones iniciales.
- La evidencia revela un ángulo más importante que el previsto originalmente.
- Surgió un subtema crítico que no estaba en el plan original.
- La pregunta de investigación original era demasiado amplia/estrecha según la evidencia.
- Las fuentes discuten consistentemente aspectos que no están en el esquema inicial.

**Señales para mantener el esquema actual:**
- La evidencia se alinea con el alcance inicial.
- Todos los ángulos clave cubiertos adecuadamente
- Sin grandes lagunas ni sorpresas

3. **Refinar el esquema (si es necesario)**

**Actualizar estructura para reflejar la evidencia:**
- Agregue secciones para hallazgos inesperados pero importantes
- Degradar/eliminar secciones con evidencia insuficiente
- Reordenar las secciones según la solidez y la importancia de la evidencia.
- Ajustar los límites del alcance en función de lo que realmente se puede descubrir.

**Ejemplo de adaptación:**
   ```
   Original outline:
   1. Introduction
   2. Technical Architecture
   3. Performance Benchmarks
   4. Conclusion

   Refined after Phase 4 (evidence revealed security as critical):
   1. Introduction
   2. Technical Architecture
   3. **Security Vulnerabilities (NEW - major finding)**
   4. Performance Benchmarks (demoted - less critical than expected)
   5. **Real-World Failure Modes (NEW - pattern emerged)**
   6. Synthesis & Recommendations
   ```

4. **Relleno de huecos específicos (si se encuentran huecos importantes)**

Si el refinamiento del esquema revela lagunas críticas de conocimiento:
- Lanza 2 o 3 búsquedas específicas para ángulos recientemente identificados
- Solo recuperación rápida (no reiniciar la Fase 3 completa)
- Cuadro de tiempo de 2 a 5 minutos.
- Actualizar la triangulación solo para nueva evidencia.

5. **Justificación de la adaptación del documento**

Registre en el anexo de metodología:
- Lo que cambió en líneas generales
- Por qué cambió (razones basadas en evidencia)
- Qué investigaciones adicionales se realizaron (si las hubo)

**Estándares de calidad:**
- La adaptación debe estar basada en evidencia (citar fuentes específicas que impulsaron el cambio)
- No más del 50% del esquema de reestructuración (si se necesita más, el alcance estaba muy equivocado)
- Conserve el núcleo de la pregunta de investigación original (no se desvíe por completo hacia un tema diferente)
- Las nuevas secciones deben tener evidencia de respaldo ya recopilada.

**Resultado:** Esquema perfeccionado que refleja con precisión el panorama de la evidencia, listo para su síntesis.

**Advertencia anti-patrón:**
- ❌ NO adaptes el esquema basándose en especulaciones o "lo que sería interesante"
- ❌ NO agregue secciones sin evidencia de respaldo ya disponible
- ❌ NO abandones por completo la pregunta de investigación original
- ✅ ADAPTARSE cuando la evidencia indique claramente una mejor estructura
- ✅ DOCUMENTAR la justificación de los cambios
- ✅ Manténgase dentro del alcance del tema original

---

## Fase 5: SINTETIZACIÓN - Análisis profundo

**Objetivo:** Conectar conocimientos y generar una comprensión novedosa

**Actividades:**
1. Identificar patrones entre fuentes
2. Mapear relaciones entre conceptos.
3. Generar conocimientos más allá del material original
4. Crear marcos conceptuales
5. Construya estructuras argumentales
6. Desarrollar jerarquías de evidencia

**Integración Ultrathink:** Utilice razonamiento extendido para explorar conexiones no obvias e implicaciones de segundo orden.

**Resultado:** Comprensión sintetizada con generación de conocimientos

---

## Fase 6: CRÍTICA - Garantía de calidad

**Objetivo:** Evaluar rigurosamente la calidad de la investigación.

**Actividades:**
1. Revisión de la coherencia lógica
2. Verifique que la cita esté completa
3. Identificar brechas o debilidades
4. Evaluar el equilibrio y la objetividad
5. Verificar las afirmaciones contra las fuentes
6. Pruebe interpretaciones alternativas

**Preguntas del equipo rojo:**
- ¿Qué falta?
- ¿Qué podría estar mal?
- ¿Qué explicaciones alternativas existen?
- ¿Qué sesgos podrían estar presentes?
- ¿Qué contrafactuales deberían considerarse?

**Salida:** Informe crítico con recomendaciones de mejora.

---

## Fase 7: REFINE - Mejora iterativa

**Objetivo:** Abordar las brechas y fortalecer las áreas débiles

**Actividades:**
1. Realizar investigaciones adicionales para detectar lagunas
2. Fortalecer los argumentos débiles
3. Añade las perspectivas que faltan
4. Resolver contradicciones
5. Mejorar la claridad
6. Verificar el contenido revisado

**Resultado:** Investigación fortalecida con deficiencias abordadas

---

## Fase 8: PAQUETE - Generación de informes

**Objetivo:** Realizar investigaciones profesionales y procesables.

**Actividades:**
1. Informe estructurado con jerarquía clara
2. Redactar resumen ejecutivo
3. Desarrollar secciones detalladas
4. Crear visualizaciones (tablas, diagramas)
5. Compilar bibliografía completa.
6. Agregar apéndice de metodología

**Salida:** Informe de investigación completo listo para usar

---

## Funciones avanzadas

### Razonamiento gráfico de pensamientos

En lugar de pensar linealmente, opte por múltiples caminos de razonamiento:
- Explorar marcos alternativos en paralelo
- Buscar pistas tangenciales que puedan ser relevantes.
- Fusionar conocimientos de diferentes ramas
- Retroceder y revisar a medida que surja nueva información.

### Implementación de agentes paralelos

Utilice la herramienta Tarea para generar subagentes para:
- Recuperación de fuente paralela
- Rutas de verificación independientes
- Evaluación de hipótesis competitivas.
- Análisis de dominio especializado

### Control de profundidad adaptativo

Ajuste automáticamente la profundidad de la investigación según:
- Complejidad de la información
- Disponibilidad de fuente
- Limitaciones de tiempo
- Niveles de confianza

### Inteligencia de citas

Gestión inteligente de citas:
- Seguimiento de la procedencia de cada reclamo
- Enlace a fuentes originales.
- Evaluar la credibilidad de la fuente.
- Manejar fuentes conflictivas
- Generar bibliografías adecuadas.
