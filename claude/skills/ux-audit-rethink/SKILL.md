---
name: ux-audit-rethink
description: Auditoría integral de UX utilizando los 7 factores, 5 características de usabilidad y 5 dimensiones de interacción de IxDF. Evaluación holística con propuestas de rediseño basadas en principios de diseño centrados en el usuario.
---

# Auditoría y replanteamiento de UX

Esta habilidad permite a los agentes de IA realizar una **auditoría UX integral y holística** basada en la metodología de Interaction Design Foundation de "Los conceptos básicos del diseño de la experiencia del usuario". Evalúa productos en múltiples dimensiones y propone recomendaciones de rediseño estratégico.

A diferencia de las evaluaciones enfocadas (Nielsen, WCAG, Don Norman), esta habilidad proporciona una **evaluación de UX de 360 ​​grados** que combina factores, características, dimensiones y técnicas de investigación en un marco unificado.

Utilice esta habilidad para evaluaciones completas de UX, decisiones de estrategia de producto o como punto de entrada antes de sumergirse en auditorías específicas.

Combínelo con "Nielsen Heuristics" para mayor usabilidad, "WCAG Accessibility" para cumplimiento o "Cognitive Walkthrough" para análisis de tareas específicas.

## Cuándo utilizar esta habilidad

Invoca esta habilidad cuando:
- Realización de una evaluación inicial integral de UX.
- Evaluar el ajuste general del producto y el mercado desde la perspectiva UX.
- Tomar decisiones estratégicas de producto.
- Evaluar todas las dimensiones de la experiencia del usuario de manera integral.
- Preparación para el rediseño o pivote del producto.
- Benchmarking contra las mejores prácticas de UX.
- Creación de una hoja de ruta de mejora de UX.
- Evaluación de nuevos conceptos de productos.

## Entradas requeridas

Al ejecutar esta auditoría, reúna:

- **app_description**: descripción detallada (propósito, usuarios objetivo, características clave, plataforma: web/móvil/ambas) [REQUERIDO]
- **screenshots_or_links**: capturas de pantalla, estructuras alámbricas, prototipos o URL activas [OPCIONAL pero muy recomendable]
- **user_feedback**: revisiones existentes, quejas, tickets de soporte, datos analíticos [OPCIONAL]
- **target_goals**: objetivos de UX específicos (por ejemplo, "mejorar la incorporación", "aumentar la participación") [OPCIONAL]
- **business_context**: objetivos comerciales, KPI, panorama competitivo [OPCIONAL]
- **user_personas**: Personas existentes o información demográfica [OPCIONAL]

## El marco de experiencia de usuario de IxDF

Esta habilidad se evalúa en **tres dimensiones centrales**:

### Marco 1: Los 7 factores que influyen en la UX

Basado en User Experience Honeycomb de Peter Morville:

1. **Útil** - ¿Resuelve problemas reales de los usuarios?
2. **Utilizable**: ¿es fácil de usar y navegar?
3. **Encontrable**: ¿pueden los usuarios encontrar contenido y funciones?
4. **Creíble** - ¿Inspira confianza y confianza?
5. **Deseable** - ¿Es estéticamente atractivo y emocionalmente atractivo?
6. **Accesible** - ¿Es utilizable por personas con discapacidad?
7. **Valioso**: ¿ofrece valor a los usuarios y a las empresas?

### Marco 2: Las 5 características de usabilidad

De ISO 9241-11 y la investigación de usabilidad:

1. **Efectividad**: ¿Pueden los usuarios alcanzar sus objetivos con precisión?
2. **Eficiencia**: ¿Pueden los usuarios completar tareas rápidamente con el mínimo esfuerzo?
3. **Compromiso**: ¿la interfaz es agradable y satisfactoria?
4. **Tolerancia a errores**: ¿pueden los usuarios prevenir y recuperarse de errores?
5. **Facilidad de aprendizaje** - ¿Pueden los nuevos usuarios aprender rápidamente?

**Fórmula**: Utilidad (funciones adecuadas) + Usabilidad (fácil de usar) = **Utilidad**

### Marco 3: Las 5 dimensiones del diseño de interacción

De Gillian Crampton Smith y Kevin Silver:

1. **Palabras** - Etiquetas, instrucciones, microcopia
2. **Representaciones visuales** - Iconos, imágenes, tipografía, gráficos
3. **Objetos físicos/Espacio** - Dispositivos de entrada, tacto, tamaño de pantalla
4. **Tiempo**: animaciones, transiciones, carga, capacidad de respuesta
5. **Comportamiento** - Acciones, reacciones, mecanismos de retroalimentación

---

## Procedimiento de auditoría

Siga estos pasos sistemáticamente:

### Paso 1: Análisis y preparación del contexto (15 minutos)

