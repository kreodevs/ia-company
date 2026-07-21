---
name: deep-reading-analyst
description: "Marco integral para un análisis profundo de artículos, artículos y contenido extenso utilizando más de 10 modelos de pensamiento (SCQA, 5W2H, pensamiento crítico, inversión, modelos mentales, primeros principios, pensamiento sistémico, seis sombreros para pensar). Úselo cuando los usuarios quieran: (1) comprender profundamente artículos/contenidos complejos, (2) analizar argumentos e identificar fallas lógicas, (3) extraer conocimientos prácticos de materiales de lectura, (4) crear notas de estudio o resúmenes de aprendizaje, (5) comparar múltiples fuentes, (6) transformar el conocimiento en aplicaciones prácticas o (7) aplicar marcos de pensamiento específicos. Se activa con frases como "analizar este artículo", "ayúdame a comprender", "profundizar en", "extraer información de", "usar [nombre del marco]" o cuando los usuarios proporcionan URL o contenido de formato largo para su análisis."
---
# Analista de lectura profunda

Transforma la lectura superficial en aprendizaje profundo mediante un análisis sistemático utilizando más de 10 marcos de pensamiento probados. Guía a los usuarios desde la comprensión hasta la aplicación a través de flujos de trabajo estructurados.

## Arsenal marco

### Análisis rápido (15min)
- 📋 **SCQA** - Pensamiento estructurado (Situación-Complicación-Pregunta-Respuesta)
- 🔍 **5W2H** - Verificación de integridad (qué, por qué, quién, cuándo, dónde, cómo, cuánto)

### Análisis estándar (30 min)
- 🎯 **Pensamiento crítico** - Evaluación de argumentos
- 🔄 **Pensamiento Inverso** - Identificación de riesgos

### Análisis profundo (60min)
- 🧠 **Modelos mentales** - Análisis multiperspectiva (física, biología, psicología, economía)
- ⚡ **Primeros principios** - Extracción de esencias
- 🔗 **Pensamiento sistémico** - Mapeo de relaciones
- 🎨 **Seis sombreros para pensar** - Creatividad estructurada

### Análisis de investigación (120 min+)
- 📊 **Comparación entre fuentes** - Síntesis de varios artículos

## Árbol de decisión del flujo de trabajo

```
User provides content
    ↓
Ask: Purpose + Depth Level + Preferred Frameworks
    ↓
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Level 1       │   Level 2       │   Level 3       │   Level 4       │
│   Quick         │   Standard      │   Deep          │   Research      │
│   15min         │   30min         │   60min         │   120min+       │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ • SCQA          │ Level 1 +       │ Level 2 +       │ Level 3 +       │
│ • 5W2H          │ • Critical      │ • Mental Models │ • Cross-source  │
│ • Structure     │ • Inversion     │ • First Princ.  │ • Web search    │
│                 │                 │ • Systems       │ • Synthesis     │
│                 │                 │ • Six Hats      │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## Paso 1: Inicializar el análisis

**Preguntar al usuario (conversacionalmente):**
1. "¿Cuál es tu principal objetivo al leer esto?"
   - Resolución de problemas / Aprendizaje / Escritura / Toma de decisiones / Curiosidad
2. "¿A qué profundidad quieres llegar?"
   - Rápido (15 min) / Estándar (30 min) / Profundo (60 min) / Investigación (120 min+)
3. "¿Algún marco específico que le gustaría utilizar?"
   - Sugerir según el tipo de contenido (consulte la Guía de selección de marcos a continuación)

**Predeterminado si no hay respuesta:** Nivel 2 (modo estándar) con marcos seleccionados automáticamente

### Guía de selección de marcos

Según el tipo de contenido, realice sugerencias automáticas:

```markdown
📄 Strategy/Business articles → SCQA + Mental Models + Inversion
📊 Research papers → 5W2H + Critical Thinking + Systems Thinking
💡 How-to guides → SCQA + 5W2H + First Principles
🎯 Opinion pieces → Critical Thinking + Inversion + Six Hats
📈 Case studies → SCQA + Mental Models + Systems Thinking
```

## Paso 2: Comprensión estructural

**Empiece siempre aquí independientemente del nivel de profundidad.**

### Fase 2A: Estructura Básica

```markdown
📄 Content Type: [Article/Paper/Report/Guide]
⏱️ Estimated reading time: [X minutes]
🎯 Core Thesis: [One sentence]

