# Cloudflare D1 y KV

## D1 (Base de datos SQLite)

### Configuración
```bash
# Create database
wrangler d1 create my-database

# Add to wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "YOUR_DATABASE_ID"

# Apply schema
wrangler d1 execute my-database --file=./schema.sql
```

### Uso

```typescript
// Query
const result = await env.DB.prepare(
  "SELECT * FROM users WHERE id = ?"
).bind(userId).first();

// Insert
await env.DB.prepare(
  "INSERT INTO users (name, email) VALUES (?, ?)"
).bind("Alice", "alice@example.com").run();

// Batch (atomic)
await env.DB.batch([
  env.DB.prepare("UPDATE accounts SET balance = balance - 100 WHERE id = ?").bind(user1),
  env.DB.prepare("UPDATE accounts SET balance = balance + 100 WHERE id = ?").bind(user2)
]);

// All results
const { results } = await env.DB.prepare("SELECT * FROM users").all();
```

### Características
- Replicación global de lecturas (lecturas de baja latencia)
- Consistencia de un solo escritor
- Sintaxis SQLite estándar
- Límite de tamaño de base de datos: 25GB
- Transacciones ACID con batch

## KV (Almacén clave-valor)

### Configuración
```bash
# Create namespace
wrangler kv:namespace create MY_KV

# Add to wrangler.toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_NAMESPACE_ID"
```

### Uso

```typescript
// Put with TTL
await env.KV.put("session:token", JSON.stringify(data), {
  expirationTtl: 3600,
  metadata: { userId: "123" }
});

// Get
const value = await env.KV.get("session:token");
const json = await env.KV.get("session:token", "json");
const buffer = await env.KV.get("session:token", "arrayBuffer");
const stream = await env.KV.get("session:token", "stream");

// Get with metadata
const { value, metadata } = await env.KV.getWithMetadata("session:token");

// Delete
await env.KV.delete("session:token");

// List
const list = await env.KV.list({ prefix: "user:" });
```

### Características
- Lecturas submilisegundo (cacheadas en el edge)
- Consistencia eventual (~60 segundos globalmente)
- Límite de tamaño de valor: 25MB
- Expiración automática (TTL)

## Casos de uso

### D1
- Datos relacionales
- Consultas complejas con JOINs
- Transacciones ACID
- Cuentas de usuario, pedidos, inventario

### KV
- Caché
- Sesiones
- Feature flags
- Rate limiting
- Contadores en tiempo real

## Matriz de decisión

| Necesidad | Elegir |
|------|--------|
| SQL queries | D1 |
| Sub-millisecond reads | KV |
| ACID transactions | D1 |
| Large values (>25MB) | R2 |
| Strong consistency | D1 (writes), Durable Objects |
| Automatic expiration | KV |

## Recursos

- D1: https://developers.cloudflare.com/d1/
- KV: https://developers.cloudflare.com/kv/
