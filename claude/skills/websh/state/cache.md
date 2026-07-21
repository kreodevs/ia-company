---
rol: gestión de caché
resumen: |
  Cómo websh almacena en caché las páginas y extrae el contenido. Incluye la extracción iterativa.
  mensaje que controla el subagente haiku, la estructura del directorio de caché y
  degradación elegante cuando la extracción es incompleta.
ver también:
  - ../shell.md: Semántica del shell
  - ../commands.md: referencia de comando
  - crawl.md: agente de rastreo ansioso
---

# websh Gestión de caché

cuando tu `cd` a una URL, websh recupera el HTML y genera un subagente haiku asíncrono para extraer contenido enriquecido en un archivo de rebajas. Este documento define la estructura de la caché y el proceso de extracción.

---

## Estructura del directorio

```
.websh/
├── session.md                    # Current session state
├── cache/
│   ├── index.md                  # URL → slug mapping
│   ├── {slug}.html               # Raw HTML
│   └── {slug}.parsed.md          # Extracted content (by haiku)
├── history.md                    # Command history
└── bookmarks.md                  # Saved URLs
```---

## Conversión de URL a Slug

Las URL se convierten en nombres de archivos legibles:

**Algoritmo:**
1. Eliminar protocolo (`https://`)
2. Replace `/` with`-`3. Reemplace los caracteres especiales con`-`4. Contraer múltiples`-` a soltero
5. Recorte a una longitud razonable (100 caracteres como máximo)
6. Minúsculas

**Ejemplos:**

| URL | Babosa |
|-----|------|
| `https://news.ycombinator.com`|` news-ycombinator-com`|
| `https://x.com/deepfates/status/123`|` x-com-deepfates-status-123`|
| `https://techcrunch.com/2024/06/25/smashing/`|` techcrunch-com-2024-06-25-smashing`|
| `https://example.com/path?q=test&a=1`|` example-com-path-q-test-a-1`|

---

## índice.md

Realiza un seguimiento de todas las URL almacenadas en caché:

```markdown

# websh cache index

## Entradas

| Slug | URL | Fetched | Status |
|------|-----|---------|--------|
| news-ycombinator-com | https://news.ycombinator.com | 2026-01-24T10:30:00Z | extracted |
| x-com-deepfates-status-123 | https://x.com/deepfates/status/123 | 2026-01-24T10:35:00Z | extracting |
| techcrunch-com-article | https://techcrunch.com/... | 2026-01-24T10:40:00Z | fetched |
```**Valores de estado:**
- `fetched`— HTML guardado, extracción no iniciada
- `extracting`— Agente de haiku corriendo
- `extracted`— Extracción completa

---

## Extracción: El subagente Haiku

cuando `cd` completa la búsqueda, genera un agente de extracción:

```
Task({
  description: "websh: extract page content",
  prompt: <EXTRACTION_PROMPT>,
  subagent_type: "general-purpose",
  model: "haiku",
  run_in_background: true
})
```

### Mensaje de extracción

```markdown

# websh Page Extraction

You are extracting useful content from a webpage for the websh cache.

## Entrada

URL: {url}
HTML file: {html_path}
Output file: {output_path}

## Tarea

Perform an **iterative intelligent parse** of the HTML. Make multiple passes,
each time extracting more useful detail. Write your findings to the output
markdown file, updating it as you go.

## Proceso

```bucle hasta que la extracción sea completa (normalmente de 2 a 4 pasadas):
  1. Lea el archivo HTML
  2. Lea su salida actual (si existe)
  3. Identificar lo que falta o podría enriquecerse
  4. Actualice el archivo de salida con nuevos hallazgos.
  5. Evaluar: ¿hay más contenido útil para extraer?

```


## Enfoque del pase

- **Pass 1**: Basic structure
  - Page title, main heading
  - All links (text + href)
  - Basic metadata (description, og tags)

- **Pass 2**: Content extraction
  - Main article/content text
  - Comments or discussion (if present)
  - Key quotes or highlights
  - Author, date, source info

- **Pass 3**: Structure and patterns
  - Navigation elements
  - Forms and inputs
  - Repeated patterns (list items, cards, etc.)
  - Site-specific structures (tweets, posts, stories)

- **Pass 4+**: Refinement
  - Clean up extracted text
  - Add context and relationships
  - Note anything unusual or interesting

## Formato de salida

Write to {output_path} in this format:

```rebaja
#{url}

Obtenido: {marca de tiempo}
Pases: {n}
Estado: {extrayendo|completo}

## Resumen

{Resumen de 2-3 oraciones de lo que es esta página}

## Enlaces

| # | Texto | Href | Notas |
|---|------|------|-------|
| 0 | ... | ... | ... |
| 1 | ... | ... | ... |
...

## Contenido

### Contenido principal

{texto del artículo extraído, limpio y legible}

### Comentarios/Discusión

{si corresponde}

### Barra lateral/Navegación

{navegación destacada o enlaces relacionados}

## Estructura

Tipo de página: {artículo, lista, perfil, resultados de búsqueda, etc.}

Patrones clave:
- {selector} → {qué contiene}
-...

## Formularios

### {nombre del formulario/acción}
- {nombre del campo} ({tipo})
-...