Structure Overview:
├─ Main Argument 1
│   ├─ Supporting point 1.1
│   └─ Supporting point 1.2
├─ Main Argument 2
└─ Main Argument 3

Key Concepts: [3-5 terms with brief definitions]
```

### Fase 2B: Análisis SCQA (Marco rápido)

Cargue `references/scqa_framework.md` y aplique:

```markdown
## Estructura SCQA

**S (Situation)**: [Background/context the article establishes]
**C (Complication)**: [Problem/challenge identified]
**Q (Question)**: [Core question being addressed]
**A (Answer)**: [Main solution/conclusion]

📊 Structure Quality:
- Clarity: [★★★★☆]
- Logic flow: [★★★★★]
- Completeness: [★★★☆☆]
```

### Fase 2C: Verificación de integridad de 5W2H (si es nivel 1+)

Escaneo rápido usando `references/5w2h_analysis.md`:

```markdown
## Completitud de la información

✅ Well-covered: [What, Why, How]
⚠️  Partially covered: [Who, When]
❌ Missing: [Where, How much]

🔴 Critical gaps: [List 1-2 most important missing pieces]
```

## Paso 3: Aplicar modelos de pensamiento

**Seleccione según el nivel de profundidad y la preferencia del usuario:**

### Nivel 1 (Rápido - 15 min)
**Núcleo**: Estructura + SCQA + Comprobación rápida 5W2H

Salida:
- Desglose del SCQA
- Lagunas de información (de 5W2H)
- 3 ideas principales
- 1 elemento de acción inmediata

### Nivel 2 (Estándar - 30 min)
**Agregar**: Pensamiento crítico + Inversión

Cargar y aplicar:
- `references/critical_thinking.md`:
  - Evaluación de la calidad del argumento.
  - Identificación de fallas lógicas.
  - Evaluación de evidencia
  - Perspectivas alternativas

- `references/inversion_thinking.md`:
  - ¿Cómo asegurar el fracaso? (invierte el consejo)
  - ¿Qué suposiciones si son erróneas?
  - Riesgos perdidos
  - Análisis pre-mortem

```markdown
## Análisis crítico

### Argument Strength: [X/10]
Strengths:
- [Point 1]

Weaknesses:
- [Point 1]

Logical fallacies detected:
- [If any]

## Análisis de inversión

🚨 How this could fail:
1. [Failure mode 1] → Mitigation: [...]
2. [Failure mode 2] → Mitigation: [...]

Missing risk factors:
- [Risk 1]
```

### Nivel 3 (Profundo - 60 min)
**Agregar**: Modelos mentales + Primeros principios + Sistemas + Seis sombreros

Cargar y aplicar:
- `references/mental_models.md`:
  - Seleccione 3-5 modelos relevantes de diferentes disciplinas
  - Aplicar cada lente al contenido.
  - Identificar conocimientos entre modelos

- `references/first_principles.md`:
  - Desnúdate de las verdades fundamentales.
  - Identificar los supuestos centrales
  - Reconstruir la comprensión desde la base.

- `references/systems_thinking.md`:
  - Mapa de relaciones y bucles de retroalimentación.
  - Identificar puntos de apalancamiento
  - Ver el panorama general

- `references/six_hats.md`:
  - Blanco (hechos), Rojo (sentimientos), Negro (precaución)
  - Amarillo (beneficios), Verde (creatividad), Azul (proceso)

```markdown
## Multi-Model Analysis

### Mental Models Applied:
1. **[Model 1 from X discipline]**
   Insight: [...]

2. **[Model 2 from Y discipline]**
   Insight: [...]

3. **[Model 3 from Z discipline]**
   Insight: [...]

Cross-model pattern: [Key insight from combining models]

### First Principles Breakdown:
Core assumptions:
1. [Assumption 1] → Valid: [Yes/No/Conditional]
2. [Assumption 2] → Valid: [Yes/No/Conditional]

Fundamental truth: [What remains after stripping assumptions]

### Systems Map:
```
[Variable A] ──refuerza──> [Variable B]
      ↑ |
      |                          |
   equilibra refuerza
      |                          |
      └─────────<────────────────┘

Punto de influencia: [Donde pequeños cambios = gran impacto]
```

