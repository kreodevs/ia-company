---
rol: comando-referencia
resumen: |
  Referencia completa para todos los comandos websh. Navegación, consulta, gestión de procesos,
  monitoreo, entorno, montaje y más, tratando la web como un sistema de archivos Unix.
ver también:
  - shell.md: semántica de Shell y modelo de ejecución
  - state/cache.md: cómo se estructura el caché
---

# referencia del comando websh

## Comandos de navegación

### `cd <url>` Navegue a una URL. Recupera la página, la almacena en caché y genera una extracción asíncrona.

**Sintaxis:**

```
cd <url>
cd <relative-path>
cd -                 # go to previous location
cd ~                 # go to home/start (clears navigation)
```**Ejemplos:**

```
cd https://news.ycombinator.com
cd https://x.com/deepfates
cd /item?id=12345          # relative to current domain
cd ..                       # up one path level
cd -                        # back to previous URL
```**Salida:** Confirmación de navegación, estado de extracción

---

### `pwd` Imprime la URL actual.

**Sintaxis:**

```
pwd
pwd -P               # show full resolved URL (no aliases)
```**Salida:** URL actual completa o`(no page loaded)`---

### `back` Vuelve a la URL anterior en el historial de navegación.

**Sintaxis:**

```
back
back <n>             # go back n steps
```**Comportamiento:** Utiliza contenido almacenado en caché, no se puede recuperar.

---

### `forward` Avanzar en el historial de navegación (después de usar`back`).

**Syntax:**

```
forward
forward <n>
```---

### `follow <target>` Navegue a un enlace en la página actual.

**Sintaxis:**

```
follow <index>       # by number from ls output
follow "<text>"      # by link text (partial match)
follow -n            # follow without adding to history
```**Ejemplos:**

```
follow 3                    # follow the 4th link (0-indexed)
follow "State of AI"        # follow link containing this text
```---

### `refresh` Vuelva a buscar la URL actual, actualizando el caché.

**Sintaxis:**

```
refresh
refresh --hard       # clear extraction, start fresh
```---

### `chroot <url>` Restrinja la navegación a un subdominio o prefijo de ruta.

**Sintaxis:**

```
chroot <url>         # set root boundary
chroot               # show current chroot
chroot /             # clear chroot
```**Example:**

```
chroot https://docs.python.org/3/
cd tutorial          # OK: within chroot
cd https://google.com # error: outside chroot
```---

## Comandos de consulta

### `ls [selector]` Listar enlaces o elementos en la página actual.

**Sintaxis:**

```
ls                   # list all links
ls <selector>        # list elements matching CSS selector
ls -l                # long format with hrefs
ls -a                # include hidden/navigation links
ls -t                # sort by position in page
ls -S                # sort by text length
```**Salida:**

```
[0] First link text
[1] Second link text
```With`-l`:

```
[0] First link text → /path/to/page
[1] Second link text → https://external.com/
```**Entubable:** Sí

---

### `cat <selector>` Extraiga contenido de texto de elementos.

**Sintaxis:**

```
cat <selector>
cat .                # entire page text
cat -n               # with line numbers
cat -A               # show all (including hidden elements)
```**Ejemplos:**

```
cat .title
cat article
cat .comment | head 3
cat -n .code-block
```**Entubable:** Sí

---

### `grep <pattern>` Filtrar contenido por patrón de texto (compatible con expresiones regulares).

**Sintaxis:**

```
grep <pattern>
grep -i <pattern>    # case-insensitive
grep -v <pattern>    # invert match
grep -c <pattern>    # count matches
grep -n <pattern>    # show line numbers
grep -o <pattern>    # only matching part
grep -A <n>          # n lines after match
grep -B <n>          # n lines before match
grep -C <n>          # n lines context (before and after)
grep -E <pattern>    # extended regex
grep -l              # list pages with matches (for locate/find)
```**Pipeable:** Sí (filtra el flujo de entrada o la página de búsquedas)

---

### `stat` Mostrar metadatos sobre la página actual.

**Sintaxis:**

