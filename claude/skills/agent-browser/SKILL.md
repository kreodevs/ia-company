---
name: agent-browser
description: CLI de automatización de navegador para AI agents. Usar cuando el usuario necesite interactuar con sitios web, incluyendo navegar páginas, rellenar formularios, hacer clic en botones, capturar screenshots, extraer datos, probar web apps o automatizar cualquier tarea de navegador. Se activa con solicitudes como "abrir un sitio web", "rellenar un formulario", "hacer clic en un botón", "tomar screenshot", "extraer datos de una página", "probar esta web app", "iniciar sesión en un sitio", "automatizar acciones del navegador", o cualquier tarea que requiera interacción web programática.
allowed-tools: Bash(agent-browser:*)
---

# Automatización de navegador con agent-browser

## Flujo de trabajo core

Toda automatización de navegador sigue este patrón:

1. **Navegar**: `agent-browser open <url>`2. **Instantánea**:` agent-browser snapshot -i`(obtener refs de elementos como`@e1`,`@e2`)
3. **Interactuar**: Usar refs para click, fill, select
4. **Re-snapshot**: Tras navegación o cambios en el DOM, obtener refs frescos

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i

# Salida: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Submit"

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # Check result
```

## Comandos esenciales

```bash

# Navigation
agent-browser open <url>              # Navigate (aliases: goto, navigate)
agent-browser close                   # Close browser

# Snapshot
agent-browser snapshot -i             # Interactive elements with refs (recommended)
agent-browser snapshot -i -C          # Include cursor-interactive elements (divs with onclick, cursor:pointer)
agent-browser snapshot -s "#selector" # Scope to CSS selector

# Interaction (use @refs from snapshot)
agent-browser click @e1               # Click element
agent-browser fill @e2 "text"         # Clear and type text
agent-browser type @e2 "text"         # Type without clearing
agent-browser select @e1 "option"     # Select dropdown option
agent-browser check @e1               # Check checkbox
agent-browser press Enter             # Press key
agent-browser scroll down 500         # Scroll page

# Get information
agent-browser get text @e1            # Get element text
agent-browser get url                 # Get current URL
agent-browser get title               # Get page title

# Wait
agent-browser wait @e1                # Wait for element
agent-browser wait --load networkidle # Wait for network idle
agent-browser wait --url "**/page"    # Wait for URL pattern
agent-browser wait 2000               # Wait milliseconds

# Capture
agent-browser screenshot              # Screenshot to temp dir
agent-browser screenshot --full       # Full page screenshot
agent-browser pdf output.pdf          # Save as PDF
```

## Patrones comunes

### Envío de formulario

```bash
agent-browser open https://example.com/signup
agent-browser snapshot -i
agent-browser fill @e1 "Jane Doe"
agent-browser fill @e2 "jane@example.com"
agent-browser select @e3 "California"
agent-browser check @e4
agent-browser click @e5
agent-browser wait --load networkidle
```

### Autenticación con persistencia de estado

```bash

# Login once and save state
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "$USERNAME"
agent-browser fill @e2 "$PASSWORD"
agent-browser click @e3
agent-browser wait --url "**/dashboard"
agent-browser state save auth.json

# Reuse in future sessions
agent-browser state load auth.json
agent-browser open https://app.example.com/dashboard
```

### Extracción de datos

```bash
agent-browser open https://example.com/products
agent-browser snapshot -i
agent-browser get text @e5           # Get specific element text
agent-browser get text body > page.txt  # Get all page text

# JSON output for parsing
agent-browser snapshot -i --json
agent-browser get text @e1 --json
```

### Sesiones en paralelo

```bash
agent-browser --session site1 open https://site-a.com
agent-browser --session site2 open https://site-b.com

agent-browser --session site1 snapshot -i
agent-browser --session site2 snapshot -i

agent-browser session list
```

### Navegador visual (depuración)

```bash
agent-browser --headed open https://example.com
agent-browser highlight @e1          # Highlight element
agent-browser record start demo.webm # Record session
```

### Archivos locales (PDFs, HTML)

```bash

# Open local files with file:// URLs
agent-browser --allow-file-access open file:///path/to/document.pdf
agent-browser --allow-file-access open file:///path/to/page.html
agent-browser screenshot output.png
```

### Simulador de iOS (Safari móvil)

```bash

# List available iOS simulators
agent-browser device list

# Launch Safari on a specific device
agent-browser -p ios --device "iPhone 16 Pro" open https://example.com

# Same workflow as desktop - snapshot, interact, re-snapshot
agent-browser -p ios snapshot -i
agent-browser -p ios tap @e1          # Tap (alias for click)
agent-browser -p ios fill @e2 "text"
agent-browser -p ios swipe up         # Mobile-specific gesture

# Take screenshot
agent-browser -p ios screenshot mobile.png

# Close session (shuts down simulator)
agent-browser -p ios close
```**Requisitos:** macOS con Xcode, Appium (` npm install -g appium && appium driver install xcuitest`)

**Dispositivos reales:** Funciona con dispositivos iOS físicos si están preconfigurados. Usar `--device "<UDID>"` donde UDID viene de`xcrun xctrace list devices`.

## Ciclo de vida de refs (importante)

Los refs (`@e1`,`@e2`, etc.) se invalidan cuando la página cambia. Siempre re-snapshot después de:

- Clic en enlaces o botones que navegan
- Envíos de formulario
- Carga de contenido dinámico (dropdowns, modals)

```bash
agent-browser click @e5              # Navigates to new page
agent-browser snapshot -i            # MUST re-snapshot
agent-browser click @e1              # Use new refs
```

## Localizadores semánticos (alternativa a refs)

Cuando los refs no están disponibles o son poco fiables, usa localizadores semánticos:

```bash
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
agent-browser find role button click --name "Submit"
agent-browser find placeholder "Search" type "query"
agent-browser find testid "submit-btn" click
```

## Documentación detallada

| Referencia | Cuándo usar |
|-----------|-------------|
| [references/commands.md](references/commands.md) | Referencia completa de comandos con todas las opciones |
| [references/snapshot-refs.md](references/snapshot-refs.md) | Ciclo de vida de refs, reglas de invalidación, troubleshooting |
| [references/session-management.md](references/session-management.md) | Sesiones paralelas, persistencia de estado, scraping concurrente |
| [references/authentication.md](references/authentication.md) | Flujos de login, OAuth, manejo 2FA, reutilización de estado |
| [references/video-recording.md](references/video-recording.md) | Workflows de grabación para debugging y documentación |
| [references/proxy-support.md](references/proxy-support.md) | Configuración de proxy, geo-testing, proxies rotativos |

## Templates listos para usar

| Template | Descripción |
|----------|-------------|
| [templates/form-automation.sh](templates/form-automation.sh) | Relleno de formularios con validación |
| [templates/authenticated-session.sh](templates/authenticated-session.sh) | Login una vez, reutilizar estado |
| [templates/capture-workflow.sh](templates/capture-workflow.sh) | Extracción de contenido con screenshots |

```bash
./templates/form-automation.sh https://example.com/form
./templates/authenticated-session.sh https://app.example.com/login
./templates/capture-workflow.sh https://example.com ./output
```