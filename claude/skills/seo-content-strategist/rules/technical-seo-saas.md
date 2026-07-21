---
título: SEO técnico para sitios SaaS
impacto: ALTO
Etiquetas: SEO técnico, arquitectura del sitio, rastreabilidad, indexación, core-web-vitals, esquema
---

## SEO técnico para sitios SaaS

**Impacto: ALTO**

El SEO técnico es la base que permite clasificar el contenido. Un sitio técnicamente sólido con contenido promedio supera a un sitio técnicamente defectuoso con contenido excelente. Para SaaS, esto incluye desafíos específicos en torno a aplicaciones versus páginas de marketing, representación de JavaScript y documentación.

### Lista de verificación de auditoría técnica de SEO

```
Crawlability
├── [ ] Robots.txt configured correctly
├── [ ] XML sitemap submitted and updated
├── [ ] No critical pages blocked
├── [ ] Crawl budget not wasted on low-value pages
└── [ ] Internal linking enables discovery

Indexation
├── [ ] Target pages are indexed (site: search)
├── [ ] No unwanted pages indexed (filters, params)
├── [ ] Canonical tags implemented correctly
├── [ ] No duplicate content issues
└── [ ] Hreflang for international (if applicable)

Performance
├── [ ] Core Web Vitals passing
├── [ ] Mobile-friendly (responsive)
├── [ ] HTTPS enabled
├── [ ] Fast TTFB (<200ms)
└── [ ] Images optimized

Structure
├── [ ] Clear URL hierarchy
├── [ ] Breadcrumbs implemented
├── [ ] Schema markup on key pages
├── [ ] 404 page exists and is helpful
└── [ ] Redirects are 301 (not 302)
```

### Robots.txt para SaaS

```

# Good robots.txt for SaaS site

User-agent: *
Allow: /
Disallow: /app/
Disallow: /dashboard/
Disallow: /api/
Disallow: /admin/
Disallow: /*?*utm_
Disallow: /*?*ref=
Disallow: /search?

# Allow marketing/docs pages that might be under /app path
Allow: /app/signup
Allow: /app/login

Sitemap: https://example.com/sitemap.xml
```

### Errores incorrectos de Robots.txt

```
✗ User-agent: *
  Disallow: /
  (Blocks entire site!)

✗ No robots.txt at all
  (Bots crawl everything, including app pages)

✗ Disallow: /blog
  (Blocking your main content!)

✗ Forgetting sitemap reference
  (Bots have to discover sitemap another way)
```

### Prácticas recomendadas para mapas de sitios XML

| Regla | Directriz |
|------|-----------|
| **Incluir** | Todas las páginas que desea indexar |
| **Excluir** | Páginas delgadas, duplicadas, páginas de aplicaciones |
| **Actualización** | Automáticamente cuando cambia el contenido |
| **Tamaño** | Máximo 50.000 URL o 50 MB por mapa de sitio |
| **Prioridad** | Página de inicio > páginas principales > publicaciones de blog |
| **Frecuencia** | Refleja la frecuencia de actualización real |

### Objetivos principales de Web Vitals

| Métrica | Qué mide | Bueno | Necesita trabajo | Pobre |
|--------|------------------|------|------------|------|
| **LCP** | Pintura con contenido más grande | <2,5 s | 2,5-4 s | >4s |
| **INP** | Interacción con la siguiente pintura | <200 ms | 200-500 ms | >500ms |
| **CLS** | Cambio de diseño acumulativo | <0,1 | 0,1-0,25 | >0,25 |

### Correcciones comunes de CWV para sitios SaaS

| Problema | Causa | Arreglar |
|-------|-------|-----|
| **LCP deficiente** | Imágenes de héroes grandes | Precargar, comprimir, usar WebP |
| **LCP deficiente** | Respuesta lenta del servidor | CDN, almacenamiento en caché perimetral |
| **LCP deficiente** | JS de bloqueo de renderizado | Aplazar scripts no críticos |
| **INP deficiente** | JavaScript pesado | División de código, carga diferida |
| **INP deficiente** | Scripts de terceros | Análisis de retrasos, widgets de chat |
| **CLS alto** | Imágenes sin dimensiones | Establecer atributos de ancho/alto |
| **CLS alto** | Inyección de contenido dinámico | Reservar espacio para anuncios/inserciones |
| **CLS alto** | Fuentes web | visualización de fuentes: intercambio, precarga |

### JavaScript SEO para SaaS

```
Common issue: Marketing site uses same React/Next.js stack as app

Problems:
├── Content rendered client-side → not indexed
├── Slow initial load → poor CWV
├── Links not crawlable → poor internal linking
└── Dynamic routing → canonical issues

Solutions:
├── SSR (Server-Side Rendering) for marketing pages
├── SSG (Static Site Generation) for blog/docs
├── Prerendering service as fallback
├── Test with Google's URL Inspection Tool
└── Check "View Rendered Source" vs "View Source"
```

### Implementación de etiquetas canónicas

| Escenario | Canonical debería señalar |
|----------|---------------------|
| **URL única, sin variantes** | Canónico autorreferencial |
| **www frente a no www** | Versión preferida |
| **HTTP frente a HTTPS** | Versión HTTPS |
| **Con/sin barra diagonal** | Estándar elegido |
| **Contenido paginado** | Generalmente autorreferencial |
| **Versiones filtradas/ordenadas** | URL base (sin parámetros) |
| **Contenido distribuido** | Fuente original |

### Buena implementación canónica```html
<!-- On page: https://example.com/blog/secrets-management -->
<link rel="canonical" href="https://example.com/blog/secrets-management" />

