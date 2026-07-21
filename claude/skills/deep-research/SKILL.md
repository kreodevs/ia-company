---
name: deep-research
description: Realiza investigación de nivel empresarial con síntesis multi-fuente, seguimiento de citas y verificación. Usar cuando el usuario necesite análisis comprehensivo que requiera 10+ fuentes, afirmaciones verificadas o comparación de enfoques. Disparadores incluyen "deep research", "comprehensive analysis", "research report", "compare X vs Y" o "analyze trends". NO usar para búsquedas simples, debugging o preguntas respondibles con 1-2 búsquedas.
---
# Investigación profunda

<!-- INICIO DE BLOQUE DE CONTEXTO ESTÁTICO - Optimizado para almacenamiento en caché rápido -->
<!-- Todas las instrucciones estáticas, metodología y plantillas debajo de esta línea -->
<!-- Contenido dinámico (consultas de usuarios, resultados) agregado después de este bloque -->

## Instrucciones del sistema principal

**Propósito:** Entregar informes de investigación verificados y respaldados por citas a través de un proceso de 8 fases (Alcance → Planificar → Recuperar → Triangular → Sintetizar → Crítica → Refinar → Paquete) con puntuación de credibilidad de la fuente y gestión progresiva del contexto.

**Estrategia de contexto:** Esta habilidad utiliza las mejores prácticas de ingeniería de contexto de 2025:
- Instrucciones estáticas almacenadas en caché (esta sección)
- Divulgación progresiva (cargar referencias solo cuando sea necesario)
- Evite la "pérdida en el medio" (información crítica al inicio/final, no enterrada)
- Marcadores de sección explícitos para navegación contextual.

---

## Árbol de decisión (ejecutar primero)

```
Request Analysis
├─ Simple lookup? → STOP: Use WebSearch, not this skill
├─ Debugging? → STOP: Use standard tools, not this skill
└─ Complex analysis needed? → CONTINUE

Mode Selection
├─ Initial exploration? → quick (3 phases, 2-5 min)
├─ Standard research? → standard (6 phases, 5-10 min) [DEFAULT]
├─ Critical decision? → deep (8 phases, 10-20 min)
└─ Comprehensive review? → ultradeep (8+ phases, 20-45 min)

Execution Loop (per phase)
├─ Load phase instructions from [methodology](./reference/methodology.md#phase-N)
├─ Execute phase tasks
├─ Spawn parallel agents if applicable
└─ Update progress

Validation Gate
├─ Run `python scripts/validate_report.py --report [path]`
├─ Pass? → Deliver
└─ Fail? → Fix (max 2 attempts) → Still fails? → Escalate
```

---

## Flujo de trabajo (Aclarar → Planificar → Actuar → Verificar → Informar)

**PRINCIPIO DE AUTONOMÍA:** Esta habilidad opera de forma independiente. Inferir suposiciones a partir del contexto de la consulta. Deténgase únicamente en caso de errores críticos o consultas incomprensibles.

### 1. Aclarar (rara vez es necesario; se prefiere la autonomía)

**POR PREDETERMINADO: Procedimiento de forma autónoma. Derivar suposiciones a partir de señales de consulta.**

**Pregunte SÓLO si es CRÍTICAMENTE ambiguo:**
- La consulta es incomprensible (por ejemplo, "investiga el asunto")
- Requisitos contradictorios (por ejemplo, "análisis rápido y ultraprofundo de 50 fuentes")

**En caso de duda: PROCEDA con el modo estándar. El usuario redirigirá si es incorrecto.**

**Supuestos predeterminados:**
- Consulta técnica → Asumir audiencia técnica
- Consulta de comparación → Se necesita una perspectiva equilibrada
- Consulta de tendencias → Suponga 1 o 2 años recientes, a menos que se especifique
- El modo estándar es el predeterminado para la mayoría de las consultas.

---

### 2. Planificar

**Criterios de selección de modo:**
- **Rápido** (2-5 min): exploración, descripción general amplia, urgente
- **Estándar** (5-10 min): la mayoría de los casos de uso, profundidad/velocidad equilibrada [POR PREDETERMINADO]
- **Profundo** (10-20 min): decisiones importantes que necesitan una verificación exhaustiva
- **UltraDeep** (20-45 min): Análisis crítico, máximo rigor

**Anunciar el plan y ejecutarlo:**
- Indica brevemente: modo seleccionado, tiempo estimado, número de fuentes
- Ejemplo: "Iniciar investigación en modo estándar (5-10 min, 15-30 fuentes)"
- Continuar sin esperar la aprobación.

---

### 3. Actuar (Fase de Ejecución)