### Six Hats Perspective:
🤍 Facts: [Objective data]
❤️ Feelings: [Intuitive response]
🖤 Cautions: [Risks and downsides]
💛 Benefits: [Positive aspects]
💚 Ideas: [Creative alternatives]
💙 Process: [Meta-thinking]
```

### Nivel 4 (Investigación - 120 min+)
**Agregar**: Comparación entre fuentes a través de web_search

Utilice web_search para encontrar 2 o 3 fuentes relacionadas, luego:
- Cargar `references/comparison_matrix.md`
- Comparar SCQA entre fuentes
- Identificar consenso versus divergencia
- Sintetizar la perspectiva integrada.

```markdown
## Multi-Source Analysis

### Source 1: [This article]
S-C-Q-A: [Summary]
Key claim: [...]

### Source 2: [Found article]
S-C-Q-A: [Summary]
Key claim: [...]

### Source 3: [Found article]
S-C-Q-A: [Summary]
Key claim: [...]

## Síntesis

**Consensus**: [What all agree on]
**Divergence**: [Where they differ]
**Unique value**: [What each contributes]
**Integrated view**: [Your synthesis]
```

## Paso 4: Síntesis y resultados

**Generar según el objetivo del usuario:**

### Para resolver problemas:

```markdown
## Soluciones aplicables
[Extract 2-3 methods from content]