```
stat
stat -v              # verbose (all metadata)
```**Salida:**

```
URL:       https://news.ycombinator.com
Title:     Hacker News
Fetched:   2026-01-24T10:30:00Z
Extracted: 3 passes, complete
Links:     30
Forms:     2
Images:    0
Size:      45 KB (html), 12 KB (parsed)
```---

### `head <n>`/` tail <n>`Tome los primeros o últimos n elementos de una secuencia.

**Sintaxis:**

```
head <n>
head -n <n>          # same as head <n>
tail <n>
tail -f              # follow (for watch/stream)
```**Entubable:** Sí (debe ser en tubería o con lima)

---

### `sort` Ordenar líneas de salida.

**Sintaxis:**

```
sort                 # alphabetical
sort -n              # numeric
sort -r              # reverse
sort -u              # unique (remove duplicates)
sort -k <n>          # sort by nth field
sort -t <delim>      # field delimiter
```**Entubable:** Sí

---

### `uniq` Eliminar líneas duplicadas.

**Sintaxis:**

```
uniq
uniq -c              # prefix with count
uniq -d              # only show duplicates
uniq -u              # only show unique
```**Entubable:** Sí

---

### `wc` Cuente palabras, líneas, caracteres.

**Sintaxis:**

```
wc                   # all counts
wc -l                # lines only
wc -w                # words only
wc -c                # characters only
wc -L                # longest line length
```**Específico de la web:**

```
wc --links           # count links
wc --images          # count images
wc --forms           # count forms
wc --headings        # count headings
```**Entubable:** Sí

---

### `cut` Extraiga columnas/campos de la salida.

**Sintaxis:**

```
cut -f <n>           # field n (1-indexed)
cut -f <n,m>         # fields n and m
cut -d <delim>       # delimiter (default: tab)
cut -c <range>       # character positions
```**Example:**

```
ls -l | cut -f 1     # just link text, no URLs
```**Entubable:** Sí

---

### `tr` Traducir/transformar caracteres.

**Sintaxis:**

```
tr <set1> <set2>     # replace set1 chars with set2
tr -d <set>          # delete characters
tr -s <set>          # squeeze repeated chars
tr '[:upper:]' '[:lower:]'  # lowercase
```**Entubable:** Sí

---

### `sed` Editor de transmisiones para transformaciones.

**Sintaxis:**

```
sed 's/old/new/'     # replace first occurrence
sed 's/old/new/g'    # replace all
sed -n '5,10p'       # print lines 5-10
sed '/pattern/d'     # delete matching lines
```**Entubable:** Sí

---

### `source` Ver fuente HTML sin formato.

**Sintaxis:**

```
source               # full HTML
source | head 50     # first 50 lines
source -l            # with line numbers
```---

### `dom` Mostrar la estructura del árbol DOM.

**Sintaxis:**

```
dom                  # full tree
dom <selector>       # subtree from selector
dom -d <n>           # depth limit
dom --tags           # tag names only
```**Salida:**

```
html
├── head
│   ├── title
│   ├── meta
│   └── link
└── body
    ├── header
    │   └── nav
    ├── main
    │   ├── article
    │   └── aside
    └── footer
```---

## Precarga y rastreo

### `prefetch` Controle el rastreo de enlaces ansiosos. De forma predeterminada, websh busca automáticamente enlaces visibles de 1 a 2 capas en el fondo después de navegar a una página.

**Sintaxis:**

```
prefetch                     # show status
prefetch on                  # enable eager crawl
prefetch off                 # disable eager crawl
prefetch <url>               # manually prefetch a URL
prefetch --depth <n>         # set crawl depth (default: 2)
prefetch --stop              # stop current crawl
```**Ejemplos:**

```
prefetch                     # check crawl progress
prefetch off                 # disable for slow connections
prefetch https://example.com # manually queue URL
```**Salida de estado:**

```
Eager crawl: enabled
Depth: 2, Same domain: yes, Max per page: 20

Current crawl:
  Origin: https://news.ycombinator.com
  Progress: Layer 1 - 15/20 complete
  Queued: 42 URLs for Layer 2
```---

