# Visión general de Cloudflare Platform

Cloudflare Developer Platform: ecosistema integral de edge computing para aplicaciones full-stack en una red global con presencia en más de 300 ciudades.

## Conceptos centrales

### Modelo de edge computing

**Red global:**
- El código se ejecuta en servidores en más de 300 ciudades a nivel mundial
- Las solicitudes se procesan desde la ubicación más cercana
- Latencia ultrabaja (<50 ms típico)
- Failover y redundancia automáticos

**V8 Isolates:**
- Entornos de ejecución ligeros (más rápidos que contenedores)
- Cold starts en milisegundos
- Cero gestión de infraestructura
- Escalado automático
- Precio por solicitud

### Componentes clave

**Workers** - Funciones serverless en el edge
- Handlers HTTP/programados/cola/email
- Soporte JavaScript/TypeScript/Python/Rust
- Máx. 50 ms CPU (gratis), 30 s (de pago)
- Límite de memoria: 128 MB

**D1** - Base de datos SQLite con replicación global de lecturas
- Sintaxis SQLite estándar
- Consistencia de un solo escritor
- Replicación global de lecturas
- Límite de tamaño: 25 GB
- Operaciones batch para transacciones

**KV** - Almacén clave-valor distribuido
- Lecturas submilisegundo (cacheadas en el edge)
- Consistencia eventual (~60 s globalmente)
- Límite de valor: 25 MB
- Expiración TTL automática
- Ideal para: caché, sesiones, feature flags

**R2** - Almacenamiento de objetos (compatible con S3)
- Cero tarifas de egress (gran ventaja de costo)
- Almacenamiento ilimitado
- Límite de objeto: 5 TB
- API compatible con S3
- Soporte de multipart upload

**Durable Objects** - Compute con estado y WebSockets
- Coordinación de instancia única (consistencia fuerte)
- Almacenamiento persistente (límite 1 GB de pago)
- Soporte WebSocket
- Hibernación automática

**Queues** - Sistema de colas de mensajes
- Entrega at-least-once
- Reintentos automáticos (backoff exponencial)
- Soporte dead-letter queue
- Procesamiento por lotes

**Pages** - Hosting de sitios estáticos + funciones serverless
- Integración Git (auto-deploy)
- Enrutamiento basado en directorios
- Soporte de frameworks (Next.js, Remix, Astro, SvelteKit)
- Preview deployments integrados

**Workers AI** - Ejecutar modelos de IA en el edge
- LLMs (Llama 3, Mistral, Gemma, Qwen)
- Generación de imágenes (Stable Diffusion, DALL-E)
- Embeddings (BGE, GTE)
- Reconocimiento de voz (Whisper)
- Sin gestión de GPU

**Browser Rendering** - Automatización de navegador headless
- Soporte Puppeteer/Playwright
- Capturas, PDFs, web scraping
- Reutilización de sesiones para optimizar costos
- Soporte MCP server para agentes de IA

## Patrones de arquitectura

### Aplicación full-stack

```
┌─────────────────────────────────────────┐
│    Cloudflare Pages (Frontend)          │
│    Next.js / Remix / Astro               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    Workers (API Layer)                   │
│    - Routing                             │
│    - Authentication                      │
│    - Business logic                      │
└─┬──────┬──────┬──────┬──────┬───────────┘
  │      │      │      │      │
  ▼      ▼      ▼      ▼      ▼
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────────────┐
│ D1 │ │ KV │ │ R2 │ │ DO │ │ Workers AI │
└────┘ └────┘ └────┘ └────┘ └────────────┘
```

### Patrón de almacenamiento políglota

```typescript
export default {
  async fetch(request: Request, env: Env) {
    // KV: Fast cache
    const cached = await env.KV.get(key);
    if (cached) return new Response(cached);

    // D1: Structured data
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    // R2: Media files
    const avatar = await env.R2_BUCKET.get(`avatars/${user.id}.jpg`);

    // Durable Objects: Real-time
    const chat = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId));

    // Queue: Async processing
    await env.EMAIL_QUEUE.send({ to: user.email, template: 'welcome' });

    return new Response(JSON.stringify({ user }));
  }
};
```

## Esenciales de Wrangler CLI

### Instalación
```bash
npm install -g wrangler
wrangler login
wrangler init my-worker
```

### Comandos principales
```bash
# Desarrollo
wrangler dev                    # Local dev server
wrangler dev --remote          # Dev on real edge

# Despliegue
wrangler deploy                # Deploy to production
wrangler deploy --dry-run      # Preview changes

# Logs
wrangler tail                  # Real-time logs
wrangler tail --format pretty  # Formatted logs

# Versions
wrangler deployments list      # List deployments
wrangler rollback [version]    # Rollback

# Secrets
wrangler secret put SECRET_NAME
wrangler secret list
```

### Gestión de recursos
```bash
# D1
wrangler d1 create my-db
wrangler d1 execute my-db --file=schema.sql

# KV
wrangler kv:namespace create MY_KV
wrangler kv:key put --binding=MY_KV "key" "value"

# R2
wrangler r2 bucket create my-bucket
wrangler r2 object put my-bucket/file.txt --file=./file.txt
```

## Configuración (wrangler.toml)

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Variables de entorno
[vars]
ENVIRONMENT = "production"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "YOUR_DATABASE_ID"

# KV Namespace
[[kv_namespaces]]
binding = "KV"
id = "YOUR_NAMESPACE_ID"

# R2 Bucket
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "my-bucket"

# Durable Objects
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"
script_name = "my-worker"

# Queues
[[queues.producers]]
binding = "MY_QUEUE"
queue = "my-queue"

# Workers AI
[ai]
binding = "AI"

# Cron triggers
[triggers]
crons = ["0 0 * * *"]
```

## Buenas prácticas

### Rendimiento
- Mantén Workers ligeros (<1 MB empaquetado)
- Usa bindings en lugar de fetch (más rápido que HTTP)
- Aprovecha KV y Cache API para datos frecuentes
- Usa batch de D1 para múltiples consultas
- Transmite respuestas grandes

### Seguridad
- Usa `wrangler secret` para API keys
- Separa entornos production/staging/development
- Valida entrada de usuario
- Implementa rate limiting (KV o Durable Objects)
- Configura headers CORS adecuados

### Optimización de costos
- R2 para archivos grandes (cero egress vs S3)
- KV para caché (reduce solicitudes D1/R2)
- Deduplicación de solicitudes con caché
- Consultas D1 eficientes (indexación adecuada)
- Monitorea uso vía Cloudflare Analytics

## Matriz de decisión

| Necesidad | Elegir |
|------|--------|
| Sub-millisecond reads | KV |
| SQL queries | D1 |
| Large files (>25MB) | R2 |
| Real-time WebSockets | Durable Objects |
| Async background jobs | Queues |
| ACID transactions | D1 |
| Strong consistency | Durable Objects |
| Zero egress costs | R2 |
| AI inference | Workers AI |
| Static site hosting | Pages |

## Recursos

- Docs: https://developers.cloudflare.com
- Wrangler: https://developers.cloudflare.com/workers/wrangler/
- Discord: https://discord.cloudflare.com
- Examples: https://developers.cloudflare.com/workers/examples/
- Status: https://www.cloudflarestatus.com
