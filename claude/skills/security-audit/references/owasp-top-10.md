# Referencia de los 10 principales de OWASP

El OWASP Top 10 representa los riesgos de seguridad de aplicaciones web más críticos.

## A01:2021 – Control de acceso roto

### Descripción
El control de acceso aplica una política tal que los usuarios no pueden actuar fuera de los permisos previstos.

### Patrones de detección

```bash

# Missing authorization checks
grep -rn "router\.\(get\|post\|put\|delete\)" --include="*.ts" | \
  xargs -I{} sh -c 'grep -L "auth\|authorize\|permission" "{}"'

# Direct object references without ownership check
grep -rn "params\.id\|params\.userId" --include="*.ts" | grep -v "owner\|author"

# Horizontal privilege escalation
grep -rn "findById\|findOne" --include="*.ts" | grep -v "where.*userId"
```

### Código vulnerable

```typescript
// IDOR: Any user can access any order
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.json(order); // ❌ No ownership check
});

// Missing function-level access control
app.delete('/api/users/:id', async (req, res) => {
  await User.delete(req.params.id); // ❌ No admin check
});
```

### Código fijo

```typescript
// IDOR prevention
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await Order.findOne({
    where: { id: req.params.id, userId: req.user.id } // ✅ Ownership check
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

// Function-level access control
app.delete('/api/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  await User.delete(req.params.id);
  res.status(204).send();
});
```---

## A02:2021 – Fallos criptográficos

### Descripción
Fallos relacionados con la criptografía que a menudo conducen a la exposición de datos confidenciales.

### Patrones de detección

```bash

# Weak hashing
grep -rn "md5\|sha1\|crypto\.createHash" --include="*.ts" --include="*.js"

# Hardcoded secrets
grep -rn "password\s*=\s*['\"]" --include="*.ts" --include="*.js"
grep -rn "apiKey\s*=\s*['\"]" --include="*.ts" --include="*.js"

# Insecure random
grep -rn "Math\.random" --include="*.ts" --include="*.js"
```

### Código vulnerable

```typescript
// Weak password hashing
const hash = crypto.createHash('md5').update(password).digest('hex');

// Insecure random for tokens
const token = Math.random().toString(36).substring(2);

// Sensitive data in logs
console.log(`User ${email} logged in with token ${token}`);
```

### Código fijo

```typescript
// Strong password hashing
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);

// Cryptographically secure random
import crypto from 'crypto';
const token = crypto.randomBytes(32).toString('hex');

// Sanitized logging
console.log(`User ${email.substring(0, 3)}*** logged in`);
```---

## A03:2021 – Inyección

### Descripción
La aplicación no valida, filtra ni desinfecta los datos proporcionados por el usuario.

### Patrones de detección

```bash

# SQL Injection
grep -rn "query\s*(\s*['\`].*\$\|+" --include="*.ts"
grep -rn "execute\s*(\s*['\`].*\$\|+" --include="*.ts"

# Command Injection
grep -rn "exec\s*(\|spawn\s*(\|execSync" --include="*.ts"
grep -rn "child_process" --include="*.ts"

# NoSQL Injection
grep -rn "find\s*(\s*{.*req\." --include="*.ts"
grep -rn "\$where\|\$regex" --include="*.ts"
```

### Código vulnerable

```typescript
// SQL Injection
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// Command Injection
const output = execSync(`ping ${hostname}`);

// NoSQL Injection
const user = await User.findOne({ 
  email: req.body.email,
  password: req.body.password // ❌ Could be { $gt: '' }
});
```

### Código fijo

```typescript
// Parameterized queries
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

// Input validation for commands
const validHostname = /^[a-zA-Z0-9.-]+$/.test(hostname);
if (!validHostname) throw new Error('Invalid hostname');
const output = execSync(`ping ${hostname}`);

// NoSQL with type checking
const email = String(req.body.email);
const user = await User.findOne({ email });
const isValid = await bcrypt.compare(req.body.password, user.passwordHash);
```---