**Comprenda el producto:**
1. Revise `app_description` minuciosamente
2. Identificar:
   - Propósito principal y propuesta de valor.
   - Datos demográficos y psicográficos del usuario objetivo.
   - Plataforma(s): web, móvil, escritorio, multiplataforma
   - Viajes y objetivos clave de los usuarios.
   - Modelo de negocio y métricas de éxito.

**Crear personas de usuario** (si no se proporcionan):
- Desarrollar 2-3 personas provisionales basadas en los usuarios objetivo.
- Incluir: datos demográficos, objetivos, frustraciones, dominio tecnológico, contexto de uso.

**Persona de ejemplo:**

```
Name: Sarah, Busy Professional
Age: 32, Marketing Manager
Goals: Quick task completion, mobile-first
Frustrations: Complex interfaces, slow loading
Tech Level: High
Context: On-the-go, multitasking, time-sensitive
```**Supuestos del documento:**
- ¿Qué suponemos sobre los usuarios?
- ¿Qué limitaciones existen? (técnico, presupuesto, cronograma)
- ¿Qué sesgos podrían influir en la evaluación?

---

### Paso 2: Evaluar los 7 factores UX (30 minutos)

Para cada factor, evalúe y califique del 1 al 5:

#### 1. Útil ⭐⭐⭐⭐⚪ (4/5)

**Pregunta**: ¿El producto resuelve problemas reales de los usuarios y aporta valor?

**Evaluar:**
- Aborda las necesidades genuinas del usuario (no problemas inventados)
- Las características se alinean con los objetivos del usuario.
- La propuesta de valor central es clara.
- Resuelve problemas mejor que las alternativas.**Análisis:**
- Fortalezas: [Qué está funcionando]
- Lagunas: [Lo que falta]
- Evidencia: [a partir de comentarios, análisis u observaciones de los usuarios]

**Criterios de calificación:**
- 5: Resuelve problemas críticos de forma excepcional.
- 4: Aborda las necesidades reales de forma eficaz
- 3: Proporciona cierto valor, margen de mejora
- 2: Utilidad marginal, valor poco claro
- 1: No resuelve problemas significativos

---

#### 2. Utilizable ⭐⭐⭐⚪⚪ (3/5)

**Pregunta**: ¿Es fácil de usar y navegar?

**Evaluar:**
- Interfaz intuitiva que requiere un aprendizaje mínimo.
- Estructura de navegación clara
- Patrones de interacción consistentes
- Baja carga cognitiva
- Prevención y recuperación de errores.

**Problemas comunes:**
- Navegación confusa
- Funciones ocultas
- Interacciones inconsistentes
- Etiquetas poco claras
- Procesos complejos

---

#### 3. Encontrable ⭐⭐⚪⚪⚪ (2/5)

**Pregunta**: ¿Pueden los usuarios localizar fácilmente contenidos y funciones?

**Evaluar:**
- Funcionalidad de búsqueda efectiva
- Arquitectura lógica de la información.
- Jerarquía de contenido clara
- Buen etiquetado y categorización.
- Funciones detectables

**Prueba:**
- ¿Pueden los usuarios encontrar [función clave] en <30 segundos?
- ¿Es efectiva la búsqueda?
- ¿Los elementos relacionados están agrupados lógicamente?

---

#### 4. Creíble ⭐⭐⭐⭐⚪ (4/5)

**Pregunta**: ¿Inspira confianza y seguridad?

**Evaluar:**
- Diseño visual profesional.
- Sin enlaces rotos ni errores
- Seguro (HTTPS, política de privacidad)
- Transparente sobre el uso de datos
- Prueba social (reseñas, testimonios)
- Contenido actualizado
- Información de contacto clara

**Señales de confianza:**
- Insignias de seguridad
- Diseño profesional
- Contenido sin errores
- Testimonios reales
- Transparencia de privacidad

---

#### 5. Deseable ⭐⭐⭐⚪⚪ (3/5)

**Pregunta**: ¿Es estéticamente atractivo y emocionalmente atractivo?

**Evaluar:**
- Atractivo visual (hermoso, pulido)
- Diseño emocional (encantador, memorable)
- Expresión de la personalidad de la marca.
- Estándares de diseño modernos
- Crea una respuesta emocional positiva.

**Más allá de lo funcional:**
- ¿Te genera alegría?
- ¿Es memorable?
- ¿Los usuarios quieren usarlo?
- ¿Diseño visual competitivo?

---

#### 6. Accesible ⭐⭐⚪⚪⚪ (2/5)

**Pregunta**: ¿Es inclusivo para todos los usuarios, incluidos aquellos con discapacidad?

**Evaluar:**
- Cumplimiento de las WCAG (A, AA, AAA)
- Navegación por teclado
- Compatibilidad con lectores de pantalla
- Contraste de colores
- Texto alternativo
- Subtítulos para medios
- Tamaño de texto flexible

**Comprobaciones rápidas:**
- ¿Puedes navegar sólo con el teclado?
- ¿Funciona con lectores de pantalla?
- ¿Contraste de color suficiente?
- ¿Texto redimensionable al 200%?

---

