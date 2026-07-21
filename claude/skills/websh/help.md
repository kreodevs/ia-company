---
rol: documentación de usuario
resumen: |
  Ayuda orientada al usuario para websh. Inicio rápido, hoja de referencia de comandos completa, ejemplos.
---

# websh Ayuda

Un shell tipo Unix para la web. Navegue por URL como directorios, consulte páginas con comandos familiares.

## Inicio rápido

```
websh                                # start the shell
ls                                   # shows suggested sites
go hn                                # go to Hacker News (preset bookmark)
ls | head 5                          # first 5 links
grep "AI"                            # search for text
follow 1                             # click the 2nd link
cat .title                           # extract text by selector
back                                 # go back
```

## Marcadores iniciales

websh viene con marcadores para sitios públicos interesantes:

| Atajo | Sitio |
|----------|------|
| `go hn`| Noticias de piratas informáticos |
| `go lobsters`| Langostas |
| `go tildes`| Tildes |
| `go wiby`| Wiby (búsqueda independiente) |
| `go marginalia`| Marginalia (búsqueda independiente) |
| `go wiki`| Wikipedia |
| `go sourcehut`| Fuentehut |
| `go arena`| Are.na |

Añade el tuyo propio con`bookmark <name>`.

---

## Hoja de referencia de comandos

### Navegación

| Comando | Descripción |
|---------|-------------|
| `cd <url>`| Go to URL |
| `cd -`| Ir a la URL anterior |
| `cd ~`| Ir al inicio (borrar navegación) |
| `pwd`| Mostrar URL actual |
| `back`/` forward`| Navegar por el historial |
| `follow <n>`| Siga el enésimo enlace |
| `follow "text"`| Siga el enlace que contiene texto |
| `refresh`| Volver a buscar la página actual |
| `chroot <url>`| Restringir la navegación al prefijo de URL |

### Consulta y extracción

| Comando | Descripción |
|---------|-------------|
| `ls`| Listar todos los enlaces |
| `ls -l`| Lista con URL |
| `ls <selector>`| Lista de elementos que coinciden con el selector |
| `cat <selector>`| Extraer contenido de texto |
| `grep <pattern>`| Buscar/filtrar por patrón |
| `grep -i`| No distingue entre mayúsculas y minúsculas |
| `grep -v`| Invertir coincidencia |
| `stat`| Mostrar metadatos de la página |
| `source`| Ver HTML sin formato |
| `dom`| Mostrar árbol DOM |

### Captación previa

| Comando | Descripción |
|---------|-------------|
| `prefetch`| Mostrar estado de rastreo |
| `prefetch on/off`| Activar/desactivar el rastreo ansioso |
| `prefetch <url>`| Precargar manualmente una URL |
| `prefetch --depth <n>`| Establecer profundidad de captación previa |
| `crawl <url>`| Rastreo profundo explícito |
| `queue`| Mostrar cola de rastreo |

### Búsqueda y descubrimiento

| Comando | Descripción |
|---------|-------------|
| `find <pattern>`| Búsqueda/rastreo recursivo |
| `find -depth <n>`| Arrastre n niveles profundos |
| `locate <term>`| Buscar todas las páginas almacenadas en caché |
| `tree`| Mostrar estructura del sitio |
| `which <link>`| Resolver redirecciones |

### Procesamiento de texto

| Comando | Descripción |
|---------|-------------|
| `head <n>`| Primeros n artículos |
| `tail <n>`| Últimos n artículos |
| `sort`| Ordenar salida |
| `sort -r`| Clasificación inversa |
| `uniq`| Eliminar duplicados |
| `wc`| Contar líneas/palabras |
| `wc --links`| Contar enlaces |
| `cut -f <n>`| Extraer campo |
| `tr`| Transformar personajes |
| `sed 's/a/b/'`| Edición de secuencia |

### Comparación

| Comando | Descripción |
|---------|-------------|
| `diff <url1> <url2>`| Comparar dos páginas |
| `diff -t 1h`| Comparar con hace 1 hora |
| `diff --wayback <date>`| Comparar con la instantánea de Wayback |

### Monitoreo

| Comando | Descripción |
|---------|-------------|
| `watch <url>`| Monitorear cambios |
| `watch -n 30`| Encuesta cada 30 segundos |
| `watch --notify`| Notificación del sistema sobre cambios |
| `ping <url>`| Compruebe si el sitio está activo |
| `traceroute <url>`| Mostrar cadena de redireccionamiento |
| `time <cmd>`| Medir el tiempo de ejecución |