## A04:2021 – Diseño inseguro

### Descripción
Riesgos relacionados con defectos de diseño. No se puede solucionar con una implementación perfecta.

### Patrones de detección

- Defectos de lógica de negocios (se requiere revisión manual)
- Falta de limitación de tasas en operaciones sensibles
- Sin mecanismo de bloqueo de cuenta
- Restablecimiento de contraseña sin verificación

### Defectos comunes

```typescript
// No rate limiting on login
app.post('/login', async (req, res) => {
  // ❌ Unlimited attempts
});

// Predictable password reset
app.post('/reset-password', async (req, res) => {
  const token = Date.now().toString(); // ❌ Predictable
});

// Business logic bypass
app.post('/checkout', async (req, res) => {
  const total = req.body.total; // ❌ Trust client-provided total
});
```

### Diseño fijo

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.post('/login', loginLimiter, async (req, res) => { /* ... */ });

// Secure password reset
const token = crypto.randomBytes(32).toString('hex');
const expiry = Date.now() + 3600000; // 1 hour

// Server-side calculation
const items = await Cart.findByUserId(req.user.id);
const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
```---

## A05:2021 – Configuración incorrecta de seguridad

### Descripción
Falta refuerzo de seguridad, configuraciones predeterminadas, errores detallados.

### Patrones de detección

```bash

# Debug mode
grep -rn "debug\s*:\s*true\|DEBUG=true" --include="*.ts" --include="*.env*"

# Stack traces exposed
grep -rn "res\.send.*err\.\(stack\|message\)" --include="*.ts"

# Default credentials
grep -rn "admin:admin\|root:root\|password123" --include="*"
```

### Configuración vulnerable

```typescript
// Express error handler exposing stack
app.use((err, req, res, next) => {
  res.status(500).json({ 
    error: err.message,
    stack: err.stack // ❌ Exposes internals
  });
});

// CORS too permissive
app.use(cors({ origin: '*' })); // ❌
```

### Configuración fija

```typescript
// Production error handler
app.use((err, req, res, next) => {
  console.error(err); // Log internally
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.id
  });
});

// Restrictive CORS
app.use(cors({ 
  origin: ['https://app.example.com'],
  credentials: true
}));

// Security headers
app.use(helmet());
```---

## A06:2021 – Componentes vulnerables

### Descripción
Utilizar componentes con vulnerabilidades conocidas.

### Detección

```bash

# npm
npm audit
npm audit --json | jq '.vulnerabilities | keys[]'

# Python
pip-audit
safety check

# General
snyk test
```

### Problemas comunes

| Paquete | Vulnerabilidad | Arreglar |
|---------|---------------|-----|
| lodash <4.17.21 | Contaminación prototipo | Actualización |
| expresar <4.17.3 | Rehacer | Actualización |
| ejes <0.21.1 | SSRF | Actualización |
| jsonwebtoken<9.0.0 | Confusión de algoritmos | Actualización |

---

## A07:2021 – Fallos de autenticación

### Descripción
Confirmación de identidad de usuario, autenticación y gestión de sesiones.

### Patrones de detección

```bash

# Weak JWT verification
grep -rn "verify.*algorithms\|algorithm.*none" --include="*.ts"

# Fijación de sesión
grep -rn "req\.session\s*=" --include="*.ts"

# No logout invalidation
grep -rn "logout" -A5 --include="*.ts" | grep -v "destroy\|invalidate"
```

### Código vulnerable

```typescript
// JWT without algorithm restriction
jwt.verify(token, secret); // ❌ Accepts 'none' algorithm

// No session regeneration
app.post('/login', async (req, res) => {
  req.session.userId = user.id; // ❌ Session fixation
});

// Logout without invalidation
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true }); // ❌ Token still valid
});
```

### Código fijo

```typescript
// Explicit algorithm
jwt.verify(token, secret, { algorithms: ['HS256'] });