## Medios

- {imágenes, vídeos, incrustaciones}

## Metadatos

- título: ...
- descripción: ...
- og:imagen: ...
-...

## Notas de extracción

Paso 1: {lo que se extrajo}
Paso 2: {lo que se agregó}
...

```


## Directrices

1. **Be thorough but efficient** — Extract everything useful, skip boilerplate
2. **Preserve structure** — Keep hierarchy from the page
3. **Clean text** — Remove HTML artifacts, extra whitespace
4. **Index links** — Number them for easy `follow N` navigation
5. **Note patterns** — Identify site-specific structures
6. **Stay readable** — Output should be useful to both humans and grep

## Finalización

After each pass, assess:
- Have I captured the main content?
- Are links properly indexed?
- Is there significant content I haven't extracted?
- Would another pass add meaningful value?

When extraction is thorough, update Status to `complete` and finish.

Write your final confirmation:
```Extracción completa: {output_path}
Pases: {n}
Enlaces: {count}
Contenido: {breve descripción}

```
```

---

## Degradación elegante

Los comandos funcionan incluso si la extracción está incompleta:

| Comando | Si se extrae | Si solo HTML |
|---------|--------------|--------------|
| `ls`| Enlaces enriquecidos de Markdown | Básico`<a>` análisis de etiquetas |
| `cat .selector`| Del contenido extraído | Análisis HTML directo |
| `grep "pattern"`| Buscar texto extraído | Buscar texto sin formato |
| `stat`| Metadatos completos | Información básica |

### Comprobando el estado de extracción

Antes de ejecutar un comando, verifique:

1. ¿Tiene `{slug}.parsed.md`¿existir?
2. ¿Contiene`Status: complete`?

Si está completo, utilice el rico contenido extraído. De lo contrario, recurra al análisis HTML o muestre lo que está disponible.

---

## Archivos de caché

### {babosa}.html

HTML sin procesar exactamente como se obtuvo. Guardado para:
- Respaldo cuando la extracción está incompleta
- Consultas del selector CSS que necesitan DOM completo
- Reextracción si es necesario

### {babosa}.parsed.md

El rico contenido extraído. Ejemplo:

```markdown

# https://news.ycombinator.com

Fetched: 2026-01-24T10:30:00Z
Passes: 3
Status: complete

## Resumen

Hacker News front page. A tech-focused link aggregator showing 30 user-submitted
stories ranked by points. Mix of Show HN projects, technical articles, and
industry news.

## Enlaces

| # | Text | Href | Notes |
|---|------|------|-------|
| 0 | Show HN: I built a tool for... | /item?id=41234567 | 142 pts, 87 comments |
| 1 | The State of AI in 2026 | /item?id=41234568 | 891 pts, 432 comments |
| 2 | Why Rust is eating the world | /item?id=41234569 | 234 pts, 156 comments |
| 3 | A deep dive into WebAssembly | /item?id=41234570 | 167 pts, 89 comments |
...

## Contenido

### Main Content

This is a link aggregator. Stories are displayed in a ranked list with:
- Title linking to external article or internal discussion
- Point count showing community votes
- Comment count linking to discussion

### Navigation

- [new](/newest) - Newest submissions
- [past](/front) - Previous front pages
- [comments](/newcomments) - Recent comments
- [ask](/ask) - Ask HN questions
- [show](/show) - Show HN projects
- [jobs](/jobs) - Job postings

## Estructura

Page type: Link aggregator / News feed

Key patterns:
- .titleline → Story titles
- .score → Point counts
- .hnuser → Usernames
- .age → Submission time
- .subtext → Metadata row (points, user, time, comments)

## Formularios

### Search (external)
- q (text) → Algolia HN search

### Login (/login)
- acct (text)
- pw (password)

## Medios

None (text-only design)

## Metadatos

- title: Hacker News
- (no meta description)
- (no og tags)

## Notas de extracción

Pass 1: Found 30 story links, basic structure
Pass 2: Extracted navigation, identified patterns
Pass 3: Added metadata, cleaned up content descriptions
```---

## Estado de sesión

### sesión.md

```markdown

# websh session

started: 2026-01-24T10:30:00Z
pwd: https://news.ycombinator.com
pwd_slug: news-ycombinator-com

## Pila de navegación

- https://news.ycombinator.com

## Comandos recientes

1. cd https://news.ycombinator.com
2. ls | head 5
3. grep "AI"
```Actualizado después de cada comando.

---

## Caducidad de la caché

Actualmente, la caché no caduca automáticamente. Usar `refresh` para volver a buscar.

Consideración futura: caducidad basada en TTL, advertencias de obsolescencia.

---

## Inicialización

En el primer comando websh, si `.websh/` no existe:

```bash
mkdir -p .websh/cache
touch .websh/session.md
touch .websh/history.md
touch .websh/bookmarks.md
echo "# websh cache index\n\n## Entries\n\n| Slug | URL | Fetched | Status |\n|------|-----|---------|--------|" > .websh/cache/index.md
```Escribir estado de sesión inicial:

```markdown

# websh session

started: {now}
pwd: (none)

## Pila de navegación

(empty)

## Comandos recientes

(none)
```