### `crawl` Rastree explícitamente una URL hasta una profundidad específica.

**Sintaxis:**

```
crawl <url>                  # crawl from URL
crawl --depth <n>            # depth (default: 2)
crawl --all                  # include external links
crawl --follow <pattern>     # only follow matching URLs
crawl --max <n>              # max pages to fetch
```**Ejemplos:**

```
crawl https://docs.example.com --depth 3
crawl https://api.example.com --follow "/docs/*"
crawl https://blog.com --max 50
```**Diferencia con respecto a la captación previa:**
- `prefetch` es automático y se ejecuta en segundo plano después`cd`-` crawl`es manual y puede profundizar / ampliar

---

### `queue` Muestra la cola de rastreo.

**Sintaxis:**

```
queue                        # show queue status
queue -l                     # long format with all URLs
queue --clear                # clear pending queue
```**Salida:**

```
In progress: 3
  [→] https://hn.com/item?id=123 (extracting)
  [→] https://hn.com/item?id=124 (fetching)
  [→] https://hn.com/item?id=125 (fetching)

Queued: 17
  [0] https://hn.com/item?id=126 (depth 1)
  [1] https://hn.com/item?id=127 (depth 1)
  ...

Completed: 12
Skipped: 5 (external/cached)
```---

## Búsqueda y descubrimiento

### `find <pattern>` Buscar/rastrear recursivamente desde la página actual.

**Sintaxis:**

```
find <text-pattern>              # search page content
find -name "<pattern>"           # search link text
find -href "<pattern>"           # search URLs
find -selector "<css>"           # find elements
find -depth <n>                  # crawl n levels deep
find -maxpages <n>               # limit pages to crawl
find -type <t>                   # filter: link, image, form, heading
find -follow                     # actually fetch found pages
```**Ejemplos:**

```
find "API documentation"                    # find text across linked pages
find -name "*.pdf" -depth 2                # find PDF links, 2 levels deep
find -selector "form" -depth 1             # find all forms on this + linked pages
find -href "/api/" -follow                 # crawl all /api/ pages
```**Salida:** Lista de coincidencias con la página fuente

---

### `locate <term>` Búsqueda instantánea en TODAS las páginas almacenadas en caché.

**Sintaxis:**

```
locate <pattern>
locate -i <pattern>  # case-insensitive
locate -r <regex>    # regex mode
locate --urls        # search URLs only
locate --titles      # search titles only
```**Example:**

```
locate "authentication"    # find in all cached content
locate -i "OAuth"          # case-insensitive
```**Salida:**

```
news-ycombinator-com: [3 matches]
  - "OAuth authentication flow..."
  - "...using authentication tokens..."
techcrunch-com-article: [1 match]
  - "...new authentication method..."
```---

### `tree` Mostrar la estructura del sitio.

**Sintaxis:**

```
tree                 # from current page
tree -d <n>          # depth limit
tree -L <n>          # same as -d
tree --sitemap       # use sitemap.xml if available
tree --infer         # infer from links
tree -P <pattern>    # only matching paths
```**Salida:**

```
https://example.com/
├── /about
├── /products
│   ├── /products/widget
│   └── /products/gadget
├── /blog
│   ├── /blog/post-1
│   └── /blog/post-2
└── /contact
```---

### `which <link>` Resuelva dónde va realmente un enlace (siga las redirecciones).

**Sintaxis:**

```
which <url>
which <index>        # from ls output
which -a             # show all redirects in chain
```**Salida:**

```
https://bit.ly/xyz → https://example.com/actual-page
```With`-a`:

```
https://bit.ly/xyz
  → https://example.com/redirect
  → https://example.com/actual-page (200 OK)
```---

## Comparación y diferenciación

### `diff` Compara páginas o versiones.

**Sintaxis:**

```
diff <url1> <url2>           # compare two URLs
diff <url>                   # compare current vs URL
diff -c                      # context format
diff -u                      # unified format
diff --side-by-side          # side by side
diff --links                 # compare only links
diff --text                  # compare only text content
```**Basado en el tiempo:**

