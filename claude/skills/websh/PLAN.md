# websh: un shell para la web

## Visión

Un shell donde las URL son rutas y el DOM es su sistema de archivos. Usted navega a una URL y los comandos operan en el contenido de la página almacenado en caché, de manera instantánea, local, sin necesidad de volver a buscarlo.

```
websh> cd https://news.ycombinator.com
websh> ls                    # list links
websh> grep "AI" | head 5    # filter
websh> cat .title            # CSS selector extraction
websh> follow 3              # navigate to 3rd link
```La web se convierte en un entorno informático que se explora con comandos familiares.

---

## Principios de diseño

1. **Buscar una vez, operar localmente** — `cd` búsquedas y cachés; todos los demás comandos funcionan en caché
2. **Estructura de caché plana**: las URL se convierten en nombres de archivos planos (barras → guiones)
3. **Tú ERES el caparazón**: Claude encarna websh y mantiene el estado de la sesión.
4. **Primitivas componibles**: pequeños comandos que se combinan
5. **Familiar UX**: comandos similares a Unix adaptados para la semántica web

---

## Estructura del directorio

### Archivos de habilidades (en este directorio)

```
prose/skills/websh/
├── SKILL.md              # Activation triggers, command routing
├── PLAN.md               # This file
├── shell.md              # Core shell semantics (you ARE websh)
├── commands.md           # Command reference (ls, cat, grep, etc.)
├── state/
│   └── cache.md          # Cache management and format
└── help.md               # User help and examples
```

### Estado del usuario (en el directorio de trabajo)

```
.websh/
├── session.md            # Current session state (pwd, history)
├── cache/
│   ├── {url-slug}.html       # Raw HTML
│   ├── {url-slug}.parsed.md  # Iterative extraction (by haiku)
│   └── index.md              # URL → slug mapping, fetch times
├── history.md            # Command history
└── bookmarks.md          # Saved locations
```

### Convención de nombre de archivo de caché

Las URL se aplanan hasta convertirse en barras legibles:
- `https://news.ycombinator.com`→` news-ycombinator-com`-` https://x.com/deepfates/status/123`→` x-com-deepfates-status-123`-` https://techcrunch.com/2024/06/25/article-name/`→` techcrunch-com-2024-06-25-article-name`Cada URL almacenada en caché obtiene dos archivos:
- `{slug}.html`— raw HTML
- `{slug}.parsed.md`— extracción iterativa

el `index.md` asigna URL completas a slugs y realiza un seguimiento del estado de recuperación/extracción.

---

## Comandos principales

| Comando | Descripción | Opera en |
|---------|-------------|-------------|
| `cd <url>`| Navegue a URL, busque y extraiga (asíncrono) | Red → Caché → Extracción de Haiku |
| `pwd`| Mostrar URL actual | Sesión |
| `ls [selector]`| Listar enlaces o elementos | Caché |
| `cat <selector>`| Extraer contenido de texto | Caché |
| `grep <pattern>`| Filtrar por texto/expresión regular | Caché |
| `head <n>`/` tail <n>`| Resultados de corte | Tubería |
| `follow <n\|text>`| Navegue hasta el enésimo enlace o texto coincidente | Caché → Red |
| `back`| Ir a la URL anterior | Historial de sesiones |
| `refresh`| Volver a buscar la URL actual | Red → Caché |
| `stat`| Mostrar metadatos de la página (título, recuento de enlaces, etc.) | Caché |
| `save <path>`| Guardar la página actual en un archivo | Caché → Sistema de archivos |
| `history`| Mostrar historial de navegación | Sesión |
| `bookmarks`| Listar ubicaciones guardadas | Estado del usuario |
| `bookmark [name]`| Guardar URL actual | Estado del usuario |

### Extensiones planificadas

| Comando | Descripción |
|---------|-------------|
| `diff <url1> <url2>`| Comparar dos páginas |
| `watch <url>`| Encuesta para cambios |
| `form <selector>`| Interactuar con formularios |
| `click <selector>`| Simular clic (sitios con mucho JS) |
| `mount <api> <path>`| Montar API como directorio virtual |

---

## El `cd` Flujo: buscar + extraer

Cuando el usuario ejecuta`cd <url>`, websh realiza una operación de dos fases:

### Fase 1: Recuperación (sincrónica)

```
cd https://news.ycombinator.com
   │
   ├─→ WebFetch the URL
   ├─→ Save raw HTML to .websh/cache/{hash}.html
   ├─→ Update index.json with URL → hash mapping
   └─→ Update session.md with new pwd
```El usuario ve:` fetching... done`### Fase 2: Extracto (subagente de haiku asíncrono, iterativo)

Inmediatamente después de la recuperación, genera un agente de haiku en segundo plano que **se repite** para generar una rica extracción de rebajas:

```
Task({
  description: "websh: iterative page extraction",
  prompt: "<extraction prompt - see below>",
  subagent_type: "general-purpose",
  model: "haiku",
  run_in_background: true
})
```El agente haiku ejecuta un **análisis inteligente iterativo**:

```
loop until **extraction is thorough**:
  1. Read the raw .html
  2. Read current .parsed.md (if exists)
  3. Identify what's missing or could be richer
  4. Append/update the .parsed.md with new findings
  5. Repeat until diminishing returns
```Cada pase se centra en diferentes aspectos:
- **Pase 1**: Estructura básica (título, encabezados principales, inventario de enlaces)
- **Pase 2**: Extracción de contenido (texto del artículo, comentarios, citas clave)
- **Pase 3**: Metadatos y contexto (autor, fecha, enlaces relacionados, estructura del sitio)
- **Pase 4+**: casos extremos, contenido perdido, limpieza

**Salida: `.websh/cache/{hash}.parsed.md`**

```markdown

# https://news.ycombinator.com

Fetched: 2026-01-24T10:30:00Z
Extraction: 3 passes

## Resumen

Hacker News front page. Tech news aggregator with user-submitted links
and discussions. 30 stories visible, mix of Show HN, technical articles,
and industry news.

## Enlaces

| # | Title | Points | Comments |
|---|-------|--------|----------|
| 0 | Show HN: I built a tool for... | 142 | 87 |
| 1 | The State of AI in 2026 | 891 | 432 |
| 2 | Why Rust is eating the world | 234 | 156 |
...

## Navigation

- [new](/newest) - Newest submissions
- [past](/front) - Past front pages
- [comments](/newcomments) - Recent comments
- [ask](/ask) - Ask HN
- [show](/show) - Show HN
- [jobs](/jobs) - Jobs

## Patrones de contenido

This is a link aggregator. Each story has:
- Title (class: .titleline)
- Points and submitter (class: .score, .hnuser)
- Comment count (links to /item?id=...)
- Domain in parentheses

## Raw Text Snippets

### Top Stories
1. "Show HN: I built a tool for..." - 142 points, 87 comments
2. "The State of AI in 2026" - 891 points, 432 comments
...

## Formularios

- Search: input[name=q] at /hn.algolia.com
- Login: /login (username, password)

## Notes

- No images on front page (text-only design)
- Mobile-friendly, minimal CSS
- Stories refresh frequently
```**Experiencia de usuario:**

```
news.ycombinator.com> cd https://example.com

fetching... done
extracting... (pass 1)

example.com> ls

# Shows what's available so far

# Agent continues extracting in background

# Subsequent commands get richer data as passes complete
```

### ¿Por qué iterativo?

- **Riqueza progresiva**: la primera pasada proporciona lo básico rápidamente, las pasadas posteriores añaden profundidad
- **Enfoque inteligente**: Haiku decide qué extraer según el tipo de página
- **Salida legible por humanos**: Markdown es inspeccionable, depurable y útil
- **Degradación elegante**: los comandos funcionan después del pase 1, mejoran con más pases
- **Consciente del sitio**: Haiku reconoce patrones (historias HN, tweets, publicaciones de blogs) y se adapta

### ¿Por qué haikus?

- **Rápido**: cada pase se completa rápidamente
- **Barato**: varios pases siguen siendo económicos
- **Paralelo**: No bloquea los comandos del usuario
- **Inteligente**: adapta la estrategia de extracción al tipo de contenido

---

## Gestión del Estado

### Estado de la sesión (`session.md`)

Realiza un seguimiento de la sesión de shell actual:

```markdown

# websh session

pwd: https://news.ycombinator.com
started: 2026-01-24T10:30:00Z

## History
1. cd https://news.ycombinator.com
2. ls
3. grep "AI"

## Navigation stack
- https://news.ycombinator.com (current)
```

### Formato de caché

Cada página almacenada en caché tiene dos archivos:

** `{hash}.html`** — HTML obtenido sin procesar (como referencia, consultas de selector)

** `{hash}.parsed.md`** — Extracción inteligente (escrito iterativamente por haiku):

```markdown

# https://news.ycombinator.com

Fetched: 2026-01-24T10:30:00Z
Passes: 3
Status: complete

## Resumen

Hacker News front page. Tech news aggregator with 30 stories.
Mix of Show HN projects, technical deep-dives, and industry news.

## Enlaces

| # | Title | Href | Meta |
|---|-------|------|------|
| 0 | Show HN: I built... | /item?id=123 | 142 pts, 87 comments |
| 1 | The State of AI | /item?id=456 | 891 pts, 432 comments |
...

## Contenido

### Main content
(extracted article text, cleaned up)

### Comments
(if applicable)

### Sidebar / Navigation
- [new](/newest)
- [past](/front)
...

## Estructura

Page type: Link aggregator
Key selectors:
- .titleline → story titles
- .score → point counts
- .hnuser → usernames

## Formularios

### Login (/login)
- username (text)
- password (password)

## Medios

(none on this page)

## Metadatos

- og:title: Hacker News
- description: News for hackers

## Notas de extracción

Pass 1: Basic structure, 30 links found
Pass 2: Extracted metadata, identified page type
Pass 3: Cleaned up content, noted patterns
```El formato de rebajas es:
- **Legible por humanos**: puedes `cat` y entender la página
- **Compatible con Grep**: comandos como `grep "AI"` trabajar naturalmente
- **Construido iterativamente**: cada paso agrega/refina secciones
- **Consciente del sitio**: Haiku adapta la estructura al tipo de contenido

