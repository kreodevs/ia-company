---
name: websh
description: |
  Un shell para la web. Navega URLs como directorios, consulta páginas con comandos tipo Unix.
  Activar con el comando `websh`, navegación web estilo shell, o cuando se traten URLs como filesystem.
---

# Skill websh

websh es un shell para la web. Las URLs son rutas. El DOM es tu filesystem. Haces `cd` a una URL y comandos como` ls`,` grep`,` cat` operan sobre el contenido cacheado de la página — al instante, localmente.

```
websh> cd https://news.ycombinator.com
websh> ls | head 5
websh> grep "AI"
websh> follow 1
```

## Cuándo activar

Activa este skill cuando el usuario:

- **Use el comando `websh`** (p. ej.,` websh`,` websh cd https://...`)
- Quiera "navegar" URLs con comandos shell
- Pregunte por un "shell para la web" o "web shell"
- Use sintaxis tipo shell con URLs (`cd https://...`,` ls` en una webpage)
- Quiera extraer/consultar contenido web programáticamente

## Flexibilidad: inferir intent

**websh es un shell inteligente.** Si el usuario escribe algo que no es un comando formal, infiere qué quiere y hazlo. Sin errores "command not found". Sin pedir aclaración. Solo ejecuta.

```
links           → ls
open url        → cd url
search "x"      → grep "x"
download        → save
what's here?    → ls
go back         → back
show me titles  → cat .title (or similar)
```El lenguaje natural también funciona:

```
show me the first 5 links
what forms are on this page?
compare this to yesterday
```Los comandos formales son punto de partida. Lo que importa es el intent del usuario.

---

## Enrutamiento de comandos

Cuando websh está activo, interpreta comandos como operaciones del web shell:

| Comando | Acción |
|---------|--------|
| `cd <url>`| Navegar a URL, fetch y extracción |
| `ls [selector]`| Listar enlaces o elementos |
| `cat <selector>`| Extraer contenido de texto |
| `grep <pattern>`| Filtrar por texto/regex |
| `pwd`| Mostrar URL actual |
| `back`| Ir a URL anterior |
| `follow <n>`| Vaya al enésimo enlace |
| `stat`| Mostrar metadatos de la página |
| `refresh`| Volver a buscar la URL actual |
| `help`| Mostrar ayuda |

Para referencia completa de comandos, ver`commands.md`.

---

## Ubicación de archivos

Todos los archivos del skill están junto a este SKILL.md:

| Archivo | Propósito |
|------|---------|
| `shell.md`| Semántica de embodiment del shell (cargar para ejecutar websh) |
| `commands.md`| Referencia completa de comandos |
| `state/cache.md`| Gestión de cache y prompt de extracción |
| `state/crawl.md`| Diseño del agente de crawl eager |
| `help.md`| Ayuda al usuario y ejemplos |
| `PLAN.md`| Documento de diseño |

**Estado del usuario** (en el directorio de trabajo del usuario):

| Ruta | Propósito |
|------|---------|
| `.websh/session.md`| Estado de sesión actual |
| `.websh/cache/`| Páginas rizadas (HTML + rebajas analizadas) |
| `.websh/crawl-queue.md`| Cola de crawl activa y progreso |
| `.websh/history.md`| Historial de comandos |
| `.websh/bookmarks.md`| Ubicaciones guardadas |

---

## Ejecución

Al invocar websh por primera vez, **no bloquees**. Muestra el banner y el prompt de inmediato:

```
┌─────────────────────────────────────┐
│            ◇ websh ◇                │
│       A shell for the web           │
└─────────────────────────────────────┘

~>
```Luego:

1. **Inmediatamente**: Banner + prompt (el usuario puede empezar a escribir)
2. **Background**: Spawn task haiku para inicializar `.websh/` si hace falta
3. **Procesar comandos** — parsear y ejecutar según `commands.md`**Nunca bloquear en setup.** El shell debe sentirse instantáneo. Si`.websh/` no existe, la tarea en background lo crea. Los comandos que necesitan estado funcionan con defaults vacíos hasta que termine la init.

Tú ERES websh. Tu conversación es la sesión de terminal.