```
diff -t <duration>           # compare to cached version from <duration> ago
diff --wayback <date>        # compare to Wayback Machine snapshot
```**Ejemplos:**

```
diff https://a.com https://b.com
diff -t 1h                   # compare to 1 hour ago
diff --wayback 2024-01-01    # compare to Wayback snapshot
```---

### `patch` Aplicar cambios (para API con acceso de escritura).

**Sintaxis:**

```
patch <file>         # apply diff file
```*Nota: Requiere API montada con permisos de escritura.*

---

## Monitoreo

### `watch` Supervise la URL para detectar cambios.

**Sintaxis:**

```
watch <url>                  # poll every 60s
watch -n <seconds>           # custom interval
watch -d                     # highlight differences
watch --notify               # system notification on change
watch --exec <cmd>           # run command on change
watch --selector <css>       # only watch specific element
```**Ejemplos:**

```
watch https://status.example.com -n 30
watch -d --selector ".price"
watch --notify --exec "echo 'Changed!'"
```**Salida:** Muestra el contenido, las actualizaciones implementadas y resalta los cambios.

---

### `tail -f <url>` Transmita contenido en vivo (para SSE, websocket o encuestas).

**Sintaxis:**

```
tail -f <url>                # stream updates
tail -f --sse                # Server-Sent Events
tail -f --ws                 # WebSocket
tail -f --poll <n>           # poll every n seconds
```---

### `ping` Compruebe si el sitio está activo.

**Sintaxis:**

```
ping <url>
ping -c <n>          # count of pings
ping -i <seconds>    # interval
```**Salida:**

```
PING https://example.com
200 OK - 145ms
200 OK - 132ms
200 OK - 156ms
--- 3 requests, avg 144ms ---
```---

### `traceroute` Mostrar cadena de redireccionamiento.

**Sintaxis:**

```
traceroute <url>
```**Salida:**

```
1. https://short.link/abc (301)
2. https://example.com/redirect (302)
3. https://example.com/final (200)
```---

### `time` Medir el tiempo de ejecución del comando.

**Sintaxis:**

```
time <command>
```**Salida:**

```
[command output]

real    0.45s
fetch   0.32s
extract 0.13s
```---

## Gestión de procesos y trabajos

### `ps` Mostrar tareas en segundo plano en ejecución.

**Sintaxis:**

```
ps                   # list all tasks
ps -l                # long format
ps -a                # all (including completed)
```**Salida:**

```
PID   STATUS      URL/TASK
1     extracting  news-ycombinator-com
2     fetching    x-com-deepfates
3     watching    status.example.com
```---

### `jobs` Listar trabajos en segundo plano.

**Sintaxis:**

```
jobs
jobs -l              # with PIDs
jobs -r              # running only
jobs -s              # stopped only
```**Salida:**

```
[1]  + running     cd https://example.com &
[2]  - extracting  follow 3 &
[3]    watching    watch https://status.com
```---

### `kill` Cancelar una tarea en segundo plano.

**Sintaxis:**

```
kill <pid>
kill %<job-number>
kill -9 <pid>        # force kill
killall watch        # kill all watch processes
```---

### `wait` Espere a que se complete la tarea en segundo plano.

**Sintaxis:**

```
wait                 # wait for all
wait <pid>           # wait for specific
wait %<job>          # wait for job number
```---

### `bg`/` fg`Mueva los trabajos al fondo/primer plano.

**Sintaxis:**

```
bg %<job>            # continue job in background
fg %<job>            # bring job to foreground
```---

### `&`(operador en segundo plano)

Ejecute el comando en segundo plano.

**Sintaxis:**

```
cd https://example.com &
watch https://status.com &
```---

### `nohup` Ejecute el comando inmune a los bloqueos.

**Sintaxis:**

```
nohup watch https://example.com &
```---

## Medio ambiente y autenticación

### `env` Mostrar el entorno actual (encabezados, cookies, configuración).

**Sintaxis:**

