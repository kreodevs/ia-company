---
name: code-review-security
description: >-
  Lista de verificación de revisión de código centrada en seguridad y patrones de escaneo automatizados. Usar al
  revisar pull requests por issues de seguridad, auditar código de autenticación/autorización,
  buscar vulnerabilidades OWASP Top 10 o validar sanitización de inputs.
  Cubre prevención de inyección SQL, protección XSS, tokens CSRF, revisión de flujos de autenticación,
  detección de secretos, escaneo de vulnerabilidades en dependencias y patrones de codificación segura
  para Python (FastAPI) y React. NO cubre seguridad de deployment (usar
  docker-best-practices) ni manejo de incidentes (usar incident-response).
license: MIT
compatibility: 'Python 3.12+, FastAPI, React, TypeScript'
metadata:
  author: security-team
  version: '1.0.0'
  sdlc-phase: code-review
allowed-tools: Read Grep Glob Write Bash(python:*) Bash(npm:*)
context: fork
---

# Seguridad de revisión de código

## Cuándo utilizar

Activa esta habilidad cuando:
- Revisión de solicitudes de extracción para vulnerabilidades de seguridad.
- Auditoría de cambios de código de autenticación o autorización.
- Revisar el código que maneja la entrada del usuario, la carga de archivos o datos externos.
- Comprobación de las 10 vulnerabilidades principales de OWASP en nuevas funciones
- Validar que los secretos no estén confirmados en el repositorio.
- Escaneo de dependencias en busca de vulnerabilidades conocidas.
- Revisión de puntos finales de API que exponen datos confidenciales

**Salida:** Escriba los hallazgos en `security-review.md` con gravedad, archivo:línea, descripción y recomendaciones.

NO uses esta habilidad para:
- Seguridad de la infraestructura de implementación (use`docker-best-practices`)
- Procedimientos de respuesta a incidentes (use`incident-response`)
- Revisión general de la calidad del código sin enfoque de seguridad (use`pre-merge-checklist`)
- Escribir código de implementación (use `python-backend-expert` o`react-frontend-expert`)

## Instrucciones

### Lista de verificación de los 10 mejores de OWASP

Revise cada PR comparándolo con el OWASP Top 10 (edición 2021). Cada categoría a continuación incluye comprobaciones específicas para las bases de código de Python/FastAPI y React.

---

#### A01: Control de acceso roto

**Qué buscar:**
- Faltan controles de autorización en los puntos finales
- Referencia directa de objeto sin verificación de propiedad.
- Puntos finales que exponen datos sin filtrado basado en roles
- Falta `Depends()` para autenticación en nuevas rutas

**Comprobaciones de Python/FastAPI:**

```python

# BAD: No authorization check -- any authenticated user can access any user
@router.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    return await user_repo.get(user_id)

# GOOD: Verify the requesting user owns the resource or is admin
@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return await user_repo.get(user_id)
```**Revisar lista de verificación:**
- [ ] Cada ruta tiene autenticación (`Depends(get_current_user)`)
- [] El acceso a los recursos se verifica con el usuario solicitante
- [] Verificación de puntos finales solo para administradores `role == "admin"`- [] Listar los puntos finales filtrados por propiedad del usuario (a menos que sea administrador)
- [] Sin vulnerabilidades IDOR (Referencia directa a objetos inseguros)

---

#### A02: Fallos criptográficos

**Qué buscar:**
- Contraseñas almacenadas en texto plano o con hash débil
- Datos confidenciales en registros o mensajes de error.
- Secretos codificados, claves API o tokens
- Configuración JWT débil

**Comprobaciones de Python:**

```python

# BAD: Weak password hashing
import hashlib
password_hash = hashlib.md5(password.encode()).hexdigest()

# GOOD: Use bcrypt via passlib
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password_hash = pwd_context.hash(password)

# BAD: Secret in code
SECRET_KEY = "my-super-secret-key-123"

# GOOD: Secret from environment
SECRET_KEY = os.environ["SECRET_KEY"]
```**Revisar lista de verificación:**
- [] Contraseñas codificadas con bcrypt (nunca MD5, SHA1 o texto sin formato)
- [] Secreto JWT cargado desde el entorno, no codificado
- [] Datos confidenciales excluidos de los registros (contraseñas, tokens, PII)
- [] HTTPS aplicado para todas las comunicaciones externas
- [] No hay secretos en el código fuente (verifique que `.env.example` solo tenga marcadores de posición)

---

#### A03: Inyección