#### 7. Valioso ⭐⭐⭐⭐⚪ (4/5)

**Pregunta**: ¿Aporta valor tanto a los usuarios como a la empresa?

**Evaluar:**
- **Valor para el usuario**: ahorra tiempo, dinero y esfuerzo; proporciona utilidad o disfrute
- **Valor empresarial**: logra los objetivos empresariales (ingresos, compromiso, retención)
- ROI para ambas partes interesadas

**Saldo:**
- Necesidades del usuario versus objetivos comerciales.
- Valor a corto plazo versus valor a largo plazo
- Monetización sin comprometer la UX

---

**Resumen de 7 factores:**

| factor | Calificación | Estado | Prioridad |
|--------|--------|--------|----------|
| Útil | 4/5 | ✅ Bueno | Medio |
| Utilizable | 3/5 | ⚠️ Necesita trabajo | Alto |
| Encontrable | 2/5 | ❌ Pobre | Crítico |
| Creíble | 4/5 | ✅ Bueno | Bajo |
| Deseable | 3/5 | ⚠️ Necesita trabajo | Medio |
| Accesible | 2/5 | ❌ Pobre | Alto |
| Valioso | 4/5 | ✅ Bueno | Bajo |

**Puntuación general del factor UX**: 22/35 (63%) - **Aceptable, se necesita una mejora significativa**

---

### Paso 3: Evaluar 5 características de usabilidad (30 minutos)#### 1. Efectividad ⭐⭐⭐⭐⚪ (4/5)

**Definición**: ¿Pueden los usuarios alcanzar sus objetivos de forma precisa y completa?

**Evaluar:**
- Tasa de finalización de tareas (objetivo: >90%)
- Precisión de los resultados
- Tasa de éxito para tareas clave
- Logro de objetivos sin soluciones alternativas

**Métricas:**
- % de usuarios que completan tareas con éxito
- Número de errores por tarea
- Satisfacción con los resultados.

**Problemas encontrados:**
- [Enumerar problemas específicos de efectividad]

---

#### 2. Eficiencia ⭐⭐⭐⚪⚪ (3/5)

**Definición**: ¿Pueden los usuarios completar tareas rápidamente con el mínimo esfuerzo?

**Evaluar:**
- Tiempo para completar las tareas (frente al punto de referencia)
- Número de pasos/clics requeridos
- Atajos para usuarios expertos
- Flujos de trabajo optimizados
- Sin fricciones innecesarias

**Métricas:**
- Tiempo promedio en tarea
- Número de clics/pasos
- Esfuerzo percibido (informes de usuarios)

**Problemas de eficiencia:**
- Procesos de varios pasos que podrían simplificarse.
- Faltan atajos o acciones masivas
- Tiempos de carga lentos

---

#### 3. Compromiso ⭐⭐⭐⚪⚪ (3/5)

**Definición**: ¿La interfaz es agradable, satisfactoria y agradable de usar?**Evaluar:**
- Atractivo estético
- Respuesta emocional (sentimientos positivos)
- Deseo de volver
- Estado de flujo (inmersión)
- Momentos de deleite

**Cualitativo:**
- ¿Los usuarios disfrutan usándolo?
- ¿Crea recuerdos positivos?
- ¿Lo recomendarían?

---

#### 4. Tolerancia a errores ⭐⭐⚪⚪⚪ (2/5)

**Definición**: ¿Pueden los usuarios prevenir, reconocer y recuperarse fácilmente de errores?

**Evaluar:**
- Prevención de errores (restricciones, validación, confirmaciones)
- Borrar mensajes de error (qué sucedió, por qué, cómo solucionarlo)
- Fácil deshacer/rehacer
- Degradación elegante
- Prevención de pérdida de datos (guardado automático)

**Problemas comunes:**
- Mensajes de error genéricos ("Error 500")
- No hay confirmación de acciones destructivas.
- No se pueden deshacer errores
- Pérdida de datos por errores.

---

#### 5. Facilidad de aprendizaje ⭐⭐⭐⚪⚪ (3/5)

**Definición**: ¿Pueden los nuevos usuarios aprender rápidamente a utilizar el producto sin una formación exhaustiva?

**Evaluar:**
- Primer uso intuitivo (capacidad de aprendizaje)
- Eficacia de la incorporación
- Consistente con las convenciones
- Divulgación progresiva
- Ayuda en contexto
- Memorabilidad (¿pueden recordar los usuarios que regresan?)

**Prueba:**
- ¿Puede un nuevo usuario completar [tarea clave] sin ayuda?
- ¿Cuánto tiempo para llegar a ser competente?
- ¿Los usuarios necesitan documentación?

---

**Resumen de características de usabilidad:**

| Característica | Calificación | Estado | Impacto |
|---------------|--------|--------|--------|
| Efectividad | 4/5 | ✅ Bueno | Alto |
| Eficiencia | 3/5 | ⚠️ Necesita trabajo | Alto |
| Compromiso | 3/5 | ⚠️ Necesita trabajo | Medio |
| Tolerancia a errores | 2/5 | ❌ Pobre | Crítico |
| Facilidad de aprendizaje | 3/5 | ⚠️ Necesita trabajo | Alto |