### Empleos y antecedentes

| Comando | Descripción |
|---------|-------------|
| `<cmd> &`| Ejecutar en segundo plano |
| `ps`| Mostrar tareas en ejecución |
| `jobs`| Listar trabajos en segundo plano |
| `fg %<n>`| Poner el trabajo en primer plano |
| `bg %<n>`| Continuar en segundo plano |
| `kill %<n>`| Cancelar trabajo |
| `wait`| Espere todos los trabajos |

### Medio ambiente y autenticación

| Comando | Descripción |
|---------|-------------|
| `env`| Mostrar entorno |
| `export VAR=val`| Establecer variable |
| `export HEADER_X=val`| Establecer encabezado de solicitud |
| `export COOKIE_x=val`| Establecer galleta |
| `unset VAR`| Eliminar variable |
| `whoami`| Mostrar identidad iniciada sesión |
| `login`| Inicio de sesión interactivo |
| `logout`| Borrar sesión |
| `su <profile>`| Cambiar perfil |

### Montaje

| Comando | Descripción |
|---------|-------------|
| `mount <api> <path>`| Montar API como directorio |
| `mount -t github ...`| Montar API de GitHub |
| `mount -t rss ...`| Montar canal RSS |
| `umount <path>`| Unmount |
| `df`| Mostrar montajes y uso de caché |
| `quota`| Mostrar límites de tarifas |

### Archivos e instantáneas

| Comando | Descripción |
|---------|-------------|
| `tar -c <file> <urls>`| Páginas de archivo |
| `tar -x <file>`| Extraer archivo |
| `snapshot`| Guardar versión con marca de tiempo |
| `snapshot -l`| Lista de instantáneas |
| `wayback <url>`| Lista de instantáneas de Wayback |
| `wayback <url> <date>`| Obtener de Wayback |

### Metadatos del sitio

| Comando | Descripción |
|---------|-------------|
| `robots`| Mostrar robots.txt |
| `sitemap`| Mostrar mapa del sitio.xml |
| `headers`| Mostrar encabezados HTTP |
| `cookies`| Gestionar cookies |

### Interacción

| Comando | Descripción |
|---------|-------------|
| `click <selector>`| Haga clic en elemento |
| `submit <form>`| Enviar formulario |
| `type <sel> "text"`| Llenar entrada |
| `scroll`| Activar desplazamiento infinito |
| `screenshot <file>`| Capturar página |

### Programación

| Comando | Descripción |
|---------|-------------|
| `cron "<sched>" <cmd>`| Horario recurrente |
| `at "<time>" <cmd>`| Agendar una sola vez |
| `cron -l`| Lista programada |

### Alias y atajos

| Comando | Descripción |
|---------|-------------|
| `alias name='cmd'`| Crear alias |
| `alias`| Listar alias |
| `unalias name`| Eliminar alias |
| `ln -s <url> <name>`| Crear acceso directo a URL |

### Estado e Historia

| Comando | Descripción |
|---------|-------------|
| `history`| Mostrar historial de comandos |
| `!!`| Repita el último comando |
| `!<n>`| Repetir comando n |
| `bookmark <name>`| Guardar URL actual |
| `bookmarks`| Lista de favoritos |
| `go <name>`| Ir al marcador |

### Operaciones de archivos

| Comando | Descripción |
|---------|-------------|
| `save <path>`| Guardar página en archivo |
| `save --parsed`| Guardar descuento extraído |
| `tee <file>`| Guardar mientras se muestra |
| `xargs <cmd>`| Construya comandos desde la entrada |
| `parallel`| Ejecutar en paralelo |

---

## Tuberías y redirección

```
ls | grep "AI" | head 5              # pipe commands
ls > links.txt                       # write to file
ls >> links.txt                      # append to file
ls | tee links.txt                   # save and display
cd $(wayback https://x.com 2020)     # command substitution
```---

## Selectores

Los selectores CSS funcionan con`ls`,` cat`,` click`:

```
cat .article          # class
cat #main             # id
cat article           # tag
cat .post .title      # descendant
cat h1:first          # first match
ls nav a              # links in nav
click button.submit   # button with class
```---

## Ejemplos

### Explorar noticias sobre piratas informáticos

