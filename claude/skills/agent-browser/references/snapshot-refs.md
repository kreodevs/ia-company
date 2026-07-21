# Instantánea y referencias

Referencias de elementos compactos que reducen drásticamente el uso del contexto para los agentes de IA.

**Relacionado**: [commands.md](commands.md) para una referencia completa de los comandos, [SKILL.md](../SKILL.md) para un inicio rápido.

## Contenidos

- [Cómo funcionan las referencias](#how-refs-work)
- [Comando de instantánea] (#el-comando-de-instantánea)
- [Usando referencias](#using-refs)
- [Ciclo de vida de referencia](#ciclo de vida de referencia)
- [Mejores prácticas](#mejores-practicas)
- [Detalles de notación de referencia](#ref-notation-details)
- [Solución de problemas](#solución de problemas)

## Cómo funcionan las referencias

Enfoque tradicional:

```
Full DOM/HTML → AI parses → CSS selector → Action (~3000-5000 tokens)
```enfoque agente-navegador:

```
Compact snapshot → @refs assigned → Direct interaction (~200-400 tokens)
```

## El comando de instantánea

```bash

# Basic snapshot (shows page structure)
agent-browser snapshot

# Interactive snapshot (-i flag) - RECOMMENDED
agent-browser snapshot -i
```

### Formato de salida de instantánea

```
Page: Example Site - Home
URL: https://example.com

@e1 [header]
  @e2 [nav]
    @e3 [a] "Home"
    @e4 [a] "Products"
    @e5 [a] "About"
  @e6 [button] "Sign In"

@e7 [main]
  @e8 [h1] "Welcome"
  @e9 [form]
    @e10 [input type="email"] placeholder="Email"
    @e11 [input type="password"] placeholder="Password"
    @e12 [button type="submit"] "Log In"

@e13 [footer]
  @e14 [a] "Privacy Policy"
```

## Usando referencias

Una vez que tengas referencias, interactúa directamente:

```bash

# Click the "Sign In" button
agent-browser click @e6

# Rellenar email
agent-browser fill @e10 "user@example.com"

# Rellenar contraseña
agent-browser fill @e11 "password123"

# Enviar formulario
agent-browser click @e12
```

## Ciclo de vida de referencia

**IMPORTANTE**: ¡Las referencias se invalidan cuando la página cambia!

```bash

# Obtener snapshot inicial
agent-browser snapshot -i

# @e1 [button] "Next"

# El clic provoca cambio de página
agent-browser click @e1

# MUST re-snapshot to get new refs!
agent-browser snapshot -i

# @e1 [h1] "Page 2"  ← Different element now!
```

## Mejores prácticas

### 1. Siempre toma una instantánea antes de interactuar

```bash

# CORRECTO
agent-browser open https://example.com
agent-browser snapshot -i          # Get refs first
agent-browser click @e1            # Use ref

# INCORRECTO
agent-browser open https://example.com
agent-browser click @e1            # Ref doesn't exist yet!
```

### 2. Volver a tomar una instantánea después de la navegación

```bash
agent-browser click @e5            # Navigates to new page
agent-browser snapshot -i          # Get new refs
agent-browser click @e1            # Use new refs
```

### 3. Nueva instantánea después de cambios dinámicos

```bash
agent-browser click @e1            # Opens dropdown
agent-browser snapshot -i          # See dropdown items
agent-browser click @e7            # Select item
```

### 4. Regiones específicas de instantáneas

Para páginas complejas, tome instantáneas de áreas específicas:

```bash

# Snapshot solo del formulario
agent-browser snapshot @e9
```

## Detalles de notación de referencia

```
@e1 [tag type="value"] "text content" placeholder="hint"
│    │   │             │               │
│    │   │             │               └─ Additional attributes
│    │   │             └─ Visible text
│    │   └─ Key attributes shown
│    └─ HTML tag name
└─ Unique ref ID
```

### Patrones comunes

```
@e1 [button] "Submit"                    # Button with text
@e2 [input type="email"]                 # Email input
@e3 [input type="password"]              # Password input
@e4 [a href="/page"] "Link Text"         # Anchor link
@e5 [select]                             # Dropdown
@e6 [textarea] placeholder="Message"     # Text area
@e7 [div class="modal"]                  # Container (when relevant)
@e8 [img alt="Logo"]                     # Image
@e9 [checkbox] checked                   # Checked checkbox
@e10 [radio] selected                    # Selected radio
```

## Solución de problemas

### Error "Referencia no encontrada"

```bash

# Ref may have changed - re-snapshot
agent-browser snapshot -i
```

### Elemento no visible en la instantánea

```bash

# Desplazar para revelar elemento
agent-browser scroll --bottom
agent-browser snapshot -i

# O esperar contenido dinámico
agent-browser wait 1000
agent-browser snapshot -i
```

### Demasiados elementos

```bash

# Snapshot de contenedor específico
agent-browser snapshot @e5

# Or use get text for content-only extraction
agent-browser get text @e5
```