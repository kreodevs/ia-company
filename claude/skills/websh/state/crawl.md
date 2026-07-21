---
rol: gestión de rastreo
resumen: |
  Rastreo ansioso de enlaces en busca de websh. Después de buscar una página, realizar una búsqueda previa automática
  páginas vinculadas 1-2 capas en el fondo. Hace que la navegación parezca instantánea.
ver también:
  - cache.md: estructura de caché
  - ../shell.md: Semántica del shell
  - ../commands.md: referencia de comando
---

# websh Rastreo ansioso

cuando tu `cd` a una URL, websh puede buscar automáticamente páginas vinculadas en segundo plano. Esto hace`follow` y la navegación se siente instantánea: el contenido ya está almacenado en caché cuando lo necesita.

---

## Cómo funciona

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   cd https://news.ycombinator.com                         │
│         │                                                  │
│         ▼                                                  │
│   ┌───────────────┐                                       │
│   │ Fetch + Extract│  ← Background haiku (existing)       │
│   │ the main page  │                                      │
│   └───────┬───────┘                                       │
│           │ After Pass 1 (links identified)               │
│           ▼                                                │
│   ┌───────────────┐                                       │
│   │ Spawn Eager   │  ← New background haiku               │
│   │ Crawl Agent   │                                       │
│   └───────┬───────┘                                       │
│           │                                                │
│           ▼                                                │
│   For each link (prioritized, rate-limited):             │
│   ┌───────────────┐                                       │
│   │ Fetch + Extract│  ← Parallel background tasks          │
│   │ linked page    │                                       │
│   └───────┬───────┘                                       │
│           │ If depth < max_depth                          │
│           ▼                                                │
│   Queue its links for next layer...                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```El usuario recibe su aviso inmediatamente. Todo el rastreo se realiza de forma asincrónica.

---

## Configuración de rastreo

almacenado en `.websh/session.md` en Medio Ambiente:

```markdown

## Entorno

EAGER_CRAWL: true
CRAWL_DEPTH: 2
CRAWL_SAME_DOMAIN: true
CRAWL_MAX_PER_PAGE: 20
CRAWL_MAX_CONCURRENT: 5
CRAWL_DELAY_MS: 200
```

### Descripciones de configuración

| Variables | Predeterminado | Descripción |
|----------|---------|-------------|
| `EAGER_CRAWL`|` true`| Activar/desactivar el rastreo ansioso |
| `CRAWL_DEPTH`|`2`| ¿Cuántas capas de profundidad precargar?
| `CRAWL_SAME_DOMAIN`|` true`| Rastrear únicamente enlaces del mismo dominio |
| `CRAWL_MAX_PER_PAGE`|`20`| Enlaces máximos para precargar por página |
| `CRAWL_MAX_CONCURRENT`|`5`| Recuperaciones simultáneas máximas |
| `CRAWL_DELAY_MS`|`200`| Retraso entre solicitudes (límite de tarifa) |

### Cambiar configuración

```
export EAGER_CRAWL=false           # disable eager crawl
export CRAWL_DEPTH=3               # go 3 layers deep
export CRAWL_SAME_DOMAIN=false     # include external links
prefetch off                       # shortcut to disable
prefetch on --depth 3              # enable with depth 3
```---

## Cola de rastreo

Seguimiento`.websh/crawl-queue.md`:

```markdown

# websh crawl queue

## Rastreo activo

origin: https://news.ycombinator.com
started: 2026-01-24T10:30:00Z
depth: 2
same_domain: true

## En progreso

| Slug | URL | Depth | Status |
|------|-----|-------|--------|
| news-ycombinator-com-item-id-41234567 | https://news.ycombinator.com/item?id=41234567 | 1 | extracting |
| news-ycombinator-com-item-id-41234568 | https://news.ycombinator.com/item?id=41234568 | 1 | fetching |

## En cola

| URL | Depth | Priority |
|-----|-------|----------|
| https://news.ycombinator.com/item?id=41234569 | 1 | 2 |
| https://news.ycombinator.com/item?id=41234570 | 1 | 3 |
...

## Completado

| Slug | URL | Depth | Links Found |
|------|-----|-------|-------------|
| news-ycombinator-com | https://news.ycombinator.com | 0 | 30 |

## Omitido

