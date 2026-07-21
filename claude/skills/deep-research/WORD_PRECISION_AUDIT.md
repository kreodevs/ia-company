# Auditoría de precisión de palabras: habilidad de investigación profunda

**Fecha:** 2025-11-04
**Propósito:** Revisión sistemática de cada palabra en SKILL.md para mayor precisión, intención y claridad.

---

## Metodología de auditoría

**Criterios de precisión:**
1. **Sin palabras indirectas** ("razonablemente", "generalmente", "básicamente", "esencialmente")
2. **Sin verbos débiles** ("can", "may", "might", "should" → use "must", "will", "do")
3. **Sin adjetivos vagos** ("bueno", "agradable", "razonable" → utilice criterios específicos)
4. **Sin voz pasiva** donde la activa es más fuerte
5. **Sin coloquialismos** en las directivas formales
6. **Sin dobles negativos** ("no es necesario" → "continuar sin")
7. **Sin redundancia** (dígalo una vez, claramente)
8. **No se permiten pronombres ambiguos** sin referentes claros

---

## Problemas encontrados (14 en total)

### ALTA PRIORIDAD (8 números)

#### Número 1: "supuestos razonables" (líneas 54, 58)
**Actual:**```markdown
Proceed with reasonable assumptions.
Make reasonable assumptions based on query context.
```

**Problema:** "razonable" es subjetivo, vago y crea incertidumbre sobre lo que es aceptable

**Arreglar:**```markdown
Infer assumptions from query context.
Derive assumptions from query signals.
```

**Intención cumplida:** "razonable" → búsqueda de permiso, cauteloso | "inferir/derivar" → acción directa, confiado

---

#### Número 2: "realmente incomprensible" (Línea 61)
**Actual:**```markdown
Query is genuinely incomprehensible
```

**Problema:** "genuinamente" es una palabra indirecta que debilita el criterio.

**Arreglar:**```markdown
Query is incomprehensible
```

**Intención realizada:** "genuinamente" → dudando, calificando | eliminado → claro, definitivo

---

#### Problema n.º 3: "El usuario puede redirigir si es necesario" (Línea 64)
**Actual:**```markdown
PROCEED with standard mode. User can redirect if needed.
```

**Problema:** "puede" es un permiso débil, "si es necesario" es incierto, ambos socavan la autonomía

**Arreglar:**```markdown
PROCEED with standard mode. User will redirect if incorrect.
```

**Intención cumplida:** "puede... si es necesario" → incierto, busca permiso | "will...si es incorrecto" → seguro, definitivo

---

#### Problema #4: "NO es necesario esperar" - doble negativo (Línea 85)
**Actual:**```markdown
NO need to wait for approval - proceed directly to execution
```

**Problema:** El doble negativo ("NO es necesario") es más débil que el comando directo, "proceder directamente a la ejecución" es complejo

**Arreglar:**```markdown
Proceed without waiting for approval
```

**Intención realizada:** "NO es necesario" → permisivo, pasivo | "Continuar sin" → imperativo, activo

---

#### Problema #5: Contracción "No" (Línea 113)
**Actual:**```markdown
Don't inline everything - use references
```

**Problema:** Contracción en directiva formal, menos autoritaria

**Arreglar:**```markdown
Do not inline everything - reference external files
```

**Intención cumplida:** "No" → casual | "No" → formal, autoritario

---

#### Problema n.º 6: "solicitar continuar" - solicitud débil (Línea 229)
**Actual:**```markdown
<5 sources after exhaustive search → Report limitation, ask to proceed
```

**Problema:** "pedir continuar" es débil, implica incertidumbre sobre si continuar

**Arreglar:**```markdown
<5 sources after exhaustive search → Report limitation, request direction
```

**Intención cumplida:** "pedir continuar" → tentativo | "solicitar dirección" → necesidad profesional y clara

---

#### Problema #7: "Cuando hay incertidumbre" contradice la autonomía (Línea 262)
**Actual:**```markdown
**When uncertain:** Be thorough, not fast. Quality > speed.
```