```
env                  # all variables
env | grep COOKIE    # filter
```**Salida:**

```
USER_AGENT=websh/1.0
ACCEPT=text/html
COOKIE_session=abc123
HEADER_Authorization=Bearer xyz
TIMEOUT=30
RATE_LIMIT=10/min
```---

### `export` Establecer variables de entorno (encabezados, cookies).

**Sintaxis:**

```
export VAR=value
export HEADER_X-Custom=value
export COOKIE_session=abc123
export USER_AGENT="Custom Agent"
export TIMEOUT=60
```**Ejemplos:**

```
export HEADER_Authorization="Bearer mytoken"
export COOKIE_session="abc123"
export USER_AGENT="Mozilla/5.0..."
```**Configuración de rastreo:**

```
export EAGER_CRAWL=true              # enable/disable prefetching
export CRAWL_DEPTH=2                 # layers deep to prefetch
export CRAWL_SAME_DOMAIN=true        # only prefetch same-domain links
export CRAWL_MAX_PER_PAGE=20         # max links per page
export CRAWL_MAX_CONCURRENT=5        # parallel fetches
export CRAWL_DELAY_MS=200            # rate limit delay
```---

### `unset` Eliminar la variable de entorno.

**Sintaxis:**

```
unset VAR
unset HEADER_Authorization
unset COOKIE_session
```---

### `whoami` Mostrar la identidad de inicio de sesión (si es detectable).

**Sintaxis:**

```
whoami
whoami -v            # verbose (show how detected)
```**Salida:**

```
@deepfates (detected from: meta tag, cookie)
```Or:

```
(not logged in)
```---

### `login` Flujo de inicio de sesión interactivo.

**Sintaxis:**

```
login                        # login to current site
login <url>                  # login to specific site
login --form <selector>      # specify login form
login -u <user> -p <pass>    # provide credentials
login --cookie <file>        # import cookies from file
login --browser              # import from browser
```**Flujo:**
1. Detectar formulario de inicio de sesión
2. Solicitar credenciales (o uso proporcionado)
3. Enviar formulario
4. Almacenar cookies de sesión

---

### `logout` Borrar sesión para el sitio actual.

**Sintaxis:**

```
logout               # current site
logout <domain>      # specific domain
logout --all         # all sessions
```---

### `su` Cambiar de usuario/perfil.

**Sintaxis:**

```
su <profile>         # switch to profile
su -                 # switch to default
su -l <profile>      # login as profile (fresh session)
```Los perfiles almacenan cookies, encabezados e identidades independientes.

---

## Montaje y sistemas de archivos virtuales

### `mount` Monte una API o servicio como un directorio navegable.

**Sintaxis:**

```
mount <source> <mountpoint>
mount -t <type> <source> <mountpoint>
```**Types:**
- `rest`— REST API
- `github`—API de GitHub
- `rss`— Fuente RSS/Atom
- `json`— Punto final JSON

**Ejemplos:**

```
mount https://api.github.com /gh
mount -t github octocat/Hello-World /repo
mount -t rss https://example.com/feed.xml /feed
mount -t rest https://api.example.com /api
```**Después del montaje:**

```
cd /gh/users/octocat
ls                           # list user properties
cat repos                    # fetch repos
cd /gh/repos/octocat/Hello-World
ls issues
cat issues/1
```---

### `umount` Desmontar una ruta montada.

**Sintaxis:**

```
umount <mountpoint>
umount -a            # unmount all
```---

### `df` Muestra los sistemas de archivos montados y el uso de caché.

**Sintaxis:**

```
df
df -h                # human readable sizes
```**Salida:**

```
Mount           Type    Size    Used    Quota
/               web     -       12MB    -
/gh             github  -       45KB    5000 req/hr (4892 left)
/api            rest    -       2KB     100 req/min (98 left)

Cache: 156 pages, 45MB
```---

### `quota` Mostrar estado del límite de tarifa.

**Sintaxis:**

```
quota
quota <domain>
```**Salida:**

