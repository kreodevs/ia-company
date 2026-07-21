# Grabación de vídeo

Capture la automatización del navegador como vídeo para depuración, documentación o verificación.

**Relacionado**: [commands.md](commands.md) para una referencia completa de los comandos, [SKILL.md](../SKILL.md) para un inicio rápido.

## Contenidos

- [Grabación básica](#grabación-básica)
- [Comandos de grabación](#comandos-de-grabación)
- [Casos de uso](#casos de uso)
- [Mejores prácticas](#mejores-practicas)
- [Formato de salida](#formato-de-salida)
- [Limitaciones](#limitaciones)

## Grabación básica

```bash

# Iniciar grabación
agent-browser record start ./demo.webm

# Perform actions
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser fill @e2 "test input"

# Stop and save
agent-browser record stop
```

## Comandos de grabación

```bash

# Start recording to file
agent-browser record start ./output.webm

# Stop current recording
agent-browser record stop

# Restart with new file (stops current + starts new)
agent-browser record restart ./take2.webm
```

## Casos de uso

### Depuración de automatización fallida

```bash
#!/bin/bash

# Record automation for debugging

agent-browser record start ./debug-$(date +%Y%m%d-%H%M%S).webm

# Run your automation
agent-browser open https://app.example.com
agent-browser snapshot -i
agent-browser click @e1 || {
    echo "Click failed - check recording"
    agent-browser record stop
    exit 1
}

agent-browser record stop
```

### Generación de documentación

```bash
#!/bin/bash

# Record workflow for documentation

agent-browser record start ./docs/how-to-login.webm

agent-browser open https://app.example.com/login
agent-browser wait 1000  # Pause for visibility

agent-browser snapshot -i
agent-browser fill @e1 "demo@example.com"
agent-browser wait 500

agent-browser fill @e2 "password"
agent-browser wait 500

agent-browser click @e3
agent-browser wait --load networkidle
agent-browser wait 1000  # Show result

agent-browser record stop
```

### Evidencia de prueba de CI/CD

```bash
#!/bin/bash

# Record E2E test runs for CI artifacts

TEST_NAME="${1:-e2e-test}"
RECORDING_DIR="./test-recordings"
mkdir -p "$RECORDING_DIR"

agent-browser record start "$RECORDING_DIR/$TEST_NAME-$(date +%s).webm"

# Run test
if run_e2e_test; then
    echo "Test passed"
else
    echo "Test failed - recording saved"
fi

agent-browser record stop
```

## Mejores prácticas

### 1. Agregue pausas para mayor claridad

```bash

# Slow down for human viewing
agent-browser click @e1
agent-browser wait 500  # Let viewer see result
```

### 2. Utilice nombres de archivos descriptivos

```bash

# Include context in filename
agent-browser record start ./recordings/login-flow-2024-01-15.webm
agent-browser record start ./recordings/checkout-test-run-42.webm
```

### 3. Manejar la grabación en casos de error

```bash
#!/bin/bash
set -e

cleanup() {
    agent-browser record stop 2>/dev/null || true
    agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

agent-browser record start ./automation.webm

# ... automation steps ...
```

### 4. Combinar con capturas de pantalla

```bash

# Record video AND capture key frames
agent-browser record start ./flow.webm

agent-browser open https://example.com
agent-browser screenshot ./screenshots/step1-homepage.png

agent-browser click @e1
agent-browser screenshot ./screenshots/step2-after-click.png

agent-browser record stop
```

## Formato de salida

- Formato predeterminado: WebM (códec VP8/VP9)
- Compatible con todos los navegadores y reproductores de vídeo modernos.
- Comprimido pero de alta calidad.

## Limitaciones

- La grabación añade una ligera sobrecarga a la automatización.
- Las grabaciones grandes pueden consumir una cantidad significativa de espacio en el disco.
- Algunos entornos sin cabeza pueden tener limitaciones de códec