**Problema:** "Cuando hay incertidumbre" contradice directamente el principio de autonomía (la línea 54 dice operar de forma independiente), crea confusión sobre cuándo estar incierto

**Arreglar:**```markdown
**Priority:** Thoroughness over speed. Quality > speed.
```

**Intención cumplida:** "Cuando no está seguro" → vacilación, duda | "Prioridad" → directiva clara, sin incertidumbre

---

#### Problema #8: "aceptable" es pasivo (Línea 280)
**Actual:**```markdown
Extended reasoning acceptable (5-45 min)
```

**Problema:** "aceptable" es pasivo, busca permiso y es débil

**Arreglar:**```markdown
Time investment: 5-45 minutes
```

**Intención cumplida:** "aceptable" → pidiendo permiso | "inversión" → declarando un hecho

---

### PRIORIDAD MEDIA (6 números)

#### Número 9: "Buenos supuestos autónomos": juicio vago (Línea 66)
**Actual:**```markdown
**Good autonomous assumptions:**
```

**Problema:** "Bueno" es un juicio de valor vago y sin criterio

**Arreglar:**```markdown
**Default assumptions:**
```

**Intención realizada:** "Bueno" → búsqueda de aprobación subjetiva | "Predeterminado" → objetivo, procedimiento estándar

---

#### Problema n.º 10: Notación poco clara "Estándar+" (líneas 96, 101)
**Actual:**```markdown
**Standard+ adds:**
**Deep+ adds:**
```

**Problema:** La notación "+" es jerga de programación, no está claro si significa "y superior" o "adicional a"

**Arreglar:**```markdown
**Standard/Deep/UltraDeep execute:**
**Deep/UltraDeep execute:**
```

**Intención cumplida:** "+" → alcance ambiguo | listado explícito → alcance claro

---

#### Problema #11: "(opcional)" debilita la directiva (Línea 174)
**Actual:**```markdown
4. Next steps (optional)
```

**Problema:** "(opcional)" indica incertidumbre y debilita el artículo de entrega

**Arreglar:**```markdown
4. Next steps (if relevant)
```O eliminar por completo ya que está en la sección "Entregar al usuario"

**Intención cumplida:** "(opcional)" → incierto, descartable | "(si es relevante)" → condicional, intencionado | eliminado → esperado

---

#### Número 12: "Oferta:" implica pedir permiso (líneas 176-179)
**Actual:**```markdown
**Offer:**
- Deep-dive any section
- Follow-up questions
- Alternative formats
```

**Problema:** "Oferta" implica pedir permiso, esperar respuesta, interrumpe el flujo autónomo

**Arreglar:**```markdown
**Available on request:**
- Section deep-dives
- Follow-up analysis
- Alternative formats
```O eliminar por completo (el usuario preguntará si está interesado)

**Intención cumplida:** "Oferta" → vendedor, solicitante de permiso | "Disponible bajo pedido" → menú de servicio, iniciado por el usuario | eliminado → autónomo

---

#### Número 13: "hit" coloquial (Línea 234)
**Actual:**```markdown
Time constraint hit → Package partial results, document gaps
```

**Problema:** "hit" es coloquial, impreciso para directiva técnica

**Arreglar:**```markdown
Time constraint reached → Package partial results, document gaps
```

**Intención cumplida:** "golpe" → casual, impreciso | "alcanzado" → formal, preciso

---

#### Problema #14: "explícitamente necesario" redundante (Línea 324)
**Actual:**```markdown
Load these files only when explicitly needed for current phase.
```

**Problema:** "explícitamente necesario" es redundante; sea necesario o no, "explícitamente" no añade precisión

**Arreglar:**```markdown
Load files on-demand for current phase only.
```

**Intención cumplida:** "explícitamente necesario" → pensar demasiado, redundante | "bajo demanda" → término técnico claro

---

## Análisis de impacto

### Antes de las correcciones (estado actual)