```
api.github.com: 4892/5000 requests remaining (resets in 45min)
api.twitter.com: 98/100 requests remaining (resets in 12min)
```---

## Archivos e instantáneas

### `tar` Archive varias páginas.

**Sintaxis:**

```
tar -c <file> <urls...>      # create archive
tar -c site.tar https://example.com/*   # glob
tar -x <file>                # extract (restore to cache)
tar -t <file>                # list contents
tar -z                       # compress (gzip)
```**Ejemplos:**

```
tar -cz research.tar.gz https://paper1.com https://paper2.com
tar -t research.tar.gz
tar -x research.tar.gz       # restore to cache
```---

### `snapshot` Guarde la versión con marca de tiempo de la página actual.

**Sintaxis:**

```
snapshot                     # save with auto timestamp
snapshot <name>              # save with name
snapshot -l                  # list snapshots
snapshot -r <name>           # restore snapshot
```**Example:**

```
snapshot "before-update"

# ... time passes ...
diff --snapshot "before-update"
```---

### `wayback` Interactuar con Wayback Machine.

**Sintaxis:**

```
wayback <url>                # list available snapshots
wayback <url> <date>         # fetch specific snapshot
wayback --save <url>         # request Wayback to archive
```**Ejemplos:**

```
wayback https://example.com
wayback https://example.com 2023-06-15
cd $(wayback https://example.com 2020-01-01)
```---

## Metadatos del sitio

### `robots` Mostrar robots.txt.

**Sintaxis:**

```
robots
robots <url>
```---

### `sitemap` Mostrar/analizar sitemap.xml.

**Sintaxis:**

```
sitemap
sitemap <url>
sitemap --urls       # just list URLs
sitemap --tree       # as tree structure
```---

### `headers` Mostrar encabezados de respuesta HTTP.

**Sintaxis:**

```
headers              # current page
headers <url>        # fetch headers only (HEAD request)
headers -v           # verbose (request + response)
```---

### `cookies` Gestionar cookies.

**Sintaxis:**

```
cookies              # list for current domain
cookies <domain>     # list for specific domain
cookies -a           # all domains
cookies --set <name>=<value>
cookies --delete <name>
cookies --clear      # clear all for domain
cookies --export <file>
cookies --import <file>
```---

## Interacción

### `click` Simular clic en elemento.

**Sintaxis:**

```
click <selector>
click <index>        # from ls output
click --js           # execute onclick handlers
```*Nota: Limitado sin navegador completo. Mejor esfuerzo.*

---

### `submit` Envíe un formulario.

**Sintaxis:**

```
submit <form-selector>
submit -d "field=value&field2=value2"
submit --json '{"field": "value"}'
```**Interactivo:**

```
submit               # if only one form, prompts for fields
```---

### `type` Complete el campo de entrada.

**Sintaxis:**

```
type <selector> "text"
type --clear <selector>      # clear first
```---

### `scroll` Activar desplazamiento/paginación.

**Sintaxis:**

```
scroll               # scroll down (trigger infinite scroll)
scroll --bottom      # scroll to bottom
scroll --page <n>    # go to page n
scroll --next        # next page
```*Nota: Limitado sin navegador completo.*

---

### `screenshot` Capture una instantánea visual (requiere herramientas del navegador).

**Sintaxis:**

```
screenshot <file>
screenshot --full    # full page
screenshot --selector <css>  # specific element
```---

## Programación

### `cron` Programe comandos recurrentes.

**Sintaxis:**

```
cron "<schedule>" <command>
cron -l              # list scheduled jobs
cron -r <id>         # remove job
```**Ejemplos:**

```
cron "0 * * * *" 'watch https://status.com --notify'
cron "0 9 * * *" 'cd https://news.com && ls | head 5 > daily.txt'
```---

### `at` Programe un comando único.

**Sintaxis:**

```
at <time> <command>
at -l                # list pending
at -r <id>           # remove
```**Ejemplos:**

```
at "10:00" 'refresh'
at "+1h" 'snapshot "hourly"'
at "2024-12-25 00:00" 'cd https://xmas.com'
```---