**Puntuación general de usabilidad**: 15/25 (60%) - **Por debajo del objetivo, mejora esencial**

**Comprobación de utilidad**: ¿Están presentes las funciones adecuadas? (Sí/No/Parcial)
**Puntuación de utilidad**: Utilidad + Usabilidad = [Evaluación]

---

### Paso 4: Revisar 5 dimensiones del diseño de interacción (30 minutos)

#### 1. Palabras (Microcopia, Etiquetas, Contenido)

**Evaluar:**
- Lenguaje claro, conciso y sin jerga.
- Terminología consistente
- Idioma del usuario (no idioma del sistema)
- Instrucciones y orientación útiles.
- Tono de voz adecuado
- Mensajes de error comprensibles

**Ejemplos para comprobar:**
- Etiquetas de botones: "Enviar" frente a "Guardar cambios" frente a "Continuar"
- Etiquetas de formulario: ¿claras y específicas?
- Mensajes de error: ¿útiles o crípticos?
- Estados vacíos: ¿orientadores o confusos?

**Problemas:**
- Jerga técnica ("Error: excepción de referencia NULL")
- Etiquetas ambiguas ("Aceptar", "Enviar", "Haga clic aquí")
- Terminología inconsistente (iniciar sesión versus iniciar sesión versus iniciar sesión)
- Falta contexto ("Nombre" - ¿primero? ¿Último? ¿completo?)

---

#### 2. Representaciones visuales (iconos, gráficos, tipografía)**Evaluar:**
- Iconos claros y universalmente entendidos.
- La jerarquía visual guía la atención.
- Tipografía legible y accesible.
- Las imágenes apoyan el contenido (no decorativas)
- Lenguaje visual consistente
- El color comunica significado.
- Visualización de datos efectiva

**Comprobar:**
- ¿El significado de los iconos es obvio sin etiquetas?
- ¿Jerarquía visual clara?
- ¿La tipografía se adapta bien?
- ¿Los gráficos mejoran la comprensión?

---

#### 3. Objetos físicos/espacio (métodos de entrada, tamaño de pantalla)

**Evaluar:**
- Objetivos táctiles del tamaño adecuado (mínimo 44×44px)
- Gestos intuitivos (deslizar, pellizcar, tocar)
- Navegación por teclado fluida
- Interacciones del mouse (desplazar el mouse, hacer clic) responsivas
- Tamaño de pantalla optimizado (móvil, tableta, escritorio)
- Diseño responsivo efectivo

**Consideraciones móviles (Capítulo 8 - IxDF):**
- Pantalla pequeña optimizada
- Desplazamiento en una dirección
- Navegación simplificada
- Contenido mínimo por pantalla
- Entrada de texto reducida
- Manejo de red estable
- Experiencia integrada (utiliza funciones del teléfono)

---

#### 4. Tiempo (animaciones, capacidad de respuesta, carga)

**Evaluar:**
- Tiempos de carga aceptables (<3 segundos)
- Animaciones fluidas y decididas.
- Guía de transiciones para los usuarios.
- Comentarios inmediatos (<100ms)
- Indicadores de progreso para operaciones largas.
- Sin retrasos innecesarios
- Rendimiento optimizado

**Pautas de tiempo:**
- <100 ms: se siente instantáneo
- 100-300 ms: se notó un ligero retraso
- 300 ms-1 s: el usuario permanece concentrado
- 1-10s: Necesita indicador de progreso
- >10s: usuario multitarea, estado de necesidades

---

#### 5. Comportamiento (acciones, reacciones, comentarios)

**Evaluar:**
- Las acciones tienen consecuencias claras.
- Comentarios inmediatos sobre las interacciones.
- Estado del sistema siempre visible
- Comportamiento predecible
- Patrones de interacción consistentes
- Animaciones/transiciones apropiadas.
- Recuperación de errores incorporada**Patrones de interacción:**
- Haga clic en el botón → Comentarios visuales inmediatos + acción
- Enviar formulario → Validación + confirmación
- Eliminar elemento → Confirmación + opción deshacer
- Cargar contenido → Pantallas de esqueleto + progreso

---

**Resumen del diseño de interacción:**

| Dimensión | Calificación | Cuestiones clave |
|-----------|----------------|------------|
| Palabras | 3/5 | Jerga técnica, términos inconsistentes |
| Representaciones Visuales | 4/5 | Problemas menores de claridad de iconos |
| Objetos Físicos/Espacio | 2/5 | Objetivos táctiles pequeños, mala optimización móvil |
| Hora | 3/5 | Carga lenta, faltan indicadores de progreso |
| Comportamiento | 3/5 | Comentarios débiles, patrones inconsistentes |