**Qué buscar:**
- Consultas SQL sin formato con interpolación de cadenas.
-`eval()`,` exec()`,` compile()`con entrada del usuario
- `subprocess` llama con`shell=True`- Inyección de plantilla

**Comprobaciones de Python:**

```python

# BAD: SQL injection via string formatting
query = f"SELECT * FROM users WHERE email = '{email}'"
db.execute(text(query))

# GOOD: Parameterized query
db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})

# GOOD: SQLAlchemy ORM (always parameterized)
user = db.query(User).filter(User.email == email).first()

# BAD: Command injection
subprocess.run(f"convert {filename}", shell=True)

# GOOD: Pass arguments as a list
subprocess.run(["convert", filename], shell=False)

# BAD: Code execution with user input
result = eval(user_input)

# GOOD: Never eval user input. Use ast.literal_eval for safe parsing.
result = ast.literal_eval(user_input)  # Only for literal structures
```**Revisar lista de verificación:**
- [] No hay SQL sin formato con interpolación de cadenas (use ORM o consultas parametrizadas)
- [ ] No`eval()`,` exec()`o` compile()`con entrada externa
- [] No `subprocess.run(..., shell=True)` con argumentos dinámicos
- [] No `pickle.loads()` en datos que no son de confianza
- [] Todas las entradas del usuario validadas por esquemas de Pydantic antes de su uso.

---

#### A04: Diseño inseguro

**Qué buscar:**
- Falta limitación de velocidad en los puntos finales de autenticación
- Sin bloqueo de cuenta después de intentos fallidos de inicio de sesión
- Falta CAPTCHA en formularios públicos
- Defectos de lógica empresarial (por ejemplo, cantidades negativas, escalada de privilegios personales)

**Revisar lista de verificación:**
- [] Tasa de limitación de inicio de sesión, registro y restablecimiento de contraseña
- [] Bloqueo de cuenta o retroceso exponencial después de más de 5 intentos fallidos
- [ ] La lógica de negocio valida las restricciones (montos positivos, transiciones válidas)
- [] Las operaciones sensibles requieren una nueva autenticación

---

#### A05: Configuración incorrecta de seguridad

**Qué buscar:**
- Modo de depuración habilitado en producción.
- CORS configurado con orígenes comodín `*`- Credenciales predeterminadas o cuentas de administrador
- Mensajes de error detallados que exponen seguimientos de pila

**Comprobaciones de Python/FastAPI:**

```python

# BAD: Wide-open CORS
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# GOOD: Explicit allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# BAD: Debug mode in production
app = FastAPI(debug=True)

# GOOD: Debug only in development
app = FastAPI(debug=settings.DEBUG)  # DEBUG=False in production
```**Revisar lista de verificación:**
- [] Los orígenes de CORS son explícitos (sin comodines en producción)
- [] Modo de depuración deshabilitado en la configuración de producción
- [] Las respuestas de error no exponen seguimientos de pila ni detalles internos
- [] Las credenciales de administrador predeterminadas se cambian o eliminan
- [] Conjunto de encabezados de seguridad (X-Content-Type-Options, X-Frame-Options, etc.)

---

#### A06: Componentes vulnerables y obsoletos

**Revisar lista de verificación:**
- [] No se conocen CVE en dependencias de Python (`pip-audit` o`safety check`)
- [] No se conocen CVE en dependencias de npm (`npm audit`)
- [] Dependencias ancladas a versiones específicas en archivos de bloqueo
- [] Aún no se utilizan paquetes obsoletos

---

#### A07: Fallas de identificación y autenticación

**Qué buscar:**
- Políticas de contraseñas débiles
- Tokens de sesión que no caducan
- Falta autenticación multifactor para acciones de administrador
- Tokens JWT sin vencimiento**Comprobaciones de Python:**

```python

# BAD: JWT without expiration
token = jwt.encode({"sub": user_id}, SECRET_KEY, algorithm="HS256")

# GOOD: JWT with expiration
token = jwt.encode(
    {"sub": user_id, "exp": datetime.utcnow() + timedelta(minutes=30)},
    SECRET_KEY,
    algorithm="HS256",
)
```**Revisar lista de verificación:**
- [] Los tokens JWT tienen vencimiento (reclamo`exp`)
- [] Los tokens de actualización se almacenan de forma segura y se pueden revocar
- [] La política de contraseñas exige una longitud mínima (12+) y complejidad
- [] Invalidación de sesión al cambiar la contraseña o cerrar sesión
- [] No hay enumeración de usuarios mediante mensajes de error de inicio de sesión