**Todos los modos se ejecutan:**
- Fase 1: ALCANCE - Definir límites ([método](./reference/methodology.md#phase-1-scope))
- Fase 3: RECUPERAR - Ejecución de búsqueda paralela (5-10 búsquedas simultáneas + agentes) ([método](./reference/methodology.md#phase-3-retrieve---parallel-information-gathering))
- Fase 8: PAQUETE - Generar informe usando [plantilla](./templates/report_template.md)

**Ejecución estándar/profunda/ultraprofunda:**
- Fase 2: PLANIFICAR - Formulación de estrategias
- Fase 4: TRIANGULAR - Verificar más de 3 fuentes por reclamo
- Fase 4.5: REFINAMIENTO DEL ESQUEMA - Adaptar estructura basada en evidencia (WebWeaver 2025) ([método](./reference/methodology.md#phase-45-outline-refinement---dynamic-evolution-webweaver-2025))
- Fase 5: SINTETIZAR - Generar conocimientos novedosos

**Ejecución profunda/ultraprofunda:**
- Fase 6: CRÍTICA - Análisis del equipo rojo
- Fase 7: REFINAR - Abordar las deficiencias

**Crítico: Evite la "pérdida en el medio"**
- Coloque los hallazgos clave al INICIO y FINAL de las secciones, no enterrados
- Utilice encabezados y marcadores explícitos
- Estructura: Resumen → Detalles → Conclusión (no Detalles intercalados)

**Carga de contexto progresivo:**
- Cargar secciones [metodología](./reference/methodology.md) a pedido
- Cargar [plantilla](./templates/report_template.md) solo para la Fase 8
- No incluir todo en línea - hacer referencia a archivos externos

**Protocolo Antialucinaciones (CRÍTICO):**
- **Fundamentación de la fuente**: Cada afirmación fáctica DEBE citar una fuente específica inmediatamente [N]
- **Límites claros**: Distinga entre HECHOS (de las fuentes) y SÍNTESIS (su análisis)
- **Marcadores explícitos**: utilice "Según [1]..." o "[1] informes..." para declaraciones basadas en la fuente.
- **Sin especulaciones sin etiquetas**: marque las inferencias como "Esto sugiere..." y no como "La investigación muestra..."
- **Verifique antes de citar**: si no está seguro de si la fuente realmente dice X, NO invente la cita
- **Cuando no esté seguro**: diga "No se encontraron fuentes para X" en lugar de inventar referencias.

**Requisitos de ejecución paralela (CRÍTICOS para la velocidad):****Fase 3 RECUPERACIÓN - Búsqueda paralela obligatoria:**
1. **Descomponer la consulta** en 5 a 10 ángulos de búsqueda independientes antes de CUALQUIER búsqueda
2. **Inicia TODAS las búsquedas en un solo mensaje** con Múltiples llamadas a herramientas (NO secuenciales)
3. **Monitoreo de umbral de calidad** para el patrón FFS:
- Seguimiento del recuento de fuentes y puntuación de credibilidad promedio.
- Proceder cuando se alcance el umbral (modo específico, ver metodología)
- Continuar las búsquedas en segundo plano para mayor profundidad.
4. **Genera de 3 a 5 agentes paralelos** usando la herramienta Tarea para investigaciones profundas

**Ejemplo de ejecución correcta:**
```
[Single message with 8+ parallel tool calls]
WebSearch #1: Core topic semantic
WebSearch #2: Technical keywords
WebSearch #3: Recent 2024-2025 filtered
WebSearch #4: Academic domains
WebSearch #5: Critical analysis
WebSearch #6: Industry trends
Task agent #1: Academic paper analysis
Task agent #2: Technical documentation deep dive
```

**❌ MAL (ejecución secuencial):**
```
WebSearch #1 → wait for results → WebSearch #2 → wait → WebSearch #3...
```

**✅ DERECHO (ejecución paralela):**
```
All searches + agents launched simultaneously in one message
```

---

### 4. Verificar (Ejecutar siempre)

**Paso 1: Verificación de citas (captura fuentes fabricadas)**

```bash
python scripts/verify_citations.py --report [path]
```

**Cheques:**
- Resolución DOI (verifica que la cita realmente existe)
- Coincidencia de título/año (detecta metadatos no coincidentes)
- Marca entradas sospechosas (2024+ sin DOI, sin URL, verificación fallida)

**Si se encuentran citas sospechosas:**
- Revisar las entradas marcadas manualmente
- Eliminar o reemplazar fuentes fabricadas
- Vuelva a ejecutar hasta que esté limpio.

**Paso 2: Validación de estructura y calidad**

```bash
python scripts/validate_report.py --report [path]
```

**8 comprobaciones automáticas:**
1. Extensión del resumen ejecutivo (50-250 palabras)
2. Secciones requeridas presentes (+ recomendado: tabla de reclamaciones, contraevidencia)
3. Citas formateadas [1], [2], [3]
4. La bibliografía coincide con las citas.
5. Sin texto de marcador de posición (TBD, TODO)
6. Número de palabras razonables (500-10000)
7. Mínimo 10 fuentes
8. Sin enlaces internos rotos

**Si falla:**
- Intención 1: formato/enlaces de corrección automática
- Intento 2: Revisión manual + corrección
- Después de 2 fallos: **PARAR** → Informar problemas → Preguntar al usuario

---

### 5. Informe

**CRÍTICO: Genere informes de rebajas COMPLETOS Y DETALLADOS**

**Organización de archivos (CRÍTICO - Accesibilidad limpia):**

**1. Crear carpeta organizada en documentos:**
- SIEMPRE cree una carpeta dedicada:`~/Documents/[TopicName]_Research_[YYYYMMDD]/`
- Extraiga el nombre limpio del tema de la pregunta de investigación (elimine caracteres especiales, use guiones bajos/CamelCase)
- Ejemplos:
- "investigación de psilocibina 2025" →`~/Documents/Psilocybin_Research_20251104/`
- "comparar React vs Vue" →`~/Documents/React_vs_Vue_Research_20251104/`
- "Tendencias de seguridad de la IA" →`~/Documents/AI_Safety_Trends_Research_20251104/`
- Si la carpeta existe, úsela; si no, crealo
- Esto garantiza una organización limpia y una fácil accesibilidad.

**2. Guarde todos los formatos en la misma carpeta:**

**Rebaja (fuente principal):**
- Guardar en:`[Documents folder]/research_report_[YYYYMMDD]_[topic_slug].md`
- También guardar copia en:`~/.claude/research_output/`(seguimiento interno)
- Informe completo y detallado con todos los hallazgos.

**HTML (Estilo McKinsey - SIEMPRE GENERAR):**
- Guardar en:`[Documents folder]/research_report_[YYYYMMDD]_[topic_slug].html`
- Utilice la plantilla de McKinsey: [mckinsey_template](./templates/mckinsey_report_template.html)
- Principios de diseño: Esquinas afiladas (SIN radio de borde), colores corporativos apagados (azul marino #003d5c, gris #f8f9fa), diseño ultracompacto, estructura de información primero
- Coloque el panel de métricas críticas en la parte superior (extraiga 3-4 hallazgos cuantitativos clave)
- Utilice tablas de datos para una presentación densa de información.
- Fuente base de 14px, espacio compacto, sin degradados ni colores decorativos
- **Gradientes de atribución (2025):** Envuelva cada cita [N] en`<span class="citation">`con un div de información sobre herramientas anidado que muestra los detalles de la fuente
- ABRIR en el navegador automáticamente después de la generación

**PDF (Impresión profesional - SIEMPRE GENERAR):**
- Guardar en:`[Documents folder]/research_report_[YYYYMMDD]_[topic_slug].pdf`
- Utilice la habilidad de generar PDF (a través de la herramienta Task con un agente de uso general)
- Formato profesional con encabezados, números de página.
- ABRIR en el visor de PDF predeterminado después de la generación

**3. Convención de nomenclatura de archivos:**
Todos los archivos usan el mismo nombre base para facilitar la comparación:
- `research_report_20251104_psilocybin_2025.md`
- `research_report_20251104_psilocybin_2025.html`
- `research_report_20251104_psilocybin_2025.pdf`

**Requisitos de longitud (ILIMITADO con montaje progresivo):**
- Modo rápido: más de 2000 palabras (umbral de calidad inicial)
- Modo estándar: más de 4000 palabras (análisis completo)
- Modo profundo: más de 6000 palabras (investigación exhaustiva)
- Modo UltraDeep: 10 000-50 000+ palabras (SIN LÍMITE SUPERIOR - tan completo como lo justifica la evidencia)

**Cómo funciona la longitud ilimitada:**
El ensamblaje de archivos progresivo permite CUALQUIER longitud de informe generando sección por sección.
Cada sección se escribe en el archivo inmediatamente (evitando límites de tokens de salida).
¿Temas complejos con muchos hallazgos? Genere 20, 30, 50+ hallazgos: ¡sin restricciones!

**Requisitos de contenido:**
- Utilice [plantilla](./templates/report_template.md) como estructura exacta
- Genere cada sección con la profundidad APROPIADA (determinada por evidencia, no por objetivos de palabras)
- Incluir datos específicos, estadísticas, fechas, números (no declaraciones vagas)
- Múltiples párrafos por hallazgo con evidencia (tanto como sea necesario)
- Cada sección recibe atención generacional enfocada.
- NO escriba resúmenes - escriba análisis COMPLETOS**Estándares de escritura:**
- **Basado en la narrativa**: escribe en prosa fluida. Cada hallazgo cuenta una historia con comienzo (contexto), desarrollo (evidencia) y final (implicaciones).
- **Precisión**: Cada palabra elegida deliberadamente, conlleva intención.
- **Economía**: sin tonterías, elimina gramática sofisticada y modificadores innecesarios
- **Claridad**: números exactos incluidos en frases ("El estudio demostró una reducción del 23% en la mortalidad"), no aislados en viñetas
- **Directividad**: Expresar encuentra sin adornos
- **Alta relación señal/ruido**: información densa, respeta el tiempo del lector

**Política de viñetas (aplicación antifatiga):**
- Utilice viñetas CON MAREZACIÓN: solo para listas distintas (nombres de productos, lista de empresas, pasos enumerados)
- NUNCA utiliza viñetas como entrega de contenido principal: fragmentan el pensamiento
- Cada sección de hallazgos requiere párrafos sustantivos en prosa (3-5+ párrafos como mínimo)
- Ejemplo: en lugar de "• Tamaño del mercado: 2.400 millones de dólares", escriba "El mercado global alcanzó los 2.400 millones de dólares en 2023, impulsado por la creciente demanda de los consumidores y los vientos de cola regulatorios [1]".

**Comprobación de calidad antifatiga (se aplica a sección CADA):**
Antes de considerar una sección completa, verifique:
- [ ] **Recuento de párrafos**: ≥3 párrafos para las secciones principales (## títulos)
- [ ] **Primero la prosa**: <20% del contenido son viñetas (≥80% debe ser prosa fluida)
- [ ] **Sin marcadores de posición**: Cero instancias de "El contenido continúa", "Debido a la longitud", "[Secciones X-Y]"
- [ ] **Rico en evidencia**: puntos de datos específicos, estadísticas, citas (no declaraciones vagas)
- [ ] **Densidad de citas**: reclamaciones principales citadas dentro de la misma frase

**Si CUALQUIER verificación falla:** Vuelva a generar la sección antes de pasar a la siguiente.

**Estándares de atribución de fuente (críticos para prevenir la fabricación):**
- **Cita inmediata**: cada afirmación fáctica seguida de [N] cita en la misma oración
- **Cite las fuentes directamente**: utilice "Según [1]..." o "[1] informes..." para declaraciones objetivas.
- **Distinguir hecho de síntesis**:
- ✅ BUENO: "La mortalidad disminuyó un 23% (p<0,01) en el grupo de tratamiento [1]."
- ❌ MALO: "Los estudios muestran que la mortalidad mejoró significativamente".
- **Sin atribuciones vagas**:
- ❌ NUNCA: "Las investigaciones sugieren...", "Los estudios muestran...", "Los expertos creen..."
- ✅ SIEMPRE: “Smith et al. (2024) encontraron…” [1], “Según datos de la FDA…” [2]
- **Etiqueta la especulación específicamente**:
- ✅ BUENO: "Esto sugiere un mecanismo potencial..." (análisis, no hecho)
- ❌ MALO: "El mecanismo es..." (presentado como un hecho sin citar)
- **Admitir incertidumbre**:
- ✅ BUENO: "No se encontraron fuentes dirigiéndose a X directamente".
- ❌ MALO: inventar una cita para llenar el vacío
- **Patrón de plantilla**: "[Afirmación específica con números/datos] [Cita]. [Análisis/implicaciones]".

**Entregar al usuario:**
1. Resumen ejecutivo (en línea en el chat)
2. Ruta de la carpeta organizada (por ejemplo, "Todos los archivos guardados en: ~/Documentos/Psilocybin_Research_20251104/")
3. Confirmación de los tres formatos generados:
- Rebaja (fuente)
- HTML (estilo McKinsey, abierto en el navegador)
- PDF (impresión profesional, abierto en el visor)
4. Resumen de evaluación de la calidad de las fuentes (recuento de fuentes)
5. Próximos pasos (si corresponde)

**Flujo de trabajo de generación: ensamblaje de archivos progresivo (longitud ilimitada)**

**Fase 8.1: Configuración**
```bash
# Extraer slug del tema desde la pregunta de investigación
# Create folder: ~/Documents/[TopicName]_Research_[YYYYMMDD]/
mkdir -p ~/Documents/[folder_name]

# Crear archivo markdown inicial con frontmatter
# File path: [folder]/research_report_[YYYYMMDD]_[slug].md
```

**Fase 8.2: Generación de secciones progresivas**

**ESTRATEGIA CRÍTICA:** Genere y escriba cada sección individualmente en un archivo utilizando herramientas de escritura/edición.
Esto permite una longitud ilimitada de los informes y al mismo tiempo mantiene cada generación manejable.

**PROTECCIÓN DEL LÍMITE DE TOKEN DE SALIDA (CRÍTICO - Código Claude Predeterminado: 32K):**

Límite predeterminado de Claude Code: 32 000 tokens de salida (≈24 000 palabras en total por ejecución de habilidad)
Este es un LÍMITE DIFÍCIL y no se puede cambiar dentro de la habilidad.

**Qué significa esto:**
- La producción total (su texto + todo el contenido de las llamadas a herramientas) debe ser <32 000 tokens
- 32.000 tokens ≈ 24.000 palabras como máximo
- Dejar margen de seguridad: Objetivo ≤20.000 palabras de producción total

**Tamaños de informes realistas por modo:**
- Modo rápido: 2000-4000 palabras ✅ (muy por debajo del límite)
- Modo estándar: 4000-8000 palabras ✅ (cómodamente por debajo del límite)
- Modo profundo: 8.000-15.000 palabras ✅ (alcanzable con cuidado)
- Modo UltraDeep: 15 000-20 000 palabras ⚠️ (en el límite, supervisar de cerca)

**Para informes >20.000 palabras:**
El usuario debe ejecutar la habilidad varias veces:
- Ejecución 1: "Generar Parte 1 (secciones 1-6)" → guarda en part1.md
- Ejecutar 2: "Generar la Parte 2 (secciones 7-12)" → guarda en part2.md
- El usuario combina manualmente o le pide a Claude que combine archivos

**Estrategia de continuación automática (duración ilimitada VERDADERA):**Cuando el informe supera las 18.000 palabras en una sola tirada:
1. Genere las secciones 1 a 10 (manténgase en menos de 18.000 palabras)
2. Guarde el archivo de estado de continuación con preservación del contexto.
3. Generar agente de continuación a través de la herramienta Tarea
4. Agente a continuación: Lee el estado → Genera el siguiente lote → Genera el siguiente agente si es necesario
5. La cadena continúa recursivamente hasta completarse.

Esto logra una longitud ILIMITADA respetando el límite de 32K por agente

**Inicializar seguimiento de citas:**
```
citations_used = []  # Maintain this list in working memory throughout
```

**Bucle de generación de secciones:**

**Patrón:** Generar contenido de sección → Usar la herramienta Escribir/Editar con ese contenido → Pasar a la siguiente sección
Cada llamada de escritura/edición contiene UNA sección (≤2000 palabras por llamada)

1. **Resumen ejecutivo** (200-400 palabras)
- Generar contenido de sección
- Herramienta: Escribir (archivo, contenido = frontmatter + Resumen ejecutivo)
- Seguimiento de las citas utilizadas.
- Progreso: " ✓ Resumen Ejecutivo "

2. **Introducción** (400-800 palabras)
- Generar contenido de sección
- Herramienta: Editar (archivo, antiguo=última línea, nuevo=antiguo + sección de Introducción)
- Seguimiento de las citas utilizadas.
- Progreso: " ✓ Introducción "

3. **Encontrar 1** (600-2000 palabras)
- Generar hallazgo completo.
- Herramienta: Editar (archivo, agregar Hallazgo 1)
- Seguimiento de las citas utilizadas.
- Progreso: " ✓ Encontrar 1 "

4. **Encontrar 2** (600-2000 palabras)
- Generar hallazgo completo.
- Herramienta: Editar (archivo, agregar Hallazgo 2)
- Seguimiento de las citas utilizadas.
- Progreso: " ✓ Encontrar 2 "

... Continuar para TODOS los hallazgos (cada hallazgo = una llamada a la herramienta de edición, ≤2000 palabras)

**CRÍTICO:** Si tiene 10 hallazgos × 1500 palabras cada uno = 15 000 palabras de hallazgos
Esto está BIEN porque cada llamada de edición tiene solo 1500 palabras (menos del límite de 2000 palabras por llamada de herramienta)
El ARCHIVO crece a 15.000 palabras, pero ninguna llamada de herramienta excede los límites

4. **Síntesis y conocimientos**
- Generar: conocimientos novedosos más allá de las declaraciones fuente (siempre que sean necesarios para la síntesis)
- Herramienta: Editar (añadir al archivo)
- Seguimiento: extraer citas, agregar a citations_used
- Progreso: "Síntesis Generada ✓"

5. **Limitaciones y advertencias**
- Generar: Contraevidencias, lagunas, incertidumbres (profundidad adecuada)
- Herramienta: Editar (añadir al archivo)
- Seguimiento: extraer citas, agregar a citations_used
- Progreso: "Limitaciones Generadas ✓"

6. **Recomendaciones**
- Generar: Acciones inmediatas, próximos pasos, necesidades de investigación (profundidad adecuada)
- Herramienta: Editar (añadir al archivo)
- Seguimiento: extraer citas, agregar a citations_used
- Progreso: "Recomendaciones Generadas ✓"

7. **Bibliografía (CRÍTICA - TODAS las citas)**
- Generar: bibliografía COMPLETA con CADA cita de la lista citations_used
- Formato: [1], [2], [3]... [N] - cada cita obtiene entrada completa
- Verificación: verifique la lista de citas_usadas; si la lista contiene del [1] al [73], genere las 73 entradas
- SIN rangos ([1-50]), SIN marcadores de posición ("Citas adicionales"), SIN truncamiento
- Herramienta: Editar (añadir al archivo)
- Progreso: "Bibliografía Generada ✓ (N citas)"

8. **Apéndice de Metodología**
- Generar: Proceso de investigación, enfoque de verificación (profundidad adecuada)
- Herramienta: Editar (añadir al archivo)
- Avance: “Metodología Generada ✓”

**Fase 8.3: Punto de decisión de continuación automática**

Después de generar secciones, verifique el recuento de palabras:

**Si la producción total es ≤18 000 palabras:** Complete normalmente
- Generar bibliografía (todas las citas)
- Generar Metodología
- Verificar informe completo
- Guardar copia en ~/.claude/research_output/
- ¡Listo! ✓

**Si la producción total supera las 18 000 palabras:** Protocolo de continuación automático

**Paso 1: Guardar el estado a continuación**
Crear archivo:`~/.claude/research_output/continuation_state_[report_id].json`

```json
{
  "version": "2.1.1",
  "report_id": "[unique_id]",
  "file_path": "[absolute_path_to_report.md]",
  "mode": "[quick|standard|deep|ultradeep]",

  "progress": {
    "sections_completed": [list of section IDs done],
    "total_planned_sections": [total count],
    "word_count_so_far": [current word count],
    "continuation_count": [which continuation this is, starts at 1]
  },

  "citations": {
    "used": [1, 2, 3, ..., N],
    "next_number": [N+1],
    "bibliography_entries": [
      "[1] Full citation entry",
      "[2] Full citation entry",
      ...
    ]
  },

  "research_context": {
    "research_question": "[original question]",
    "key_themes": ["theme1", "theme2", "theme3"],
    "main_findings_summary": [
      "Finding 1: [100-word summary]",
      "Finding 2: [100-word summary]",
      ...
    ],
    "narrative_arc": "[Current position in story: beginning/middle/conclusion]"
  },

  "quality_metrics": {
    "avg_words_per_finding": [calculated average],
    "citation_density": [citations per 1000 words],
    "prose_vs_bullets_ratio": [e.g., "85% prose"],
    "writing_style": "technical-precise-data-driven"
  },

  "next_sections": [
    {"id": N, "type": "finding", "title": "Finding X", "target_words": 1500},
    {"id": N+1, "type": "synthesis", "title": "Synthesis", "target_words": 1000},
    ...
  ]
}
```

**Paso 2: Agente de continuación de generación**

Utilice la herramienta Tarea con agente de uso general:

```
Task(
  subagent_type="general-purpose",
  description="Continue deep-research report generation",
  prompt="""
CONTINUATION TASK: You are continuing an existing deep-research report.

CRITICAL INSTRUCTIONS:
1. Read continuation state file: ~/.claude/research_output/continuation_state_[report_id].json
2. Read existing report to understand context: [file_path from state]
3. Read LAST 3 completed sections to understand flow and style
4. Load research context: themes, narrative arc, writing style from state
5. Continue citation numbering from state.citations.next_number
6. Maintain quality metrics from state (avg words, citation density, prose ratio)

CONTEXT PRESERVATION:
- Research question: [from state]
- Key themes established: [from state]
- Findings so far: [summaries from state]
- Narrative position: [from state]
- Writing style: [from state]

YOUR TASK:
Generate next batch of sections (stay under 18,000 words):
[List next_sections from state]

Use Write/Edit tools to append to existing file: [file_path]

QUALITY GATES (verify before each section):
- Words per section: Within ±20% of [avg_words_per_finding]
- Citation density: Match [citation_density] ±0.5 per 1K words
- Prose ratio: Maintain ≥80% prose (not bullets)
- Theme alignment: Section ties to key_themes
- Style consistency: Match [writing_style]

After generating sections:
- If more sections remain: Update state, spawn next continuation agent
- If final sections: Generate complete bibliography, verify report, cleanup state file

HANDOFF PROTOCOL (if spawning next agent):
1. Update continuation_state.json with new progress
2. Add new citations to state
3. Add summaries of new findings to state
4. Update quality metrics
5. Spawn next agent with same instructions
"""
)
```

**Paso 3: Informar el estado a continuación**
Dile al usuario:
```
📊 Report Generation: Part 1 Complete (N sections, X words)
🔄 Auto-continuing via spawned agent...
   Next batch: [section list]
   Progress: [X%] complete
```

**Fase 8.4: Protocolo de Calidad del Agente de Continuación**

Cuando comienza el agente a continuación:

**Carga de contexto (CRÍTICO):**
1. Lea continuation_state.json → Cargar TODO el contexto
2. Leer el archivo de informe existente → Revisar las últimas 3 secciones
3. Patrones adicionales:
- Complejidad de la estructura de la oración.
- Terminología técnica utilizada
- Patrones de colocación de citas.
- Estilo de transición de párrafo

**Lista de verificación previa a la generación:**
- [ ] Contexto de investigación cargado (temas, pregunta, arco narrativo)
- [] Se revisaron las secciones anteriores para ver el flujo.
- [] Numeración de citas cargadas (comienza desde N+1)
- [] Objetivos de calidad cargados (palabras, densidad, estilo)
- [] Entender dónde en el arco narrativo (principio/medio/final)**Generación por sección:**
1. Generar contenido de sección
2. Controles de calidad:
- Recuento de palabras: dentro del objetivo ±20%
- Densidad de citas: Coincide con la tasa establecida
- Proporción de prosa: ≥80% prosa
- Conexión del tema: Vínculos con key_themes
- Coincidencia de estilo: coherente con Quality_metrics.writing_style
3. Si CUALQUIER verificación falla: Regenerar sección
4. Si pasa: escribir en el archivo, actualizar el estado

**Decisión de traspaso:**
- Calculadora: recuento de palabras actuales + secciones restantes × avg_words_per_section
- Si total < 18K: generar todas las secciones restantes + finalizar
- Si el total > 18K: generar lote parcial, actualizar estado, generar el siguiente agente

**Responsabilidades finales del agente:**
- Generar secciones de contenido final.
- Genere bibliografía COMPLETA utilizando TODAS las citas de state.citations.bibliography_entries
- Lea el informe completo recopilado.
- Ejecutar validación: scripts de python/validate_report.py --report [ruta]
- Eliminar continuation_state.json (limpieza)
- Informe completo al usuario con métricas.

**Antifatiga incorporada:**
Cada agente genera fragmentos manejables (≤18.000 palabras), manteniendo la calidad.
La preservación del contexto garantiza la coherencia entre los límites de continuación.

**Generar HTML (estilo McKinsey)**
1. Lea la plantilla de McKinsey de`./templates/mckinsey_report_template.html`
2. Extraiga de 3 a 4 métricas cuantitativas clave de los hallazgos para el panel
3. **Utilice el script Python para la conversión de MD a HTML:**

   ```bash
   cd ~/.claude/skills/deep-research
   python scripts/md_to_html.py [markdown_report_path]
   ```

El guión devuelve dos partes:
- **Parte A ({{CONTENT}}):** Todas las secciones excepto Bibliografía, correctamente convertidas a HTML
- **Parte B ({{BIBLIOGRAFÍA}}):** Sólo sección de bibliografía, con formato HTML

**CRÍTICO:** El script maneja TODAS las conversiones automáticamente:
- Encabezados: ## →`<div class="section"><h2 class="section-title">`, ### → `<h3 class="subsection-title">`
- Listas: viñetas de rebajas →`<ul><li>`con anidamiento adecuado
- Tablas: Tablas de rebajas →`<table>`estafador/cuerpo
- Párrafos: texto envuelto en etiquetas`<p>`
- Negrita/cursiva: **texto** →`<strong>`, *texto* →`<em>`
- Citas: [N] conservada para la conversión de información sobre herramientas en el paso 4

4. **Agregar información sobre herramientas de citas (gradientes de atribución):**
Para cada [N] cita en {{CONTENT}} (sin bibliografía), opcionalmente agregue información sobre herramientas interactivas:
   ```html
   <span class="citation">[N]
     <span class="citation-tooltip">
       <div class="tooltip-title">[Source Title]</div>
       <div class="tooltip-source">[Author/Publisher]</div>
       <div class="tooltip-claim">
         <div class="tooltip-claim-label">Supports Claim:</div>
         [Extract sentence with this citation]
       </div>
     </span>
   </span>
   ```
NOTA: Este paso es opcional para la velocidad. Las citas básicas [N] son ​​suficientes.

5. Vuelva a colocar los marcadores de posición en la plantilla:
- {{TITLE}} - Título del informe (extracto del primer ## encabezado en MD)
- {{DATE}} - Fecha de generación (formato AAAA-MM-DD)
- {{SOURCE_COUNT}} - Número de fuentes únicas
- {{METRICS_DASHBOARD}} - Métricas HTML del paso 2
- {{CONTENT}} - HTML de la Parte A (salida del script)
- {{BIBLIOGRAFÍA}} - HTML de la Parte B (salida del script)

6. **CRÍTICO: NO HAY EMOJIS** - Elimina los caracteres emoji del HTML final

7. Guardar en:`[folder]/research_report_[YYYYMMDD]_[slug].html`

8. **Verificar HTML (OBLIGATORIO):**
   ```bash
   python scripts/verify_html.py --html [html_path] --md [md_path]
   ```
- Verificar pases: continuar con el paso 9
- La comprobación falla: corrige errores y vuelve a ejecutar la verificación.

9. Abrir en el navegador:`open [html_path]`

**Generar PDF**
1. Utilice la herramienta Tarea con agente de uso general
2. Invocar la habilidad de generar pdf con Markdown como entrada
3. Guardar en:`[folder]/research_report_[YYYYMMDD]_[slug].pdf`
4. El PDF se abrirá automáticamente cuando esté completo

---

## Contrato de salida

**Formato:** Informe de rebajas completo siguiendo [plantilla](./templates/report_template.md) EXACTAMENTE

**Secciones requeridas (todas deben estar detalladas):**
- Resumen ejecutivo (2-3 párrafos concisos, 50-250 palabras)
- Introducción (2-3 párrafos: pregunta, alcance, metodología, supuestos)
- Análisis principal (4-8 hallazgos, cada uno de 300-500 palabras con citas [1], [2], [3])
- Síntesis e ideas (500-1000 palabras: patrones, ideas novedosas, implicaciones)
- Limitaciones y advertencias (2-3 párrafos: lagunas, suposiciones, incertidumbres)
- Recomendaciones (3-5 acciones inmediatas, 3-5 próximos pasos, 3-5 investigaciones adicionales)
- **Bibliografía (CRÍTICA - ver las reglas a continuación)**
- Apéndice de Metodología (2-3 párrafos: proceso, fuentes, verificación)**Requisitos de bibliografía (TOLERANCIA CERO - El informe es INUTILIZABLE sin bibliografía completa):**
- ✅ DEBE incluir CADA cita [N] utilizada en el cuerpo del informe (si el informe tiene [1]-[50], escriba las 50 entradas)
- ✅ Formato: [N] Autor/Org (Año). "Título". Publicación. URL (obtenido: fecha)
- ✅ Cada entrada en su propia línea, completa con todos los metadatos
- ❌ SIN marcadores de posición: NUNCA utilice "[8-75] Citas adicionales", "...continuar...", "etc.", "[Continuar con fuentes...]"
- ❌ SIN rangos: Escriba [3], [4], [5]... individualmente, NO "[3-50]"
- ❌ NO truncamiento: si se citan 30 fuentes, escriba las 30 entradas completas
- ⚠️ La validación FALLARÁ si la bibliografía contiene marcadores de posición o faltan citas
- ⚠️ El informe es BASURA sin bibliografía completa; no hay forma de verificar las afirmaciones

**Estrictamente prohibido:**
- Texto de marcador de posición (TBD, TODO, [cita requerida])
- Reclamaciones importantes no citadas
- Enlaces rotos
- Faltan secciones requeridas
- **Resúmenes breves en lugar de análisis detallados**
- **Declaraciones vagas sin evidencia específica**

**Estándares de redacción (críticos):**
- **Basado en la narrativa**: escriba en prosa fluida con oraciones completas que desarrollen la comprensión progresivamente.
- **Precisión**: elija cada palabra deliberadamente; cada palabra debe tener intención
- **Economía**: Elimina tonterías, adjetivos innecesarios y gramática sofisticada
- **Claridad**: Utilice términos técnicos precisos, evite la ambigüedad. Insertar números exactos en oraciones, no viñetas
- **Directo**: Exponga los hallazgos claramente sin adornos
- **Señal-a-ruido**: Alta densidad de información, respeta el tiempo del lector
- **Disciplina con viñetas**: utilice viñetas solo para listas distintas (productos, empresas, pasos). Predeterminado a párrafos en prosa
- **Ejemplos de precisión**:
  - Malo: "resultados significativamente mejorados" → Bueno: "reducción de la mortalidad en un 23% (p<0,01)"
  - Malo: "varios estudios sugieren" → Bueno: "5 ECA (n=1.847) lo demuestran"
  - Malo: "potencialmente beneficioso" → Bueno: "aumentó el biomarcador X en un 15%"
  - Malo: "• Mercado: 2.400 millones de dólares" → Bueno: "El mercado alcanzó los 2.400 millones de dólares en 2023, impulsado por la demanda de los consumidores [1]".

**Puertas de calidad (aplicadas por el validador):**
- Mínimo 2.000 palabras (modo estándar)
- Puntaje de credibilidad promedio >60/100
- Más de 3 fuentes por reclamo importante
- Distinción entre hechos claros y análisis
- Todas las secciones presentes y detalladas.

---

## Manejo de errores y reglas de detención

**Deténgase inmediatamente si:**
- 2 fallas de validación en el mismo error → Pausar, informar, preguntar al usuario
- <5 fuentes después de una búsqueda exhaustiva → Limitación del informe, dirección de solicitud
- El usuario interrumpe/cambia el alcance → Confirma la nueva dirección

**Degradación elegante:**
- 5-10 fuentes → Nota sobre limitaciones, continúa con verificación adicional
- Se alcanzó el límite de tiempo → Paquete de resultados parciales, lagunas en los documentos
- Asunto crítico de alta prioridad → Abordar inmediatamente

**Formato de error:**
```
⚠️ Issue: [Description]
📊 Context: [What was attempted]
🔍 Tried: [Resolution attempts]
💡 Options:
   1. [Option 1]
   2. [Option 2]
   3. [Option 3]
```

---

## Estándares de calidad (siempre hacer cumplir)

Todo informe debe:
- Más de 10 fuentes (documento si hay menos)
- Más de 3 fuentes por reclamo importante
- Resumen ejecutivo <250 palabras
- Citas completas con URL.
- Evaluación de credibilidad
- Sección de limitaciones
- Metodología documentada
- Sin marcadores de posición

**Prioridad:** Minuciosidad sobre velocidad. Calidad > velocidad.

---

## Entradas y supuestos

**Requerido:**
- Pregunta de investigación (cadena)

**Opcional:**
- Modo (rápido/estándar/profundo/ultraprofundo)
- Limitaciones de tiempo
- Perspectivas/fuentes requeridas
- Formato de salida

**Supuestos:**
- El usuario requiere información verificada y respaldada por citas
- 10-50 fuentes disponibles sobre el tema
- Inversión de tiempo: 5-45 minutos

---

## Cuándo usar/NO usar

**Usar cuando:**
- Análisis completo (se necesitan más de 10 fuentes)
- Comparar tecnologías/enfoques/estrategias
- Revisiones de última generación
- Investigación multiperspectiva
- Decisiones técnicas
- Análisis de mercado/tendencias

**NO usar:**
- Búsquedas simples (use WebSearch)
- Depuración (use herramientas estándar)
- 1-2 respuestas de búsqueda
- Respuestas rápidas urgentes

---

## Scripts (sin conexión, solo Python stdlib)

**Ubicación:**`./scripts/`

- **research_engine.py** - Motor de orquestación
- **validate_report.py** - Validación de calidad (8 comprobaciones)
- **citation_manager.py** - Seguimiento de citas
- **source_evaluator.py** - Puntuación de credibilidad (0-100)

**No se requieren dependencias externas.**

---

## Referencias progresivas (carga bajo demanda)**No incluyes estos - solo referencia:**
- [Metodología completa](./reference/methodology.md) - Detalles de 8 fases
- [Plantilla de informe](./templates/report_template.md) - Estructura de salida
- [README](./README.md) - Documentos de uso
- [Inicio rápido](./QUICK_START.md) - Referencia rápida
- [Análisis competitivo](./COMPETITIVE_ANALYSIS.md) - vs OpenAI/Gemini

**Gestión de contexto:** Cargue archivos bajo demanda solo para la fase actual. No precargue todo el contenido.

---

<!-- FIN DEL BLOQUE DE CONTEXTO ESTÁTICO -->
<!-- ⚡ El contenido anterior se puede almacenar en caché (>1024 tokens, estático) -->
<!-- 📝 Abajo: Contenido dinámico (consultas de usuarios, datos recuperados, informes generados) -->
<!-- Esta estructura permite una reducción de la latencia del 85 % mediante el almacenamiento en caché rápido -->

---

## Zona de ejecución dinámica

**Procesamiento de consultas de usuarios:**
[La pregunta de investigación del usuario se insertará aquí durante la ejecución]

**Información recuperada:**
[Los resultados de la búsqueda y las fuentes se acumularán aquí]

**Análisis generado:**
[Hallazgos, síntesis y contenido del informe generado aquí]

**Nota:** Esta sección permanece vacía en la definición de habilidad. Contenido completado solo durante el tiempo de ejecución.