**Puntuación general del diseño de interacción**: 15/25 (60%)

---

### Paso 5: Aplicar técnicas de investigación de UX (20 minutos)

Recomendar o simular métodos de investigación:

#### Revisión de expertos (evaluación heurística)
- Aplicar las 10 heurísticas de usabilidad de Nielsen.
- Documentar violaciones y gravedad.
- Proporcionar ejemplos específicos.

#### Preguntas de la entrevista del usuario (si realiza o recomienda)
**Descubrimiento:**
- "¿Qué estás tratando de lograr?"
- "¿Qué es lo que más te frustra de [producto]?"
- "¿Qué cambiarías si pudieras?"

**Seguimiento:**
- "¿Puedes mostrarme cómo haces [tarea]?"
- "¿Qué alternativas has probado?"
- "¿Cómo se compara esto con [competidor]?"

#### Otras técnicas para recomendar:
- **Pruebas de usabilidad**: observación basada en tareas (5-8 usuarios)
- **Clasificación de tarjetas**: para arquitectura de información (abierta o cerrada)
- **Pruebas A/B**: para alternativas de diseño
- **Revisión analítica**: análisis de embudo, mapas de calor, grabaciones de sesiones
- **Encuestas**: Retroalimentación cuantitativa (SUS, NPS, CSAT)
- **Personas**: refinar o crear basándose en la investigación
- **Mapeo de viaje**: visualiza la experiencia de un extremo a otro

#### Visualización de información (Capítulo 9 - IxDF)
**Para presentar los hallazgos:**
- Gráficos: gráficos de barras para comparaciones, gráficos de líneas para tendencias
- Mapas de calor: patrones de clic/atención
- Diagramas de flujo: viajes de usuario
- Tablas: datos estructurados
- Infografías: Resúmenes ejecutivos**Consideraciones éticas:**
- Presentar los datos de manera honesta (sin seleccionar cuidadosamente)
- Divulgar limitaciones y tamaños de muestra.
- Evitar visualizaciones manipuladoras.
- Citar fuentes

---

### Paso 6: Identificar problemas y priorizar (15 minutos)

**Consolidar hallazgos:**

Cree una lista de problemas priorizados:

```markdown

## Critical Issues (Fix Immediately)

### Issue 1: Poor Error Tolerance - No Undo for Deletions
- **Frameworks Violated**: Usability (Error Tolerance 2/5), UX Factor (Usable 3/5)
- **User Impact**: Users lose data, frustration, decreased trust
- **Business Impact**: Support tickets, user churn
- **Evidence**: User feedback: "Accidentally deleted project, can't recover"
- **Severity**: Critical
- **Effort**: Medium (2-3 days)
- **Recommendation**: Add confirmation dialog + undo buffer (30s)

### Issue 2: Information Not Findable - Hidden Search
- **Frameworks Violated**: UX Factor (Findable 2/5), Interaction (Words/Visual)
- **User Impact**: Can't locate content, abandons task
- **Business Impact**: Decreased engagement, lower conversions
- **Evidence**: Analytics show 70% exit on navigation
- **Severity**: High
- **Effort**: Low (1 day)
- **Recommendation**: Add prominent search bar in header

[Continue for all critical issues...]
```**Matriz de Priorización:**

| Problema | Impacto en el usuario | Impacto empresarial | Esfuerzo | Prioridad |
|-------|-------------|-----------------|--------|----------|
| No deshacer al eliminar | Alto | Alto | Medio | P0 |
| Búsqueda oculta | Alto | Medio | Bajo | P0 |
| Carga lenta | Medio | Medio | Alto | P1 |
| Mala experiencia de usuario móvil | Alto | Alto | Alto | P1 |

**Niveles de prioridad:**
- **P0 (Crítico)**: Bloquea a los usuarios, soluciona inmediatamente
- **P1 (Alto)**: Fricción importante, solución en el sprint actual
- **P2 (Medio)**: Molestia, solución en la próxima versión
- **P3 (Bajo)**: Es bueno tenerlo, trabajo pendiente

---

### Paso 7: Proponer repensar y rediseñar (30 minutos)

**Utilice el proceso de pensamiento de diseño:**

#### Fase 1: Empatizar (Ya hecho mediante auditoría)
- Sintetizar los puntos débiles del usuario.
- Personas de referencia
- Mapa de viaje emocional.

#### Fase 2: Definir planteamientos de problemas
**Plantilla**: [Persona] necesita [necesidad] porque [insight]

**Ejemplos:**
- "Sarah necesita completar las tareas más rápido porque siempre está en movimiento y tiene poco tiempo"
- "Los nuevos usuarios necesitan una incorporación más clara porque abandonan en 2 minutos sin comprender el valor"

#### Fase 3: Idear soluciones

**Enfoques de lluvia de ideas:**

**Para problemas de búsqueda:**
1. Agregue búsqueda global con autocompletar
2. Rediseñar la navegación a una jerarquía de 3 niveles.
3. Implementar rutas de navegación
4. Agregue la sección "Vistos recientemente"
5. Crea filtros dinámicos

