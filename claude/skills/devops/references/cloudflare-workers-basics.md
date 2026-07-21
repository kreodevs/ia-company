# Conceptos básicos de los trabajadores de Cloudflare

Primeros pasos con Cloudflare Workers: funciones sin servidor que se ejecutan en la red perimetral en más de 300 ciudades.

## Tipos de controlador

### Controlador de recuperación (solicitudes HTTP)```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response('Hello World!');
  }
};
```### Controlador programado (trabajos cron)```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await fetch('https://api.example.com/cleanup');
  }
};
```**Configurar en wrangler.toml:**```toml
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight
```### Controlador de cola (procesamiento de mensajes)```typescript
export default {
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      await processMessage(message.body);
      message.ack();  // Acknowledge success
    }
  }
};
```### Controlador de correo electrónico (enrutamiento de correo electrónico)```typescript
export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    await message.forward('destination@example.com');
  }
};
```## Conceptos básicos de solicitud/respuesta

### Solicitud de análisis```typescript
const url = new URL(request.url);
const method = request.method;
const headers = request.headers;

// Query parameters
const name = url.searchParams.get('name');

// JSON body
const data = await request.json();

// Text body
const text = await request.text();

// Form data
const formData = await request.formData();
```### Creating Response```typescript
// Text response
return new Response('Hello', { status: 200 });

// JSON response
return new Response(JSON.stringify({ message: 'Hello' }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});

// Stream response
return new Response(readable, {
  headers: { 'Content-Type': 'text/plain' }
});

// Redirect
return Response.redirect('https://example.com', 302);
```## Patrones de enrutamiento

### Enrutamiento basado en URL```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/':
        return new Response('Home');
      case '/about':
        return new Response('About');
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
};
```### Usando Hono Framework (recomendado)```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Home'));
app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = await getUser(id);
  return c.json(user);
});

export default app;
```## Trabajar con enlaces

### Variables de entorno```toml
# wrangler.toml
[vars]
API_URL = "https://api.example.com"
``````typescript
const apiUrl = env.API_URL;
```### KV Namespace```typescript
// Put with TTL
await env.KV.put('session:token', JSON.stringify(data), {
  expirationTtl: 3600
});

// Get
const data = await env.KV.get('session:token', 'json');

// Delete
await env.KV.delete('session:token');

// List with prefix
const list = await env.KV.list({ prefix: 'user:123:' });
```### D1 Database```typescript
// Query
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first();

// Insert
await env.DB.prepare(
  'INSERT INTO users (name, email) VALUES (?, ?)'
).bind('Alice', 'alice@example.com').run();

// Batch (atomic)
await env.DB.batch([
  env.DB.prepare('UPDATE accounts SET balance = balance - 100 WHERE id = ?').bind(1),
  env.DB.prepare('UPDATE accounts SET balance = balance + 100 WHERE id = ?').bind(2)
]);
```### R2 Bucket```typescript
// Put object
await env.R2_BUCKET.put('path/to/file.jpg', fileBuffer, {
  httpMetadata: {
    contentType: 'image/jpeg'
  }
});

// Get object
const object = await env.R2_BUCKET.get('path/to/file.jpg');
if (!object) {
  return new Response('Not found', { status: 404 });
}

// Stream response
return new Response(object.body, {
  headers: {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream'
  }
});

// Delete
await env.R2_BUCKET.delete('path/to/file.jpg');
```## API de contexto

### esperar hasta (tareas en segundo plano)```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Run analytics after response sent
    ctx.waitUntil(
      fetch('https://analytics.example.com/log', {
        method: 'POST',
        body: JSON.stringify({ url: request.url })
      })
    );

    return new Response('OK');
  }
};
```### pasar a través de una excepción```typescript
// Continue to origin on error
ctx.passThroughOnException();

// Your code that might throw
const data = await riskyOperation();
```## Error Handling```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const response = await processRequest(request, env);
      return response;
    } catch (error) {
      console.error('Error:', error);

      // Log to external service
      ctx.waitUntil(
        fetch('https://logging.example.com/error', {
          method: 'POST',
          body: JSON.stringify({
            error: error.message,
            url: request.url
          })
        })
      );

      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```## CORS```typescript
function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin') || '*';

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Handle request
    const response = await handleRequest(request);
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers
    });
  }
};
```## Cache API```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cache = caches.default;
    const cacheKey = new Request(request.url);

    // Check cache
    let response = await cache.match(cacheKey);
    if (response) return response;

    // Fetch from origin
    response = await fetch(request);

    // Cache response
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }
};
```## Secrets Management```bash
# Add secret
wrangler secret put API_KEY
# Enter value when prompted

# Use in Worker
const apiKey = env.API_KEY;
```## Local Development```bash
# Start local dev server
wrangler dev

# Test with remote edge
wrangler dev --remote

# Custom port
wrangler dev --port 8080

# Access at http://localhost:8787
```## Deployment```bash
# Deploy to production
wrangler deploy

# Deploy to specific environment
wrangler deploy --env staging

# Preview deployment
wrangler deploy --dry-run
```## Patrones comunes

### Puerta de enlace API```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/users', async (c) => {
  const users = await c.env.DB.prepare('SELECT * FROM users').all();
  return c.json(users.results);
});

app.post('/api/users', async (c) => {
  const { name, email } = await c.req.json();
  await c.env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  ).bind(name, email).run();
  return c.json({ success: true }, 201);
});

export default app;
```### Rate Limiting```typescript
async function rateLimit(ip: string, env: Env): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const limit = 100;
  const window = 60;

  const current = await env.KV.get(key);
  const count = current ? parseInt(current) : 0;

  if (count >= limit) return false;

  await env.KV.put(key, (count + 1).toString(), {
    expirationTtl: window
  });

  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (!await rateLimit(ip, env)) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    return new Response('OK');
  }
};
```## Recursos

- Documentos: https://developers.cloudflare.com/workers/
- Ejemplos: https://developers.cloudflare.com/workers/examples/
- API de tiempo de ejecución: https://developers.cloudflare.com/workers/runtime-apis/