<!-- On page: https://example.com/blog/secrets-management?utm_source=twitter -->
<link rel="canonical" href="https://example.com/blog/secrets-management" />

<!-- On filtered page: https://example.com/tools?category=secrets -->
<link rel="canonical" href="https://example.com/tools" />
```

### Malos errores canónicos```html
✗ Canonical to homepage from every page
  <link rel="canonical" href="https://example.com/" />
  (Tells Google all your pages are duplicates of homepage)

✗ Canonical pointing to 404 page
  (Page won't rank, confuses indexing)

✗ HTTP canonical on HTTPS page
  <link rel="canonical" href="http://example.com/page" />
  (Protocol mismatch)

✗ No canonical at all
  (Google guesses, often incorrectly)
```

### Arquitectura del sitio para SaaS

```
Good structure:
example.com/
├── / (homepage)
├── /product/
│   ├── /product/features/
│   ├── /product/security/
│   └── /product/integrations/
├── /solutions/
│   ├── /solutions/enterprise/
│   └── /solutions/startups/
├── /pricing/
├── /blog/
│   ├── /blog/[category]/
│   └── /blog/[post-slug]/
├── /docs/
│   ├── /docs/getting-started/
│   └── /docs/api-reference/
├── /customers/
└── /company/
    ├── /company/about/
    └── /company/careers/
```

### Marcado de esquema para SaaS

| Tipo de página | Tipo de esquema | Propiedades clave |
|-----------|-------------|----------------|
| **Página de inicio** | Organización | nombre, logotipo, igual que |
| **Página del producto** | Aplicación de software | nombre, sistema operativo, ofertas |
| **Entrada de blog** | Artículo | titular, autor, fecha de publicación |
| **Página de preguntas frecuentes** | Página de preguntas frecuentes | mainEntity (preguntas/respuestas) |
| **Cómo hacerlo** | Cómo | paso, herramienta, suministro |
| **Precios** | Producto + Oferta | precio, precioMoneda |
| **Documentación** | Artículo técnico | dependencias, nivel de competencia |

### Buen esquema para publicación de blog

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Kubernetes Secrets Management Guide",
  "description": "Learn how to securely manage secrets in Kubernetes...",
  "author": {
    "@type": "Person",
    "name": "Jane Developer"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Infisical",
    "logo": {
      "@type": "ImageObject",
      "url": "https://infisical.com/logo.png"
    }
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-03-20"
}
```

### Mejores prácticas de redireccionamiento

| Situación | Tipo de redireccionamiento | Notas |
|-----------|---------------|-------|
| **Mudanza permanente** | 301 | Pasa ~90% de equidad de enlace |
| **Mudanza temporal** | 302 | No se aprobó la equidad del enlace |
| **Cambio de URL** | 301 | URL antigua → URL nueva |
| **Cambio de dominio** | 301 | Cada URL antigua → URL nueva equivalente |
| **HTTP → HTTPS** | 301 | Requerido para la migración HTTPS |
| **Página eliminada** | 301 a la página relevante | No 404 páginas con vínculos de retroceso |

### Errores comunes de redireccionamiento

```
✗ Redirect chains:
  /old → /intermediate → /new
  (Should be: /old → /new)

✗ Redirect loops:
  /page-a → /page-b → /page-a
  (Infinite loop, page won't load)

✗ 302 for permanent changes:
  (Link equity not passed)

✗ Redirect to homepage for all deleted pages:
  /specific-topic → / (homepage)
  (Should redirect to most relevant page)
```

### Optimización móvil

| Elemento | Requisito |
|---------|-------------|
| **Diseño responsivo** | URL única para móvil/escritorio |
| **Toca objetivos** | Espaciado mínimo de 48 píxeles |
| **Tamaño de fuente** | Base mínima de 16px |
| **Ventana gráfica** | conjunto de etiquetas de meta ventana gráfica |
| **Sin desplazamiento horizontal** | El contenido se ajusta al ancho de la pantalla |
| **Amigable al tacto** | Sin funciones que dependan del desplazamiento |

### Herramientas de velocidad del sitio

| Herramienta | Qué mide | Cuándo utilizar |
|------|------------------|-------------|
| **Información de PageSpeed** | CWV, puntuación de rendimiento | Análisis de páginas individuales |
| **Herramientas de desarrollo de Chrome** | Red, renderizado, JS | Depuración profunda |
| **Prueba de página web** | Cascada, tira de película | Análisis de carga detallado |
| **GTmetrix** | Métricas combinadas | Descripción rápida |
| **Consola de búsqueda** | CWV en todo el sitio | Monitoreo de todo el sitio |
| **Faro CI** | Pruebas automatizadas | Integración CI/CD |

### Antipatrones

- **Bloqueo de JS/CSS en robots.txt**: Google no puede representar las páginas correctamente
- **Soft 404s**: la página devuelve 200 pero muestra contenido "no encontrado"
- **Páginas huérfanas**: no hay enlaces internos que apunten a la página
- **Desplazamiento infinito sin paginación**: los bots no pueden acceder al contenido
- **Desorden de navegación por facetas**: crea miles de URL de filtro rastreables
- **Sin HTTPS**: factor de clasificación, problema de confianza del usuario
- **Hospedaje lento**: >3 segundos de tiempo de carga acaban con las clasificaciones y las conversiones
- **Contenido mixto**: página HTTPS que carga recursos HTTP
- **Faltan etiquetas alt en imágenes críticas**: problema de accesibilidad y SEO
- **Aplicación y marketing en el mismo subdominio**: confunde a los rastreadores