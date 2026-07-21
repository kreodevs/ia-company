# Gestión de sesiones

Múltiples sesiones de navegador aisladas con persistencia de estado y navegación simultánea.

**Relacionado**: [authentication.md](authentication.md) para patrones de inicio de sesión, [SKILL.md](../SKILL.md) para inicio rápido.

## Contenidos

- [Sesiones nombradas](#sesiones-nombradas)
- [Propiedades de aislamiento de sesión](#propiedades-de-aislamiento-de-sesión)
- [Persistencia del estado de sesión](#persistencia-estado-de-sesión)
- [Patrones comunes](#patrones-comunes)
- [Sesión predeterminada](#sesión-predeterminada)
- [Limpieza de sesión](#session-cleanup)
- [Mejores prácticas](#mejores-practicas)

## Sesiones nombradas

uso `--session` bandera para aislar los contextos del navegador:

```bash

# Sesión 1: Flujo de autenticación
agent-browser --session auth open https://app.example.com/login

# Sesión 2: Navegación pública (cookies y almacenamiento separados)
agent-browser --session public open https://example.com

# Los comandos están aislados por sesión
agent-browser --session auth fill @e1 "user@example.com"
agent-browser --session public get text body
```

## Propiedades de aislamiento de sesión

Cada sesión tiene independiente:
- galletas
- Almacenamiento local/Almacenamiento de sesión
- IndexedDB
- Caché
- Historial de navegación
- Pestañas abiertas

## Persistencia del estado de sesión

### Guardar estado de sesión

```bash

# Save cookies, storage, and auth state
agent-browser state save /path/to/auth-state.json
```

### Cargar estado de sesión

```bash

# Restaurar estado guardado
agent-browser state load /path/to/auth-state.json

# Continuar con sesión autenticada
agent-browser open https://app.example.com/dashboard
```

### Contenido del archivo de estado

```json
{
  "cookies": [...],
  "localStorage": {...},
  "sessionStorage": {...},
  "origins": [...]
}
```

## Patrones comunes

### Reutilización de sesión autenticada

```bash
#!/bin/bash

# Save login state once, reuse many times

STATE_FILE="/tmp/auth-state.json"

# Comprobar si hay estado guardado
if [[ -f "$STATE_FILE" ]]; then
    agent-browser state load "$STATE_FILE"
    agent-browser open https://app.example.com/dashboard
else
    # Perform login
    agent-browser open https://app.example.com/login
    agent-browser snapshot -i
    agent-browser fill @e1 "$USERNAME"
    agent-browser fill @e2 "$PASSWORD"
    agent-browser click @e3
    agent-browser wait --load networkidle

    # Save for future use
    agent-browser state save "$STATE_FILE"
fi
```

### Raspado simultáneo

```bash
#!/bin/bash

# Extraer de varios sitios en paralelo

# Iniciar todas las sesiones
agent-browser --session site1 open https://site1.com &
agent-browser --session site2 open https://site2.com &
agent-browser --session site3 open https://site3.com &
wait

# Extraer de cada uno
agent-browser --session site1 get text body > site1.txt
agent-browser --session site2 get text body > site2.txt
agent-browser --session site3 get text body > site3.txt

# Limpieza
agent-browser --session site1 close
agent-browser --session site2 close
agent-browser --session site3 close
```

### Sesiones de prueba A/B

```bash

# Probar distintas experiencias de usuario
agent-browser --session variant-a open "https://app.com?variant=a"
agent-browser --session variant-b open "https://app.com?variant=b"

# Comparar
agent-browser --session variant-a screenshot /tmp/variant-a.png
agent-browser --session variant-b screenshot /tmp/variant-b.png
```

## Sesión predeterminada

cuando `--session` se omite, los comandos usan la sesión predeterminada:

```bash

# Usan la misma sesión por defecto
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser close  # Closes default session
```

## Limpieza de sesión

```bash

# Cerrar sesión específica
agent-browser --session auth close

# Listar sesiones activas
agent-browser session list
```

## Mejores prácticas

### 1. Nombrar sesiones semánticamente

```bash

# GOOD: Clear purpose
agent-browser --session github-auth open https://github.com
agent-browser --session docs-scrape open https://docs.example.com

# AVOID: Generic names
agent-browser --session s1 open https://github.com
```

### 2. Limpiar siempre

```bash

# Cerrar sesiones al terminar
agent-browser --session auth close
agent-browser --session scrape close
```

### 3. Manejar archivos de estado de forma segura

```bash

# Don't commit state files (contain auth tokens!)
echo "*.auth-state.json" >> .gitignore

# Eliminar tras el uso
rm /tmp/auth-state.json
```

### 4. Tiempo de espera para sesiones largas

```bash

# Configurar timeout para scripts automatizados
timeout 60 agent-browser --session long-task get text body
```