**Criterios de selección:**
- Impacto (alto/medio/bajo)
- Esfuerzo (alto/medio/bajo)
- Viabilidad (limitaciones técnicas)
- retorno de la inversión

#### Fase 4: Propuestas de rediseño del prototipo

**Propuesta 1: Rediseño de navegación simplificada**

**Problemas actuales:**
- Jerarquía de navegación de 5 niveles (demasiado profunda)
- Funciones ocultas
- Etiquetas inconsistentes

**Solución propuesta:**

```
Header:
[Logo] [Search Bar] [Key Actions: Add, Notifications, Profile]

Main Navigation (3 levels max):
- Dashboard
- Projects
  - Active
  - Archived
- Resources
  - Help Center
  - Community

Mobile: Hamburger menu with same structure
```**Impacto esperado:**
- Encontrable: 2/5 → 4/5
- Usabilidad: 3/5 → 4/5
- Reducción del 40 % en clics en funciones clave

**Esfuerzo**: 2 semanas (diseño + desarrollo)

---

**Propuesta 2: Sistema mejorado de tolerancia a errores**

**Problemas actuales:**
- Sin funcionalidad de deshacer
- Las acciones destructivas carecen de confirmación.
- Mensajes de error genéricos

**Solución propuesta:**
1. **Deshacer Sistema**
   - Búfer de deshacer de 30 segundos para todas las acciones destructivas
   - Notificación del brindis: "Eliminado [elemento]. ¿Deshacer?"
   - Botón deshacer global (Ctrl+Z / Cmd+Z)2. **Diálogos de confirmación**
   - Consecuencias claras: "¿Eliminar el proyecto 'X'? Las 47 tareas se eliminarán permanentemente".
   - Acción principal: Cancelar, Secundaria: Eliminar

3. **Mensajes de error mejorados**
   - Qué sucedió: "No se pudieron guardar los cambios"
   - Por qué: "Se perdió la conexión de red"
   - Solución: "Compruebe la conexión y vuelva a intentarlo"
   - Acción: botón [Reintentar]

**Impacto esperado:**
- Tolerancia a errores: 2/5 → 4/5
- Confianza del usuario +35%
- Tickets de soporte -50%

**Esfuerzo**: 1,5 semanas

---

**Propuesta 3: Rediseño centrado en los dispositivos móviles**

**Problemas actuales:**
- Diseño de escritorio mal adaptado
- Objetivos táctiles pequeños (32px)
- Se requiere desplazamiento horizontal
- Navegación móvil compleja

**Solución propuesta** (según el Capítulo 8 de IxDF):

1. **Optimización de pantalla pequeña**
   - Diseño de una sola columna
   - Objetivos táctiles mínimos de 44×44px
   - Botones grandes y aptos para el pulgar

2. **Desplazamiento en una dirección**
   - Sólo desplazamiento vertical
   - Evitar carruseles horizontales

3. **Navegación simplificada**
   - Barra de pestañas inferior (4-5 elementos como máximo)
   - Hamburguesa para funciones secundarias.

4. **Contenido mínimo**
   - Divulgación progresiva
   - Secciones colapsadas
   - Patrones "Mostrar más"

5. **Introducción de texto reducida**
   - Autocompletar
   - Valores predeterminados inteligentes
   - Alternar botones versus escribir

6. **Conexiones estables**
   - Modo sin conexión con sincronización
   - Actualizaciones optimistas de la interfaz de usuario
   - Mecanismos de reintento

7. **Experiencia integrada**
   - Usa la cámara para subir
   - Servicios de localización
   - Notificaciones push

**Impacto esperado:**
- Usabilidad móvil: 2/5 → 4/5
- Interacción móvil +60%
- Conversiones móviles +35%

**Esfuerzo**: 4 semanas (rediseño móvil completo)

---

#### Fase 5: Probar e iterar recomendaciones

**Próximos pasos:**
1. **Crear estructuras alámbricas/prototipos**
   - Bocetos de baja fidelidad.
   - Prototipos de alta fidelidad en los que se puede hacer clic (Figma)

2. **Pruebas de usabilidad**
   - Prueba con 5-8 usuarios objetivo
   - Escenarios basados en tareas
   - Protocolo de pensar en voz alta

3. **Pruebas A/B**
   - Variaciones de prueba
   - Medida: tasa de finalización, tiempo, satisfacción.

4. **Repetir según los comentarios**
   - Refinar diseños
   - Volver a probar los flujos críticos

5. **Implementar en fases**
   - Fase 1: Correcciones críticas (P0)
   - Fase 2: Mejoras de alto impacto (P1)
   - Fase 3: Pulido y optimización (P2-P3)

---

## Estructura completa del informe de auditoría