**Recuento de palabras de cobertura:** 4 ("razonable" ×2, "genuinamente", "aceptable")
**Verbos modales débiles:** 2 ("puede redirigir", "puede")
**Construcciones pasivas:** 3 ("puede", "aceptable", "opcional")
**Adjetivos vagos:** 2 ("bueno", "razonable")
**Coloquialismos:** 1 ("golpear")
**Despidos:** 2 ("explícitamente necesario", "NO es necesario")

**Indicadores de debilidad total:** 14

### Después de las correcciones (estado propuesto)

**Recuento de palabras de cobertura:** 0
**Verbos modales débiles:** 0
**Construcciones pasivas:** 0
**Adjetivos vagos:** 0
**Coloquialismos:** 0
**Despidos:** 0

**Indicadores de debilidad total:** 0

---

## Análisis de intención de palabras

### Reemplazos de palabras críticas

| Palabra actual | Intención no deseada | Reemplazo | Intención prevista ||--------------|---------------------|-------------|-------------------|
| razonable | subjetivo, cauteloso | inferir/derivar | objetivo, confiado |
| genuinamente | dudar, calificar | [eliminar] | cierto, definitivo |
| puede | búsqueda de permiso | voluntad | expectativa segura |
| si es necesario | incierto | si es incorrecto | condicional, claro |
| NO es necesario | pasivo, permisivo | Continuar sin | activo, imperativo |
| No | informal, conversacional | No | formal, autoritario |
| preguntar a | tentativo, débil | solicitud | profesional, claro |
| Cuando no está seguro | vacilante, contradictorio | Prioridad | directiva, inequívoca |
| aceptable | búsqueda de permiso | inversión | fáctico, confiado |
| Bueno | aprobación subjetiva | Predeterminado | estándar objetivo |
| + | ambigua, jerga | lista explícita | claro, preciso |
| opcional | desestimable, débil | [eliminar o "si corresponde"] | intencional o esperado |
| Oferta | vendedor, pasivo | [eliminar] | autónomo |
| golpe | casual, impreciso | alcanzado | formal, preciso |
| necesario explícitamente | redundante, pensar demasiado | bajo demanda | técnico, conciso |

---

## Principios de precisión lingüística aplicados

### 1. Voz Imperativa para Órdenes
**Antes:** "NO es necesario esperar la aprobación"
**Después:** "Continuar sin esperar aprobación"
**Principio:** Comandos directos > permisos pasivos

### 2. Eliminar palabras de cobertura
**Antes:** "realmente incomprensible"
**Después:** "incomprensible"
**Principio:** Los clasificados se debilitan, la eliminación se fortalece

### 3. Eliminar los juicios subjetivos
**Antes:** "Buenos supuestos autónomos"
**Después de:** "Supuestos predeterminados"
**Principio:** Normas objetivas > juicios vagos

### 4. Voz activa en off pasiva
**Antes:** "Se acepta un razonamiento amplio"
**Después:** "Inversión de tiempo: 5-45 minutos"
**Principio:** Afirmaciones activas > permisos pasivos

### 5. Términos técnicos precisos
**Antes:** "Límite de tiempo"
**Después:** "Límite de tiempo alcanzado"
**Principio:** Precisión formal > aproximación coloquial

### 6. Eliminar la redundancia
**Antes:** "explícitamente necesario"
**Después:** "bajo demanda"
**Principio:** Di una vez claramente > repite con calificativos

### 7. Modales fuertes
**Antes:** "El usuario puede redirigir si es necesario"
**Después:** "El usuario redirigirá si es incorrecto"
**Principio:** "voluntad" (expectativa) > "poder" (posibilidad)

---

## Análisis del lenguaje de autonomía

### Resolución de contradicciones

**Problema:** La línea 262 "Cuando es incierta" contradice la Línea 54 "opera de forma independiente"

**Análisis:**
- La línea 54 establece principio de autonomía: proceder de forma independiente
- La línea 262 sugiere que hay momentos de incertidumbre.
- Estos crean disonancia cognitiva: ¿soy inseguro o autónomo?