// Session regeneration
app.post('/login', async (req, res) => {
  req.session.regenerate((err) => {
    req.session.userId = user.id;
    res.json({ success: true });
  });
});

// Token invalidation
app.post('/logout', async (req, res) => {
  await TokenBlacklist.add(req.token, req.user.tokenExp);
  res.json({ success: true });
});
```---

## A08:2021 – Integridad de datos y software

### Descripción
Código e infraestructura que no protege contra violaciones de integridad.

### Detección

```bash

# No integrity checks on external resources
grep -rn "<script src=" --include="*.html" | grep -v "integrity="

# Unsafe deserialization
grep -rn "JSON\.parse\|unserialize\|pickle\.load" --include="*.ts" --include="*.py"

# CI/CD pipeline vulnerabilities (manual review)
```

### Código vulnerable```html
<!-- No subresource integrity -->
<script src="https://cdn.example.com/lib.js"></script>
```

### Código fijo```html
<!-- With SRI -->
<script src="https://cdn.example.com/lib.js" 
        integrity="sha384-abc123..." 
        crossorigin="anonymous"></script>
```---

## A09:2021 – Fallos de registro

### Descripción
Registro, detección, monitoreo y respuesta activa insuficientes.

### Detección

```bash

# Missing security logging
grep -rn "login\|logout\|password" --include="*.ts" | grep -v "log\|audit"

# Sensitive data in logs
grep -rn "console\.log.*password\|token\|secret" --include="*.ts"
```

### Requisitos

```typescript
// Security events to log
const securityEvents = [
  'login_success',
  'login_failure',
  'logout',
  'password_change',
  'mfa_enabled',
  'mfa_disabled',
  'permission_change',
  'data_export',
  'admin_action'
];

// Audit log entry
interface AuditLog {
  timestamp: Date;
  event: string;
  userId: string;
  ip: string;
  userAgent: string;
  details: Record<string, unknown>;
  success: boolean;
}
```---

## A10:2021 – SSRF

### Descripción
La falsificación de solicitudes del lado del servidor ocurre cuando se recupera un recurso remoto sin validar la URL proporcionada por el usuario.

### Patrones de detección

```bash

# URL from user input
grep -rn "fetch\|axios\|request\|http\.get" --include="*.ts" | \
  grep "req\.\(body\|query\|params\)"

# DNS rebinding potential
grep -rn "url\s*=.*req\." --include="*.ts"
```

### Código vulnerable

```typescript
// SSRF vulnerability
app.get('/fetch', async (req, res) => {
  const response = await fetch(req.query.url); // ❌
  res.json(await response.json());
});
```

### Código fijo

```typescript
import { URL } from 'url';

const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com'];

app.get('/fetch', async (req, res) => {
  const url = new URL(req.query.url);
  
  // Validate host
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(400).json({ error: 'Host not allowed' });
  }
  
  // Block internal IPs
  const ip = await dns.resolve(url.hostname);
  if (isPrivateIP(ip)) {
    return res.status(400).json({ error: 'Internal hosts not allowed' });
  }
  
  const response = await fetch(url.toString());
  res.json(await response.json());
});
```---

## Tabla de referencia rápida

| identificación | Nombre | Mitigación clave |
|----|------|----------------|
| A01 | Control de acceso roto | Comprobaciones de autorización en cada punto final |
| A02 | Fallos criptográficos | Algoritmos potentes, sin secretos codificados |
| A03 | Inyección | Consultas parametrizadas, validación de entradas |
| A04 | Diseño inseguro | Modelado de amenazas, limitación de tasas |
| A05 | Configuración incorrecta de seguridad | Encabezados de seguridad, información mínima de error |
| A06 | Componentes vulnerables | Actualizaciones periódicas de dependencias |
| A07 | Fallos de autenticación | Autenticación fuerte, gestión de sesiones |
| A08 | Fallos de integridad | SRI, actualizaciones firmadas |
| A09 | Fallos de registro | Registros de auditoría, seguimiento |
| A10 | SSRF | Validación de URL, listas permitidas |