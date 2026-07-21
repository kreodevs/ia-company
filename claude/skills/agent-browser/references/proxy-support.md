# Soporte de proxy

Configuración de proxy para pruebas geográficas, evitación de limitaciones de velocidad y entornos corporativos.

**Relacionado**: [commands.md](commands.md) para opciones globales, [SKILL.md](../SKILL.md) para inicio rápido.

## Contenidos

- [Configuración básica de proxy](#configuración-proxy-básica)
- [Proxy autenticado](#proxy-autenticado)
- [Proxy SOCKS](#socks-proxy)
- [Omitir proxy](#proxy-bypass)
- [Casos de uso comunes](#casos-de-uso-comunes)
- [Verificando conexión de proxy](#verificando-conexión-proxy)
- [Solución de problemas](#solución de problemas)
- [Mejores prácticas](#mejores-practicas)

## Configuración básica de proxy

Configure el proxy a través de la variable de entorno antes de comenzar:

```bash

# HTTP proxy
export HTTP_PROXY="http://proxy.example.com:8080"
agent-browser open https://example.com

# HTTPS proxy
export HTTPS_PROXY="https://proxy.example.com:8080"
agent-browser open https://example.com

# Both
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="http://proxy.example.com:8080"
agent-browser open https://example.com
```

## Proxy autenticado

Para servidores proxy que requieren autenticación:

```bash

# Include credentials in URL
export HTTP_PROXY="http://username:password@proxy.example.com:8080"
agent-browser open https://example.com
```

## SOCKS Proxy

```bash

# SOCKS5 proxy
export ALL_PROXY="socks5://proxy.example.com:1080"
agent-browser open https://example.com

# SOCKS5 with auth
export ALL_PROXY="socks5://user:pass@proxy.example.com:1080"
agent-browser open https://example.com
```

## Omisión de proxy

Omitir proxy para dominios específicos:

```bash

# Bypass proxy for local addresses
export NO_PROXY="localhost,127.0.0.1,.internal.company.com"
agent-browser open https://internal.company.com  # Direct connection
agent-browser open https://external.com          # Via proxy
```

## Casos de uso comunes

### Pruebas de ubicación geográfica

```bash
#!/bin/bash

# Test site from different regions using geo-located proxies

PROXIES=(
    "http://us-proxy.example.com:8080"
    "http://eu-proxy.example.com:8080"
    "http://asia-proxy.example.com:8080"
)

for proxy in "${PROXIES[@]}"; do
    export HTTP_PROXY="$proxy"
    export HTTPS_PROXY="$proxy"

    region=$(echo "$proxy" | grep -oP '^\w+-\w+')
    echo "Testing from: $region"

    agent-browser --session "$region" open https://example.com
    agent-browser --session "$region" screenshot "./screenshots/$region.png"
    agent-browser --session "$region" close
done
```

### Proxies rotativos para scraping

```bash
#!/bin/bash

# Rotate through proxy list to avoid rate limiting

PROXY_LIST=(
    "http://proxy1.example.com:8080"
    "http://proxy2.example.com:8080"
    "http://proxy3.example.com:8080"
)

URLS=(
    "https://site.com/page1"
    "https://site.com/page2"
    "https://site.com/page3"
)

for i in "${!URLS[@]}"; do
    proxy_index=$((i % ${#PROXY_LIST[@]}))
    export HTTP_PROXY="${PROXY_LIST[$proxy_index]}"
    export HTTPS_PROXY="${PROXY_LIST[$proxy_index]}"

    agent-browser open "${URLS[$i]}"
    agent-browser get text body > "output-$i.txt"
    agent-browser close

    sleep 1  # Polite delay
done
```

### Acceso a la red corporativa

```bash
#!/bin/bash

# Access internal sites via corporate proxy

export HTTP_PROXY="http://corpproxy.company.com:8080"
export HTTPS_PROXY="http://corpproxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,.company.com"

# External sites go through proxy
agent-browser open https://external-vendor.com

# Internal sites bypass proxy
agent-browser open https://intranet.company.com
```

## Verificando la conexión proxy

```bash

# Check your apparent IP
agent-browser open https://httpbin.org/ip
agent-browser get text body

# Should show proxy's IP, not your real IP
```

## Solución de problemas

### Error en la conexión de proxy

```bash

# Test proxy connectivity first
curl -x http://proxy.example.com:8080 https://httpbin.org/ip

# Check if proxy requires auth
export HTTP_PROXY="http://user:pass@proxy.example.com:8080"
```

### Errores SSL/TLS a través del proxy

Algunos servidores proxy realizan inspección SSL. Si encuentra errores de certificado:

```bash

# For testing only - not recommended for production
agent-browser open https://example.com --ignore-https-errors
```

### Rendimiento lento

```bash

# Use proxy only when necessary
export NO_PROXY="*.cdn.com,*.static.com"  # Direct CDN access
```

## Mejores prácticas

1. **Utilice variables de entorno**: no codifique las credenciales del proxy
2. **Establezca NO_PROXY apropiadamente** - Evite enrutar el tráfico local a través del proxy
3. **Pruebe el proxy antes de la automatización**: verifique la conectividad con solicitudes simples
4. **Maneje las fallas de proxy con elegancia**: implemente una lógica de reintento para servidores proxy inestables
5. **Rote los servidores proxy para trabajos de scraping grandes**: distribuya la carga y evite prohibiciones