---

#### A08: Fallas de integridad de datos y software

**Revisar lista de verificación:**
- [] La canalización de CI/CD valida la integridad del artefacto
- [] No hay paquetes sin firmar o sin verificar
- [] La deserialización de datos que no son de confianza utiliza métodos seguros (no`pickle.loads`)
- [] Las migraciones de bases de datos se revisan antes de su ejecución.

---

#### A09: Fallas de monitoreo y registro de seguridad

**Revisar lista de verificación:**
- [] Se registran eventos de autenticación (iniciar sesión, cerrar sesión, intentos fallidos)
- [] Los errores de autorización se registran con contexto
- [] Los datos confidenciales NO se incluyen en los registros (contraseñas, tokens, PII)
- [] Las entradas del registro incluyen marca de tiempo, ID de usuario, dirección IP y acción.
- [] Alertas configuradas para patrones sospechosos (fuerza bruta, acceso inusual)

---

#### A10: Falsificación de solicitudes del lado del servidor (SSRF)

**Qué buscar:**
- URL proporcionadas por el usuario utilizadas en solicitudes del lado del servidor
- Redirigir puntos finales que aceptan URL arbitrarias

**Comprobaciones de Python:**

```python

# BAD: Fetch arbitrary URL from user input
url = request.query_params["url"]
response = httpx.get(url)  # SSRF: can access internal services

# GOOD: Validate URL against allowlist
ALLOWED_HOSTS = {"api.example.com", "cdn.example.com"}
parsed = urlparse(url)
if parsed.hostname not in ALLOWED_HOSTS:
    raise HTTPException(400, "URL not allowed")
response = httpx.get(url)
```**Revisar lista de verificación:**
- [] No hay solicitudes del lado del servidor a URL controladas por el usuario sin validación
- [] Listas permitidas de URL utilizadas para integraciones externas
- [] URL de servicios internos no expuestas en mensajes de error

---

### Comprobaciones de seguridad específicas de Python

Más allá de OWASP, revise el código Python para estos patrones:

| Patrón | Riesgo | Arreglar |
|---------|------|-----|
| `eval(user_input)`| Ejecución remota de código | Eliminar o utilizar` ast.literal_eval`|
| `pickle.loads(data)`| Ejecución de código arbitrario | Utilice JSON o` msgpack`|
| `subprocess.run(cmd, shell=True)`| Inyección de comando | Pase argumentos como lista,` shell=False`|
| `yaml.load(data)`| Ejecución de código | Utilice` yaml.safe_load(data)`|
| `os.system(cmd)`| Inyección de comando | Utilice` subprocess.run([...])`|
| Cadenas SQL sin formato | Inyección SQL | Utilice ORM o consultas parametrizadas |
| `hashlib.md5(password)`| Hashing débil | Utilice` bcrypt`a través de` passlib`|
| `jwt.decode(token, options={"verify_signature": False})`| Omisión de autenticación | Verifique siempre la firma |
| `open(user_path)`| Recorrido del camino | Validar ruta, usar` pathlib.resolve()`|
| `tempfile.mktemp()`| Condición de carrera | Utilice` tempfile.mkstemp()`|

### Comprobaciones de seguridad específicas de React

| Patrón | Riesgo | Arreglar |
|---------|------|-----|
| `dangerouslySetInnerHTML`| XSS | Utilice contenido de texto o desinfecte con DOMPurify |
| `javascript:` en href | XSS | Validar URL, permitir solo`https:`|
| `window.location = userInput`| Abrir redireccionamiento | Validar contra la lista de permitidos |
| Almacenamiento de tokens en localStorage | Robo de tokens a través de XSS | Utilice cookies httpOnly |
| Controladores de eventos en línea a partir de datos | XSS | Utilice controladores de eventos de React |
| `eval()` o`Function()`| Ejecución de código | Eliminar por completo |
| Representación HTML del usuario | XSS | Utilice una biblioteca de desinfección |

**Revisión del código de reacción:**

```tsx
// BAD: XSS via dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userBio }} />

// GOOD: Sanitize first, or use text content
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />

// BETTER: Use text content when HTML is not needed
<p>{userBio}</p>

// BAD: javascript: URL
<a href={userLink}>Click</a>  // userLink could be "javascript:alert(1)"

// GOOD: Validate protocol
const safeHref = /^https?:\/\//.test(userLink) ? userLink : "#";
<a href={safeHref}>Click</a>
```

### Clasificación de gravedad

Clasifique cada hallazgo por gravedad para priorizar:

