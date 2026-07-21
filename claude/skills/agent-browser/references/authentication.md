# Patrones de autenticación

Flujos de inicio de sesión, persistencia de sesión, OAuth, 2FA y navegación autenticada.

**Relacionado**: [session-management.md](session-management.md) para detalles de persistencia del estado, [SKILL.md](../SKILL.md) para inicio rápido.

## Contenidos

- [Flujo de inicio de sesión básico](#flujo-de-inicio-de-inicio-básico)
- [Guardando estado de autenticación](#ahorrando-estado-de-autenticación)
- [Restaurando autenticación](#restoring-authentication)
- [Flujos OAuth/SSO](#oauth--flujos-sso)
- [Autenticación de dos factores] (#autenticación de dos factores)
- [Autenticación básica HTTP](#http-autenticación-básica)
- [Autenticación basada en cookies](#autenticación basada en cookies)
- [Manejo de actualización de token] (#token-refresh-handling)
- [Mejores prácticas de seguridad](#seguridad-mejores-practicas)

## Flujo de inicio de sesión básico

```bash

# Navigate to login page
agent-browser open https://app.example.com/login
agent-browser wait --load networkidle

# Get form elements
agent-browser snapshot -i

# Salida: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Sign In"

# Fill credentials
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"

# Submit
agent-browser click @e3
agent-browser wait --load networkidle

# Verify login succeeded
agent-browser get url  # Should be dashboard, not login
```

## Guardando el estado de autenticación

Después de iniciar sesión, guarde el estado para reutilizarlo:

```bash

# Login first (see above)
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --url "**/dashboard"

# Save authenticated state
agent-browser state save ./auth-state.json
```

## Restaurando la autenticación

Omita el inicio de sesión cargando el estado guardado:

```bash

# Load saved auth state
agent-browser state load ./auth-state.json

# Navigate directly to protected page
agent-browser open https://app.example.com/dashboard

# Verify authenticated
agent-browser snapshot -i
```

## Flujos de OAuth/SSO

Para redirecciones OAuth:

```bash

# Start OAuth flow
agent-browser open https://app.example.com/auth/google

# Handle redirects automatically
agent-browser wait --url "**/accounts.google.com**"
agent-browser snapshot -i

# Fill Google credentials
agent-browser fill @e1 "user@gmail.com"
agent-browser click @e2  # Next button
agent-browser wait 2000
agent-browser snapshot -i
agent-browser fill @e3 "password"
agent-browser click @e4  # Sign in

# Wait for redirect back
agent-browser wait --url "**/app.example.com**"
agent-browser state save ./oauth-state.json
```

## Autenticación de dos factores

Manejar 2FA con intervención manual:

```bash

# Login with credentials
agent-browser open https://app.example.com/login --headed  # Show browser
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3

# Wait for user to complete 2FA manually
echo "Complete 2FA in the browser window..."
agent-browser wait --url "**/dashboard" --timeout 120000

# Save state after 2FA
agent-browser state save ./2fa-state.json
```

## Autenticación básica HTTP

Para sitios que utilizan autenticación básica HTTP:

```bash

# Set credentials before navigation
agent-browser set credentials username password

# Navigate to protected resource
agent-browser open https://protected.example.com/api
```

## Autenticación basada en cookies

Configurar cookies de autenticación manualmente:

```bash

# Set auth cookie
agent-browser cookies set session_token "abc123xyz"

# Navigate to protected page
agent-browser open https://app.example.com/dashboard
```

## Manejo de actualización de tokens

Para sesiones con tokens vencidos:

```bash
#!/bin/bash

# Wrapper that handles token refresh

STATE_FILE="./auth-state.json"

# Try loading existing state
if [[ -f "$STATE_FILE" ]]; then
    agent-browser state load "$STATE_FILE"
    agent-browser open https://app.example.com/dashboard

    # Check if session is still valid
    URL=$(agent-browser get url)
    if [[ "$URL" == *"/login"* ]]; then
        echo "Session expired, re-authenticating..."
        # Perform fresh login
        agent-browser snapshot -i
        agent-browser fill @e1 "$USERNAME"
        agent-browser fill @e2 "$PASSWORD"
        agent-browser click @e3
        agent-browser wait --url "**/dashboard"
        agent-browser state save "$STATE_FILE"
    fi
else
    # First-time login
    agent-browser open https://app.example.com/login
    # ... login flow ...
fi
```

## Mejores prácticas de seguridad

1. **Nunca confirme archivos de estado**: contienen tokens de sesión

```bash
   echo "*.auth-state.json" >> .gitignore
   ```2. **Utilice variables de entorno para las credenciales**

```bash
   agent-browser fill @e1 "$APP_USERNAME"
   agent-browser fill @e2 "$APP_PASSWORD"
   ```3. **Limpieza después de la automatización**

```bash
   agent-browser cookies clear
   rm -f ./auth-state.json
   ```4. **Utilice sesiones de corta duración para CI/CD**

```bash
   # Don't persist state in CI
   agent-browser open https://app.example.com/login
   # ... login and perform actions ...
   agent-browser close  # Session ends, nothing persisted
   

```