**Resolución:**
- Reemplace "Cuando no esté seguro" por "Prioridad".
- Marco como estándar de calidad, no como condición de incertidumbre.
- Mantiene la autonomía mientras establece expectativas de calidad.

**Resultado:** Sin contradicción, jerarquía clara (autonomía + prioridad de calidad)

---

## Eliminación del lenguaje de búsqueda de permiso

### Patrones de búsqueda de permisos identificados

1. "supuestos razonables" → buscar aprobación para la calidad de los supuestos
2. "puede redirigir si es necesario" → solicitando permiso para continuar
3. "NO es necesario esperar" → preguntando si está bien continuar
4. "aceptable" → preguntar si está bien invertir tiempo
5. "Oferta" → pidiendo permiso para proporcionar opciones

### Estrategia de reemplazo

Reemplace toda la búsqueda de permiso con:
- **Afirmaciones:** Exponga los hechos con confianza
- **Imperativos:** Dar órdenes directas
- **Expectativas:** Describe lo que sucederá
- **Estándares:** Definir criterios objetivos

---

## Mejoras en la precisión de las pruebas

### Escenario 1: consulta ambigua

**Antes (con lenguaje débil):**
> "Haga suposiciones razonables basadas en el contexto de la consulta. El usuario puede redirigir si es necesario".

**Interpretación:** No está claro qué significa "razonable", "puede" sugiere permiso, "si es necesario" es vago

**Después (lenguaje preciso):**
> "Inferir suposiciones a partir del contexto de la consulta. El usuario redirigirá si es incorrecto".

**Interpretación:** Acción clara (inferir), expectativa confiada (voluntad), condición definida (incorrecta)

### Escenario 2: Inversión de tiempo

**Antes (pasivo):**
> "Razonamiento extendido aceptable (5-45 min)"

**Interpretación:** Suena como pedir permiso para tener tiempo.

**Después (asertivo):**
> "Inversión de tiempo: 5-45 minutos"

**Interpretación:** Indica un hecho, no se solicitó permiso

---

## Prioridad de implementación

### Fase 1: ALTA PRIORIDAD (Autonomía crítica)
Solucione los problemas del 1 al 8 de inmediato: afectan directamente al funcionamiento autónomo

### Fase 2: PRIORIDAD MEDIA (Mejoras de claridad)
Solucione los problemas 9 a 14 después de la Fase 1: mejoran la claridad pero no bloquean la autonomía

---

## Lista de verificación de verificación

Después de aplicar las correcciones:

- [] Sin palabras indirectas ("básicamente", "esencialmente", "en general", "razonablemente")
- [] No hay modales débiles ("puede", "puede", "podría", "podría" donde cabe "debe", "debe")
- [] No hay voz pasiva donde la activa es más fuerte.
- [ ] Sin juicios subjetivos ("bueno", "agradable", "razonable")
- [ ] No hay coloquialismos en las directivas formales.
- [] Sin dobles negativos ("NO es necesario")
- [ ] Sin redundancias ("explícitamente necesarias")
- [] Sin lenguaje de solicitud de permiso
- [] Todos los comandos usan voz imperativa
- [ ] Todas las condiciones establecen criterios claros

---

## Conclusión

**Total de problemas encontrados:** 14
**Prioridad alta:** 8 (que afecta a la autonomía)
**Prioridad media:** 6 (mejoras de claridad)

**Problema principal:** Búsqueda de permisos y lenguaje de cobertura que socava el principio de operación autónoma

**Solución principal:** Reemplace toda la búsqueda de permisos con afirmaciones, imperativos y expectativas.

**Impacto esperado:**
- Comportamiento autónomo más claro (sin incertidumbre sobre cuándo proceder)
- Directivas más estrictas (comandos, no sugerencias)
- Lenguaje preciso (cada palabra conlleva una intención específica)
- Cero ambigüedad sobre las expectativas de autonomía.