| URL | Reason |
|-----|--------|
| https://external.com/article | external (same_domain=true) |
| https://news.ycombinator.com/login | already cached |
```---

## Algoritmo de prioridad

Los enlaces tienen prioridad para el rastreo:

1. **Posición en la página**: los enlaces que aparecen antes tienen mayor prioridad
2. **Mismo dominio**: enlaces internos antes que externos
3. **Señales de contenido**: enlaces en el contenido principal > navegación/pie de página
4. **Evita duplicados**: omite las URL que ya están almacenadas en caché
5. **Omitir lo que no sea contenido**: ignora el inicio de sesión, el cierre de sesión, la configuración, etc.

### Puntuación de enlaces

```python
def score_link(link, index, is_same_domain, in_main_content):
    score = 1000 - index  # Position: earlier = higher

    if is_same_domain:
        score += 500

    if in_main_content:
        score += 300

    # Penalize common non-content patterns
    skip_patterns = ['login', 'logout', 'signup', 'settings', 'account', '#']
    if any(p in link.href.lower() for p in skip_patterns):
        score -= 1000

    return score
```---

## El mensaje del agente de rastreo

Después de que la extracción de la página inicial complete el Paso 1, genere este agente:

```markdown

# websh Eager Crawl Agent

You are prefetching linked pages for websh to make navigation instant.

## Página de origen

URL: {url}
Slug: {slug}
Parsed file: {parsed_path}

## Configuración

depth: {depth}
same_domain: {same_domain}
max_per_page: {max_per_page}
max_concurrent: {max_concurrent}

## Tarea

1. Read the parsed markdown file to get the link list
2. Filter and prioritize links:
   - Skip already-cached URLs (check .websh/cache/index.md)
   - Skip external if same_domain=true
   - Skip login/logout/settings/account URLs
   - Take top {max_per_page} by priority (earlier position = higher)
3. For each link, spawn a fetch+extract task (like cd does)
4. Track progress in .websh/crawl-queue.md
5. If depth > 1, queue discovered links for next layer

## Limitación de tasa

- Max {max_concurrent} concurrent fetches
- {delay_ms}ms delay between spawning new tasks
- Be respectful of the origin server

## Patrón de spawn

For each URL to prefetch:

```pitón
Tarea (
    descripción=f"websh: captación previa {slug}",
    Prompt=FETCH_AND_EXTRACT_PROMPT, # Igual que los usos del CD
    subagent_type="propósito general",
    modelo="haiku",
    run_in_background=Verdadero
)

```


## Finalización

When all links at all depths are processed:
1. Update crawl-queue.md with final stats
2. Log completion: "Prefetch complete: {n} pages cached from {origin}"

## Manejo elegante

- If a fetch fails, log and continue with others
- If rate limited, back off and retry
- Never block on slow sites—move to next link
- User can cancel with `kill %crawl` or ` prefetch stop`
```

---

## Profundidad-2 Arrastrándose

Cuando la profundidad > 1, el rastreo continúa de forma recursiva:

```
Layer 0: cd https://news.ycombinator.com
         → extracts 30 links

Layer 1: prefetch top 20 links
         → each page extracts ~10-30 more links

Layer 2: prefetch top 20 links from each Layer 1 page
         → but skip duplicates across all layers
```

### Deduplicación

La cola de rastreo rastrea todas las URL vistas:

```markdown

## URLs vistas