```markdown

# Informe de auditoría y replanteamiento UX
**Product**: [Name]
**Date**: [Date]
**Auditor**: [AI Agent]
**Methodology**: IxDF UX Framework (7 Factors + 5 Usability Characteristics + 5 Interaction Dimensions)

---

## Resumen ejecutivo

### Overall UX Health Score: 62/100 (C Grade)

**Key Findings:**
- Product provides value (Useful, Valuable) but struggles with usability
- Major gaps in Findability and Error Tolerance
- Mobile experience significantly below standards
- Quick wins identified with high ROI

**Critical Priorities:**
1. Implement undo system (Error Tolerance)
2. Redesign navigation (Findability)
3. Optimize mobile experience (Physical Space dimension)

---

## 1. UX Factors Assessment (7 Factors)

### Puntuaciones por factor

| Factor | Score | Status | Priority |
|--------|-------|--------|----------|
| Useful | 4/5 | ✅ Good | Medium |
| Usable | 3/5 | ⚠️ Needs work | High |
| Findable | 2/5 | ❌ Poor | Critical |
| Credible | 4/5 | ✅ Good | Low |
| Desirable | 3/5 | ⚠️ Needs work | Medium |
| Accessible | 2/5 | ❌ Poor | High |
| Valuable | 4/5 | ✅ Good | Low |

**Total**: 22/35 (63%)

[Detailed analysis for each factor...]

---

## 2. Usability Characteristics Assessment

### Puntuaciones de usabilidad

| Characteristic | Score | Status | Impact |
|---------------|-------|--------|--------|
| Effectiveness | 4/5 | ✅ Good | High |
| Efficiency | 3/5 | ⚠️ Needs work | High |
| Engagement | 3/5 | ⚠️ Needs work | Medium |
| Error Tolerance | 2/5 | ❌ Poor | Critical |
| Ease of Learning | 3/5 | ⚠️ Needs work | High |

**Total**: 15/25 (60%)

**Utility Assessment**: Features present match user needs ✅
**Usefulness**: Utility (Good) + Usability (Fair) = **Acceptable but improvable**

[Detailed analysis...]

---

## 3. Interaction Design Dimensions

### Puntuaciones por dimensión

| Dimension | Score | Key Issues |
|-----------|-------|------------|
| Words | 3/5 | Technical jargon, inconsistent terminology |
| Visual Representations | 4/5 | Minor icon clarity issues |
| Physical Objects/Space | 2/5 | Poor mobile optimization, small targets |
| Time | 3/5 | Slow loading, missing progress indicators |
| Behavior | 3/5 | Weak feedback, inconsistent patterns |

**Total**: 15/25 (60%)

[Detailed analysis...]

---

## 4. Issues Identified

### Critical (P0) - Fix Immediately

**Issue 1: No Undo for Destructive Actions**
- Frameworks: Usability (Error Tolerance), UX (Usable)
- Impact: Data loss, user frustration, support burden
- Severity: Critical
- Effort: Medium (2-3 days)
- Recommendation: Implement 30s undo buffer + confirmations

[Continue for all P0 issues...]

### High Priority (P1) - Fix This Sprint
[List...]

### Medium Priority (P2) - Next Release
[List...]

### Low Priority (P3) - Backlog
[List...]

---

## 5. Redesign Proposals

### Proposal 1: Navigation Redesign
[Full proposal with wireframes...]

### Proposal 2: Error Tolerance System
[Full proposal...]

### Proposal 3: Mobile-First Redesign
[Full proposal...]

---

## 6. Research Recommendations

### Necesidades inmediatas de investigación
1. **Usability Testing** (Week 1-2)
   - 5-8 participants
   - Tasks: [Key tasks]
   - Goal: Validate findings

2. **User Interviews** (Week 2-3)
   - Questions: [List]
   - Goal: Deep dive on pain points

3. **Card Sorting** (Week 3)
   - Goal: Redesign IA
   - Method: Open card sort

### Analítica a monitorizar
- Task completion rates
- Time on task
- Error rates
- Abandonment points
- Funnel drop-offs

---

## 7. Implementation Roadmap

### Phase 1: Critical Fixes (Weeks 1-2)
- Implement undo system
- Add prominent search
- Fix mobile touch targets
- **Expected Impact**: Error Tolerance 2→4, Findable 2→3

### Phase 2: Major Improvements (Weeks 3-6)
- Navigation redesign
- Mobile optimization
- Improved error messages
- **Expected Impact**: Usable 3→4, Mobile 2→4

### Phase 3: Polish (Weeks 7-10)
- Visual design refresh
- Micro-interactions
- Performance optimization
- **Expected Impact**: Desirable 3→4, Efficiency 3→4

### Métricas de éxito
- Overall UX score: 62 → 80+
- User satisfaction (SUS): [Current] → 75+
- Task completion: [Current] → 90%+
- Support tickets: -40%

---

## 8. Next Steps

1. **Stakeholder Review** (Week 0)
   - Present findings
   - Align on priorities
   - Secure resources

2. **Prototyping** (Week 1)
   - Create wireframes for proposals
   - Get quick feedback

3. **User Testing** (Week 2)
   - Validate assumptions
   - Test prototypes

4. **Implementation** (Weeks 3+)
   - Phased rollout
   - Monitor metrics
   - Iterate based on data

---

## Notas de metodología

- **Framework**: IxDF "The Basics of User Experience Design"
- **Standards**: 7 UX Factors + 5 Usability Characteristics + 5 Interaction Dimensions
- **Approach**: Expert review + heuristic evaluation + research recommendations
- **Limitations**: Simulated evaluation; validate with real users
- **Complement with**:
  - Nielsen Heuristics for usability depth
  - WCAG for accessibility compliance
  - Cognitive Walkthrough for task-specific analysis
  - UI Design Review for visual polish

---

## Referencias

- Interaction Design Foundation - "The Basics of User Experience Design"
- Peter Morville - User Experience Honeycomb (7 Factors)
- ISO 9241-11 - Usability definition and metrics
- Gillian Crampton Smith & Kevin Silver - 5 Dimensions of Interaction Design
- Jakob Nielsen - Usability engineering principles

---

**Version**: 1.0
**Last Updated**: [Date]
```---