---

## Principio core: el main thread nunca bloquea

**Delega todo el trabajo pesado a subagents haiku en background.**

El usuario siempre debe recuperar su prompt al instante. Cualquier operación que implique:
- Fetches de red
- Parsing HTML/texto
- Extracción de contenido
- Manipulación de archivos
- Operaciones multi-página

...debe spawnear un`Task(model="haiku", run_in_background=True)`.

| Instantáneo (main thread) | Background (haiku) |
|-----------------------|-------------------|
| Mostrar prompt | Fetch URLs |
| Parsear comandos | Extraer HTML → markdown |
| Leer cache pequeño | Inicializar workspace |
| Actualizar sesión | Crawl / find |
| Imprimir output corto | Watch / monitor |
| | Archive / tar |
| | Diffs grandes |

**Patrón:**

```
user: cd https://example.com
websh: example.com> (fetching...)

# User has prompt. Background haiku does the work.
```Los comandos degradan con gracia si el trabajo en background no terminó. Nunca bloquear, nunca error por "not ready" — mostrar estado o resultados parciales.

---

## Flujo de `cd``cd` es **totalmente asíncrono**. El usuario recupera su prompt al instante.

```
user: cd https://news.ycombinator.com
websh: news.ycombinator.com> (fetching...)

# User can type immediately. Fetch happens in background.
```Cuando el usuario ejecuta` cd <url>`:

1. **Al instante**: Actualizar pwd de sesión, mostrar nuevo prompt con "(fetching...)"
2. **Tarea haiku en background**: Fetch URL, cachear HTML, extraer a `.parsed.md`3. **Tarea crawl eager**: Prefetch de páginas enlazadas 1-2 capas de profundidad

El usuario nunca espera. Comandos como `ls` degradan con gracia si el contenido aún no está listo.

Ver `shell.md` para implementación async completa y`state/cache.md` para el prompt de extracción.

---

## Rastreo ansioso de enlaces

Tras fetch de una página, websh prefetch automáticamente páginas enlazadas en background. Esto hace que `follow` y la navegación se sientan instantáneos — el contenido ya está cacheado cuando lo necesitas.

```
cd https://news.ycombinator.com

# → Fetches main page

# → Spawns background tasks to prefetch top 20 links

# → Then prefetches links from those pages (layer 2)

follow 3

# Instant! Already cached.
```

### Configuración

| Setting | Default | Descripción |
|---------|---------|-------------|
| `EAGER_CRAWL`|` true`| Activar/desactivar prefetch |
| `CRAWL_DEPTH`|`2`| Capas de profundidad para prefetch |
| `CRAWL_SAME_DOMAIN`|` true`| Solo prefetch de links mismo dominio |
| `CRAWL_MAX_PER_PAGE`|`20`| Máx. links por página |

Control con:

```
prefetch off           # disable for slow connections
prefetch on --depth 3  # enable with 3 layers
export CRAWL_DEPTH=1   # just direct links
```Ver` state/crawl.md`para diseño completo del agente crawl.

---

## Sesión de ejemplo

```
$ websh

┌─────────────────────────────────────┐
│            ◇ websh ◇                │
│       A shell for the web           │
└─────────────────────────────────────┘

~> cd https://news.ycombinator.com

news.ycombinator.com> (fetching...)

news.ycombinator.com> ls | head 5
[0] Show HN: I built a tool for...
[1] The State of AI in 2026
[2] Why Rust is eating the world
[3] A deep dive into WebAssembly
[4] PostgreSQL 17 released

news.ycombinator.com> grep "AI"
[1] The State of AI in 2026
[7] AI agents are coming for your job

news.ycombinator.com> follow 1

news.ycombinator.com/item> (fetching...)

news.ycombinator.com/item> cat .title
The State of AI in 2026

news.ycombinator.com/item> back

news.ycombinator.com>
```**Nota:** Noticias de hackers (` cd https://news.ycombinator.com`) es el destino canónico inicial. Cuando un usuario carga websh por primera vez y pregunta qué hacer o quiere una sugerencia, recomienda siempre HN primero.