(URLs already cached, in progress, or queued—don't crawl again)

- https://news.ycombinator.com
- https://news.ycombinator.com/item?id=41234567
- https://news.ycombinator.com/item?id=41234568
...
```Esto evita volver a rastrear la misma URL en diferentes profundidades.

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `prefetch`| Mostrar estado de rastreo actual |
| `prefetch on`| Habilitar rastreo ansioso |
| `prefetch off`| Desactivar rastreo ansioso |
| `prefetch <url>`| Precargar manualmente una URL específica |
| `prefetch --depth N`| Establecer profundidad de rastreo |
| `prefetch --stop`| Detener el rastreo actual |
| `crawl <url>`| Rastreo completo explícito de URL |
| `crawl --depth N`| Establecer profundidad para rastreo explícito |
| `queue`| Mostrar cola de rastreo |

### salida de estado de captación previa

```
Eager crawl: enabled
Depth: 2, Same domain: yes, Max per page: 20

Current crawl:
  Origin: https://news.ycombinator.com
  Progress: Layer 1 - 15/20 complete
  Queued: 42 URLs for Layer 2

Recent:
  [✓] news-ycombinator-com-item-id-41234567 (12 links)
  [✓] news-ycombinator-com-item-id-41234568 (8 links)
  [→] news-ycombinator-com-item-id-41234569 (fetching...)
```---

## Integración con cd

el `cd` El comando desencadena un rastreo ansioso después de que comienza la extracción:

```python
def cd(url):
    # ... existing cd logic (fetch + extract) ...

    # After spawning extract task, also spawn crawl if enabled
    if env.EAGER_CRAWL:
        # Wait briefly for Pass 1 to complete, then crawl
        Task(
            description=f"websh: eager crawl {slug}",
            prompt=EAGER_CRAWL_PROMPT.format(
                url=full_url,
                slug=slug,
                parsed_path=f".websh/cache/{slug}.parsed.md",
                depth=env.CRAWL_DEPTH,
                same_domain=env.CRAWL_SAME_DOMAIN,
                max_per_page=env.CRAWL_MAX_PER_PAGE,
                max_concurrent=env.CRAWL_MAX_CONCURRENT,
                delay_ms=env.CRAWL_DELAY_MS,
            ),
            subagent_type="general-purpose",
            model="haiku",
            run_in_background=True
        )
```El agente de rastreo espera a que los enlaces estén disponibles y luego comienza a buscar previamente.

---

## Consideraciones de rendimiento

### ¿Por qué gatear ansioso?

| Sin rastreo ansioso | Con rastreo ansioso |
|---------------------|------------------|
| `follow 3`→ esperar a buscar |` follow 3`→ instantáneo (en caché) |
| `back`→ podría ser necesario volver a buscar |` back`→ instantáneo (en caché) |
| Explorar se siente lento | Explorar se siente instantáneo |

### Costo/Beneficio

| Ventajas | Contras |
|------|------|
| La navegación se siente instantánea | Utiliza más ancho de banda |
| Contenido listo cuando sea necesario | Más espacio en disco para caché |
| Flujo de navegación natural | Puede recuperar páginas nunca visitadas |
| Funciona sin conexión para páginas almacenadas en caché | Uso de CPU en segundo plano |

### Cuándo desactivar

```
prefetch off
```Deshabilite el rastreo ansioso cuando:
- En conexión medida
- Rastreo de sitios grandes/lentos
- Espacio en disco limitado
- Solo visitar una página

---

## Sesión de ejemplo

```
~> cd https://news.ycombinator.com

news.ycombinator.com> (fetching...)

news.ycombinator.com> prefetch
Eager crawl: enabled
Current crawl:
  Origin: https://news.ycombinator.com
  Progress: Waiting for extraction...

news.ycombinator.com> ls | head 5
[0] Show HN: I built a tool for...
[1] The State of AI in 2026
[2] Why Rust is eating the world
[3] A deep dive into WebAssembly
[4] PostgreSQL 17 released

news.ycombinator.com> prefetch
Current crawl:
  Origin: https://news.ycombinator.com
  Progress: Layer 1 - 8/20 complete
  [✓] .../item?id=41234567
  [✓] .../item?id=41234568
  [→] .../item?id=41234569 (fetching...)
  ...

news.ycombinator.com> follow 1

news.ycombinator.com/item> (cached)    # Instant! Already prefetched.

news.ycombinator.com/item> cat .title
The State of AI in 2026

news.ycombinator.com/item> back

news.ycombinator.com> (cached)         # Also instant
```---

## robots.txt Respeto

Antes de rastrear, consulte robots.txt:

```python
def should_crawl(url, domain):
    robots = get_robots(domain)  # cached
    return robots.can_fetch("websh/1.0", url)
```Si no está permitido, omita la URL e inicie sesión:

```markdown

## Omitido

| URL | Reason |
|-----|--------|
| https://example.com/private | disallowed by robots.txt |
```---

## Cancelación

El usuario puede detener el rastreo en cualquier momento:

```
prefetch stop

# or
kill %crawl
```Esto cancela las recuperaciones pendientes pero mantiene el contenido ya almacenado en caché.