## Pautas de puntuación

### Puntuación general de salud de UX

Combine los tres marcos:
- 7 factores UX: 35 puntos máximo
- 5 Características de Usabilidad: 25 puntos máximo
- 5 dimensiones de interacción: 25 puntos máximo (convertir a escala de 5 puntos)

**Total**: 85 puntos posibles

**Calificación:**
- 85-75: A (Excelente) - La mejor UX de su clase
- 74-65: B (Bueno) - UX sólida, mejoras menores
- 64-55: C (Aceptable) - Funcional pero necesita trabajo
- 54-45: D (Deficiente) - Problemas importantes, se necesita un rediseño significativo
- 44-0: F (Crítico) - UX rota, se requiere revisión completa

---

## Directrices específicas para dispositivos móviles (Capítulo 8 de IxDF)

Al evaluar el móvil:

### 1. Pantallas pequeñas
- El contenido se ajusta a la ventana gráfica sin desplazamiento horizontal
- Objetivos táctiles 44×44px mínimo
- Texto legible sin zoom (16px+ cuerpo)
- Diseños de una columna

### 2. Navegación sencilla
- Barra de pestañas inferior (4-5 elementos)
- Hamburguesa para secundaria
- Sin jerarquías profundas (3 niveles máximo)
- Áreas de grifo grandes y despejadas

### 3. Contenido mínimo
- Divulgación progresiva
- Contenido prioritario en la mitad superior de la página
- Secciones colapsadas
- Evite páginas largas

### 4. Insumos reducidos
- Minimizar la escritura
- Valores predeterminados inteligentes
- Autocompletar
- Alterna entre campos de texto

### 5. Conexiones estables
- Funcionalidad sin conexión
- Sincronizar cuando está en línea
- UI optimista
- Borrar estado de conexión

### 6. Experiencias integradas
- Usar las capacidades del dispositivo (cámara, GPS, notificaciones)
- Sensación nativa en la plataforma
- Gestos (deslizar, pellizcar)

---

## Integración del pensamiento de diseño

Esta habilidad incorpora Design Thinking:

**Empatizar**: a través de la investigación de usuarios y la creación de personajes.
**Definir**: Identificando los planteamientos de problemas de la auditoría
**Idear**: a través de una lluvia de ideas sobre propuestas de rediseño
**Prototipo**: recomendando wireframes y maquetas
**Prueba**: mediante recomendaciones de pruebas de usabilidad

---

## Mejores prácticas1. **Basado en evidencia**: respalde las calificaciones con datos, comentarios u observaciones
2. **Piense de manera integral**: considere todos los marcos juntos
3. **Priorizar sin piedad**: centrarse en mejoras viables y de alto impacto
4. **Validar supuestos**: recomendar una investigación de usuarios para confirmar los hallazgos
5. **Sea práctico**: proporcione recomendaciones específicas, no sugerencias vagas
6. **Considere el contexto**: dispositivos móviles versus computadoras de escritorio, tipos de usuarios, limitaciones comerciales
7. **Factores de equilibrio**: compensaciones entre estética, usabilidad y necesidades comerciales
8. **Iterar**: Auditoría → Rediseñar → Probar → Refinar
9. **Medir el impacto**: definir métricas de éxito antes de implementar
10. **Manténgase ético**: presente hallazgos honestos, reconozca las limitaciones

---

## Versión

1.0 - Lanzamiento inicial basado en IxDF "Conceptos básicos del diseño de experiencias de usuario"

---

**Recuerde**: esta auditoría holística proporciona una base de referencia integral de UX. Para profundizar más, realice un seguimiento con auditorías especializadas (Nielsen para usabilidad, WCAG para accesibilidad, Cognitive Walkthrough para tareas específicas, UI Design Review para pulido visual).