## Alias y scripts

### `alias` Crear acceso directo de comando.

**Sintaxis:**

```
alias <name>='<command>'
alias                # list all
alias <name>         # show specific
unalias <name>       # remove
```**Ejemplos:**

```
alias hn='cd https://news.ycombinator.com'
alias top5='ls | head 5'
alias search='grep -i'
```---

### `ln -s` Cree un alias/enlace simbólico de URL.

**Sintaxis:**

```
ln -s <url> <name>
```**Example:**

```
ln -s https://news.ycombinator.com hn
cd hn                # works like cd https://news.ycombinator.com
```---

## Comandos estatales

### `history` Mostrar historial de comandos.

**Sintaxis:**

```
history
history <n>          # last n commands
history -c           # clear history
history | grep <pattern>
!<n>                 # execute command n from history
!!                   # repeat last command
```---

### `bookmark [name]` Guarde la URL como marcador.

**Sintaxis:**

```
bookmark              # auto-name from domain
bookmark <name>
bookmark -d <name>    # delete
bookmark -l           # list (same as bookmarks)
```---

### `bookmarks` Enumere todos los marcadores.

**Sintaxis:**

```
bookmarks
bookmarks | grep <pattern>
```---

### `go <bookmark>` Navegue hasta el marcador.

**Sintaxis:**

```
go <name>
```---

## Comandos de archivo

### `save` Guarde la página en un archivo local.

**Sintaxis:**

```
save <path>                  # save HTML
save <path> --parsed         # save extracted markdown
save <path> --complete       # save with assets
```---

### `tee` Guarde la salida mientras la muestra.

**Sintaxis:**

```
<command> | tee <file>
<command> | tee -a <file>    # append
```**Example:**

```
ls | grep "AI" | tee ai-links.txt
```---

### `xargs` Cree y ejecute comandos desde la entrada.

**Sintaxis:**

```
<command> | xargs <cmd>
<command> | xargs -I {} <cmd> {}
<command> | xargs -P <n>     # parallel
```**Ejemplos:**

```
cat urls.txt | xargs -I {} cd {}
ls | head 5 | xargs -P 5 follow    # fetch first 5 in parallel
```---

### `parallel` Ejecute comandos en paralelo.

**Sintaxis:**

```
parallel <cmd> ::: <args...>
parallel -j <n>              # n jobs
```**Example:**

```
parallel cd ::: https://a.com https://b.com https://c.com
```---

## Ayuda y documentación

### `help` Mostrar ayuda.

**Sintaxis:**

```
help                 # general help
help <command>       # command-specific
```---

### `man` Manual detallado (o buscar documentos API del sitio).

**Sintaxis:**

```
man <command>        # websh command manual
man <domain>         # try to fetch API docs for domain
```---

## Sintaxis especial

### Tuberías

Los comandos se pueden encadenar:

```
ls | grep "AI" | head 3 | tee results.txt
```

### Antecedentes

anexar `&` para ejecutar en segundo plano:

```
cd https://slow-site.com &
```

### Sustitución de comando

uso `$()` para sustituir la salida del comando:

```
cd $(wayback https://example.com 2020-01-01)
diff $(locate "config" | head 1) $(locate "config" | tail 1)
```

### Patrones globales (para páginas almacenadas en caché)

```
locate "error" --in "api-*"      # search pages matching api-*
tar -c backup.tar news-*         # archive all news pages
```

### Selectores

Selectores CSS en comandos:

```
cat .article-body
ls nav a
cat h1:first
click button.submit
```---

## Mensajes de error

| Error | Significado |
|-------|---------|
| `error: no page loaded`| Run` cd <url>`first |
| `error: selector not found`| Ningún elemento coincide |
| `error: fetch failed`| Error de red |
| `error: rate limited`| Demasiadas solicitudes |
| `error: outside chroot`| URL fuera del límite de chroot |
| `error: mount failed`| No se pudo montar la API |
| `error: permission denied`| Se requiere autenticación |
| `error: job not found`| PID/número de trabajo no válido |