## Plan de aplicación
Problem: [User's specific issue]
Relevant insights: [From analysis]

Action steps:
1. [Concrete action with timeline]
2. [Concrete action with timeline]
3. [Concrete action with timeline]

Success metrics: [How to measure]

## Risk Mitigation (from Inversion)
Potential failure points:
- [Point 1] → Prevent by: [...]
- [Point 2] → Prevent by: [...]
```

### Para aprender:

```markdown
## Notas de aprendizaje

Core concepts (explained simply):
1. **[Concept 1]**: [Definition + Example]
2. **[Concept 2]**: [Definition + Example]

Mental models gained:
- [Model 1]: [How it works]

Connections to prior knowledge:
- [Link to something user already knows]

## Deeper Understanding (First Principles)
Fundamental question: [...]
Core principle: [...]

## Preguntas de verificación
1. [Question to test understanding]
2. [Question to test application]
3. [Question to test evaluation]
```

### Para referencia escrita:

```markdown
## Key Arguments & Evidence
[Structured extraction with page/paragraph numbers]

## Ideas citables
"[Quote 1]" — Context: [...]
"[Quote 2]" — Context: [...]

## Notas de análisis crítico
Strengths: [For citing]
Limitations: [For balanced discussion]

## Alternative Perspectives (from Mental Models)
[What other disciplines would say about this]

## Gaps & Counterfactuals
What the article doesn't address:
- [Gap 1]
- [Gap 2]
```

### Para la toma de decisiones:

```markdown
## Marco de decisiones

Options presented: [A / B / C]

Multi-model evaluation:
- Economic lens: [...]
- Risk lens (Inversion): [...]
- Systems lens: [...]

## Análisis de decisiones con Seis Sombreros
🤍 Facts: [Objective comparison]
🖤 Risks: [What could go wrong]
💛 Benefits: [Upside potential]
💚 Alternatives: [Other options not considered]
💙 Recommendation: [Synthesized advice]

## Scenario Analysis (from Inversion)
Best case: [...]
Worst case: [...]
Most likely: [...]
```

## Paso 5: Activación del Conocimiento

**Siempre termina con:**

```markdown
## 🎯 Immediate Takeaways (Top 3)

1. **[Insight 1]**
   Why it matters: [Personal relevance]
   One action: [Specific, time-bound]

2. **[Insight 2]**
   Why it matters: [Personal relevance]
   One action: [Specific, time-bound]

3. **[Insight 3]**
   Why it matters: [Personal relevance]
   One action: [Specific, time-bound]

## 💡 Quick Win
[One thing to try in next 24 hours - make it TINY and SPECIFIC]

## 🔗 Next Steps

**To deepen understanding:**
[ ] Further reading: [If relevant]
[ ] Apply framework X to topic Y
[ ] Discuss with: [Who could add perspective]

**To apply:**
[ ] Experiment: [Test in real context]
[ ] Teach: [Explain to someone else]
[ ] Combine: [Mix with another idea]

## 🧭 Thinking Models Used
[Checkboxes showing which frameworks were applied]
✅ SCQA ✅ 5W2H ✅ Critical Thinking ✅ Inversion
□ Mental Models □ First Principles □ Systems □ Six Hats
```

## Estándares de calidad

Todo análisis debe:
- ✅ Mantente fiel al contenido original (sin tergiversaciones)
- ✅ Distinguir hechos de opiniones
- ✅ Proporcionar ejemplos concretos
- ✅ Aplicar las estructuras apropiadamente (no forzar el ajuste)
- ✅ Conéctese al contexto del usuario cuando sea posible
- ✅ Terminar con pasos prácticos
- ✅ Citar secciones específicas (números de párrafos, citas)**Evitar:**
- ❌ Abrumador con todos los marcos a la vez (respetar el nivel de profundidad)
- ❌ Jerga académica sin explicación.
- ❌ Análisis sin aplicación
- ❌ Copiar el texto palabra por palabra (siempre reformular para comprenderlo)
- ❌ Usar marcos superficialmente (profundizar, no ampliar)

## Patrones de interacción

**Cuestionario progresivo:**
- Comprensión: "¿Qué crees que quiere decir el autor con X?"
- Crítica: "¿Ves alguna laguna en este argumento?"
- Aplicación: "¿Cómo podrías utilizar esto en tu trabajo?"
- Meta: "¿Qué modelo de pensamiento te ayudó más? ¿Por qué?"

**Adaptarse a las señales:**
- El usuario pregunta "¿cuál es el punto principal?" → Quieren concisión, utilice SCQA
- El usuario desafía su análisis → Apóyese en el pensamiento crítico + inversión
- El usuario pregunta "¿cómo uso esto?" → Centrarse en la aplicación + Primeros principios
- El usuario quiere "múltiples perspectivas" → Utilice seis sombreros o modelos mentales
- El usuario menciona "riesgos" → Aplicar el pensamiento inverso
- El usuario pregunta "¿cómo se conecta esto?" → Utilice el pensamiento sistémico

**Sugerencias de marco durante la conversación:**
- "¿Quieres que aplique [X framework] a este punto?"
- "Este parece un buen lugar para el pensamiento inverso. ¿Quieres explorar los modos de fallo?"
- "Noto varios modelos mentales en juego aquí, ¿quieres que los analice?"

## Materiales de referencia

### Marcos básicos (todos los niveles)
- `references/scqa_framework.md` - Pensamiento estructurado (S-C-Q-A)
- `references/5w2h_analysis.md` - Verificación de integridad (7 preguntas)

### Marcos de nivel estándar
- `references/critical_thinking.md` - Análisis de argumentos
- `references/inversion_thinking.md` - Análisis de modo de fallo y riesgo

### Marcos de nivel profundo
- `references/mental_models.md` - Biblioteca de modelos multidisciplinarios
- `references/first_principles.md` - Método de extracción de esencia
- `references/systems_thinking.md` - Mapeo de relaciones
- `references/six_hats.md` - Protocolo multiperspectiva

### Formatos de salida
- `references/output_templates.md` - Ejemplos de formato de notas
- `references/comparison_matrix.md` - Análisis cruzado de artículos

## Uso avanzado

### Combinaciones de marcos personalizados

El usuario puede solicitar combinaciones específicas:
- "Usar SCQA + Inversión" - Estructura con análisis de riesgos
- "Aplicar Modelos Mentales + Pensamiento Sistémico" - Análisis de sistemas multilente
- "5W2H + Pensamiento crítico" - Integridad + control de calidad

### Profundización iterativa

Comience con el Nivel 1, luego pregunte:
- "¿Quieres profundizar en alguna parte?"
- "¿Qué marco sería más valioso aquí?"
- "¿Deberíamos hacer un análisis de inversión de esta solución?"

### Optimizaciones específicas del dominio

**Negocio/Estrategia**: SCQA + Modelos Mentales (economía) + Inversión
**Técnico/Investigación**: 5W2H + Primeros principios + Pensamiento crítico
**Desarrollo personal**: Seis Sombreros + Inversión + Sistemas
**Toma de Decisiones**: Modelos Mentales + Inversión + SCQA
**Creativo**: Seis Sombreros + Primeros Principios + Modelos Mentales

---

**Recuerde**: el objetivo es obtener información, no completar el marco. Utilice los marcos como herramientas para revelar comprensión, no como listas de verificación para completar. Calidad de pensamiento > cantidad de marcos aplicados.