Comandos como `ls`,` grep`,` cat`leer del`.json` archivo para mayor velocidad. El`.html` está disponible para extracción basada en selector.

---

## Patrón de realización de concha

Siguiendo el patrón OpenProse VM, websh utiliza el enfoque "tú ERES el shell":

```markdown

# From shell.md

You are websh—a shell for navigating and querying the web.

When you receive a command:
1. Parse it using the command grammar
2. Check if it requires network (cd, refresh, follow) or operates on cache
3. For cache operations, read from .websh/cache/
4. Update session state
5. Return output in shell format

You maintain:
- Current working URL (pwd)
- Navigation history (back stack)
- Command history
- Cache index

Your prompt format:
{domain}>

Example:
news.ycombinator.com> ls
```---

## Archivos para crear

### Fase 1: capa central

1. **SKILL.md** — Activadores de activación, enrutamiento de comandos
   - Activar en:`websh`,` web shell`, URL en contexto de shell
   - Ruta a shell.md para su ejecución.

2. **shell.md** — Semántica del shell
   - Instrucciones de realización
   - Análisis de comandos
   - Gestión estatal
   - Formato de salida

3. **commands.md** — Referencia de comandos
   - Sintaxis detallada para cada comando.
   - Ejemplos
   - Comportamiento de las tuberías

4. **state/cache.md** — Gestión de caché
   - Buscar y almacenar
   - **Mensaje de extracción iterativo** (el mensaje que impulsa el bucle del haiku)
   - Gestión de índices
   - Degradación elegante (los comandos funcionan antes de que se complete la extracción)
   - Caducidad/actualización

5. **help.md** — Documentación del usuario
   - Empezando
   - Hoja de trucos de comando
   - Ejemplos

### Fase 2: Extensiones

- Interacción de formularios
- Páginas renderizadas en JavaScript (a través de herramientas del navegador, si están disponibles)
- Montaje API
- Comandos de diferenciación/reloj

---

## Sesión de ejemplo

```
$ websh

┌─────────────────────────────────────┐
│          ◇ websh ◇                  │
│     A shell for the web             │
└─────────────────────────────────────┘

~> cd https://news.ycombinator.com

fetching... cached
navigated to news.ycombinator.com

news.ycombinator.com> ls | head 5
[0] Show HN: I built a tool for...
[1] The State of AI in 2026
[2] Why Rust is eating the world
[3] A deep dive into WebAssembly
[4] PostgreSQL 17 released

news.ycombinator.com> grep "AI"
[1] The State of AI in 2026
[7] AI agents are coming for your job
[12] OpenAI announces GPT-5

news.ycombinator.com> follow 1

fetching... cached
navigated to news.ycombinator.com/item?id=...

news.ycombinator.com/item> cat .title
The State of AI in 2026

news.ycombinator.com/item> cat .comment | head 3
[0] Great article, but I disagree with...
[1] This matches what I've seen at...
[2] The author missed the point about...

news.ycombinator.com/item> back

news.ycombinator.com> bookmark hn

Bookmarked: hn → https://news.ycombinator.com

news.ycombinator.com> stat
URL:      https://news.ycombinator.com
Title:    Hacker News
Fetched:  2026-01-24T10:30:00Z (5 min ago)
Links:    30
Size:     45 KB
```---

## Preguntas abiertas

1. **Páginas renderizadas en JS**: muchos sitios requieren JavaScript. Opciones:
   - Falla con gracia con un mensaje útil
   - Integre con herramientas de automatización del navegador si están disponibles
   - Utilice API siempre que sea posible (por ejemplo, API de Twitter/X frente a scraping)

2. **Autenticación**: ¿Cómo manejar las sesiones iniciadas?
   - ¿Importación de cookies desde el navegador?
   - ¿Configuración manual del encabezado?

3. **Limitación de velocidad**: ¿El límite de velocidad de Websh debería recuperarse automáticamente?

4. **Caducidad de la caché**: ¿basada en TTL? ¿Actualización manual únicamente?

---

## Próximos pasos

1. Cree SKILL.md con activadores de activación
2. Escriba shell.md con la semántica de realización central
3. Escribe comandos.md con gramática de comandos.
4. Escriba state/cache.md con lógica de almacenamiento en caché
5. Escriba help.md para los usuarios.
6. Pruebe con URL reales

---

## Inspiración

- Filosofía de shell de Unix (pequeñas herramientas, tuberías, flujos de texto)
- Patrón OpenProse VM (realización, archivos de estado)
- El tweet original: "¿Existe un shell para la web?"