```
cd https://news.ycombinator.com
ls | head 10                         # top 10 stories
grep "Show HN"                       # filter
follow "Show HN"                     # go to first match
cat .comment | head 20               # read comments
back
```

### Investigar un tema

```
cd https://en.wikipedia.org/wiki/Unix
cat #mw-content-text | head 50       # intro
ls #toc                              # table of contents
follow "History"
bookmark unix-history
```

### Monitorear una página

```
watch https://status.example.com -n 30 --notify

# Polls every 30s, notifies on change
```

### Montar API de GitHub

```
mount https://api.github.com /gh
cd /gh/users/torvalds
cat bio
cd /gh/repos/torvalds/linux
ls issues | head 10
```

### Comparar página a lo largo del tiempo

```
cd https://example.com
snapshot "before"

# ... wait ...
refresh
diff --snapshot "before"
```

### Recuperación por lotes

```
parallel cd ::: https://a.com https://b.com https://c.com
locate "error" | head 10
```

### Buscar en páginas almacenadas en caché

```
locate "authentication"

# Searches all cached pages instantly

locate -i "OAuth" --urls

# Case-insensitive, show URLs
```

### Precarga para navegación instantánea

```
cd https://news.ycombinator.com

# Automatically prefetches visible links in background

prefetch

# Check prefetch progress

follow 3

# Instant! Already cached.

prefetch off

# Disable for slow connections
```

### Investigación de archivos

```
cd https://paper1.com &
cd https://paper2.com &
cd https://paper3.com &
wait
tar -cz research.tar.gz https://paper1.com https://paper2.com https://paper3.com
```

### Establecer encabezados de autenticación

```
export HEADER_Authorization="Bearer mytoken"
cd https://api.example.com/protected
cat .
```

### Monitoreo de horarios

```
cron "0 * * * *" 'cd https://news.com && ls | head 5 >> hourly.txt'
cron "0 9 * * *" 'snapshot "daily"'
```---

## Cómo funciona

cuando tu `cd` a una URL:

1. **Fetch**: descarga el HTML
2. **Caché**: se guarda en `.websh/cache/`3. **Extracto**: el agente de haiku en segundo plano se analiza en rebajas enriquecidas

Comandos como `ls`,` grep`,` cat`trabaje con contenido almacenado en caché: al instante, sin necesidad de volver a buscarlo.

Las API montadas funcionan de manera similar: las respuestas de API se almacenan en caché y son navegables.

---

## Archivos

```
.websh/
├── session.md      # current session
├── cache/          # cached pages (HTML + parsed markdown)
├── history.md      # command history
├── bookmarks.md    # saved URLs
├── profiles/       # auth profiles
└── snapshots/      # saved versions
```---

## Lenguaje Natural

websh entiende la intención, no sólo los comandos. Todos estos funcionan:

```
links                    → ls
open https://example.com → cd https://example.com
search "AI"              → grep "AI"
what's on this page?     → ls + stat
show me the title        → cat title
go back                  → back
how many links?          → wc --links
download this            → save
```Sólo di lo que quieras. websh lo resolverá.

---

## Consejos

- **Navegación instantánea**: los enlaces se obtienen automáticamente— `follow` suele ser instantáneo
- **Usar índices**: `ls` enlaces de números,`follow 3` hace clic en el 4to
- **Tubería todo**: `ls | grep "foo" | head 5 | tee results.txt`- **Tareas largas en segundo plano**:` cd https://slow-site.com &`- **Busca en tu caché**:` locate`busca todas las páginas almacenadas en caché al instante
- **Montar API**: `mount` hace que las API REST sean navegables como directorios
- **Comparar a lo largo del tiempo**: `snapshot`+` diff --snapshot`- **Controles de horarios**:` cron`para recurrente,` at`por una sola vez
- **Control de captación previa**: `prefetch off` para conexiones lentas,`prefetch` para comprobar el progreso

---

## Limitaciones

- **Sitios de JavaScript**: algunos contenidos requieren JS para renderizarse
- **Autenticación**: `login` es el mejor esfuerzo, es posible que necesite cookies manuales
- **Límites de tarifas**: Respete los límites del sitio, use `quota` comprobar
- **Interacción**:`click`,` submit`limitado sin navegador completo

---

## Obtener ayuda

```
help                 # this help
help <command>       # specific command help
man <command>        # detailed manual
```