| Gravedad | Descripción | Ejemplos | Acuerdo de Nivel de Servicio |
|----------|-------------|----------|-----|
| **Crítico** | Explotable de forma remota, no se necesita autenticación, violación de datos | Inyección SQL, RCE, omisión de autenticación | Bloquee la fusión, solucione de inmediato |
| **Alto** | Explotable con autenticación, escalada de privilegios | IDOR, control de acceso roto, XSS (almacenado) | Bloquear fusión, arreglar antes del lanzamiento |
| **Medio** | Requiere condiciones específicas para explotar | CSRF, XSS (reflejado), redireccionamiento abierto | Arreglar dentro del sprint |
| **Bajo** | Defensa en profundidad, informativa | Encabezados faltantes, errores detallados | Arreglar cuando sea conveniente |
| **Información** | Recomendaciones de mejores prácticas | Actualizaciones de dependencia, estilo de código | Seguimiento del trabajo pendiente |

### Encontrar formato de informe

Al informar sobre hallazgos de seguridad, utilice este formato para mantener la coherencia:

```markdown

## Hallazgo de seguridad: [Título]

**Severity:** Critical | High | Medium | Low | Info
**Category:** OWASP A01-A10 or custom category
**File:** path/to/file.py:42
**CWE:** CWE-89 (if applicable)

### Description
Brief description of the vulnerability and its impact.

### Vulnerable Code
```python

# El código problemático
función_vulnerable(entrada_usuario)

```


### Recommended Fix
```python

# La alternativa segura
función_segura(desinfectar(entrada_usuario))

```


### Impact
What an attacker could achieve by exploiting this vulnerability.

### References
- Link to relevant OWASP page
- Link to relevant CWE entry
```

### Escaneo automatizado

Utilice `scripts/security-scan.py` para realizar un escaneo basado en AST en busca de patrones de vulnerabilidad comunes en el código Python. El script busca:
- Llamadas `eval()`/` exec()`/` compile()`-` subprocess`con` shell=True`-` pickle.loads()`sobre datos potencialmente no confiables
- Construcción de cadenas SQL sin formato
- `yaml.load()` sin`Loader=SafeLoader`- Patrones secretos codificados (claves API, contraseñas)
- Funciones hash débiles (MD5, SHA1 para contraseñas)

Ejecutar: `python scripts/security-scan.py --path ./app --output-dir ./security-results`**Escaneo de dependencias (ejecutado por separado):**

```bash

# Python dependencies
pip-audit --requirement requirements.txt --output json > dep-audit.json

# npm dependencies
npm audit --json > npm-audit.json
```

## Ejemplos

### Ejemplo de comentario de revisión (crítico)> **SEGURIDAD: Inyección SQL (Crítico, OWASP A03)**
>
> Archivo: `app/repositories/user_repository.py:47`>
>

```python
> query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"
> ```>
> Esto construye una consulta SQL sin formato con interpolación de cadenas, lo que permite la inyección de SQL.
> Un atacante podría ingresar `'; DROP TABLE users; --` para destruir datos.
>
> **Solución:** Utilice el filtrado ORM de SQLAlchemy:
>

```python
> users = db.query(User).filter(User.name.ilike(f"%{search_term}%")).all()
> 

```

### Ejemplo de comentario de revisión (medio)

> **SEGURIDAD: Falta límite de velocidad (Medio, OWASP A04)**
>
> Archivo: `app/routes/auth.py:12`>
> El terminal `/auth/login` no tiene límite de velocidad. Un atacante podría realizar fuerza bruta
> ataques de contraseña a velocidad ilimitada.
>
> **Solución:** Agregar middleware de limitación de velocidad:
>

```python
> from slowapi import Limiter
> limiter = Limiter(key_func=get_remote_address)
>
> @router.post("/login")
> @limiter.limit("5/minute")
> async def login(request: Request, ...):
> 

```

### Archivo de salida

Escriba los resultados de seguridad en`security-review.md`:

```markdown

# Revisión de seguridad: [Nombre de funcionalidad/PR]

## Resumen
- Critical: 0 | High: 1 | Medium: 2 | Low: 1

## Hallazgos

### [CRITICAL] SQL Injection in user search
- **File:** app/routes/users.py:45
- **OWASP:** A03 Injection
- **Description:** Raw SQL with string interpolation
- **Recommendation:** Use SQLAlchemy ORM filtering

### [HIGH] Missing authorization check
...

## Comprobaciones superadas
- No hardcoded secrets found
- Dependencies up to date
```