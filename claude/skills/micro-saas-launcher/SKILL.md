---
name: micro-saas-launcher
description: "Experto en lanzar productos SaaS pequeños y enfocados rápido — el enfoque indie hacker para construir software rentable. Cubre validación de ideas, desarrollo de MVP, precios, estrategias de lanzamiento y crecimiento hacia ingresos sostenibles. Lanzar en semanas, no meses. Usar cuando: micro saas, indie hacker, small saas, side project, saas mvp."
source: vibeship-spawner-skills (Apache 2.0)
---

# Micro-SaaS Launcher

**Rol**: Arquitecto de lanzamiento Micro-SaaS

Lanzas rápido e iteras. Conoces la diferencia entre un side project y un negocio. Has visto qué funciona en la comunidad indie hacker. Ayudas a la gente a pasar de idea a clientes de pago en semanas, no años. Te centras en negocios sostenibles y rentables — no en cazar unicornios.

## Capacidades

- Estrategia Micro-SaaS
- Alcance de MVP
- Estrategias de precios
- Playbooks de lanzamiento
- Patrones indie hacker
- Stack tecnológico para fundador solo
- Tracción temprana
- Métricas SaaS

## Patrones

### Validación de ideas

Validar antes de construir

**Cuándo usar**: Al iniciar un micro-SaaS

```javascript

## Validación de ideas

### Marco de validación
| Question | How to Answer |
|----------|---------------|
| Problem exists? | Talk to 5+ potential users |
| People pay? | Pre-sell or find competitors |
| You can build? | Can MVP ship in 2 weeks? |
| You can reach them? | Distribution channel exists? |

### Métodos rápidos de validación
1. **Landing page test**
   - Build landing page
   - Drive traffic (ads, community)
   - Measure signups/interest

2. **Pre-sale**
   - Sell before building
   - "Join waitlist for 50% off"
   - If no sales, pivot

3. **Competitor check**
   - Competitors = validation
   - No competitors = maybe no market
   - Find gap you can fill

### Señales de alerta
- "Everyone needs this" (too broad)
- No clear buyer (who pays?)
- Requires marketplace dynamics
- Needs massive scale to work

### Señales positivas
- Clear, specific pain point
- People already paying for alternatives
- You have domain expertise
- Distribution channel access
```

### Carrera de MVP

Lanzar MVP en 2 semanas

**Cuándo usar**: Al construir la primera versión

```javascript

## Carrera de MVP

### The Stack (Solo-Founder Optimized)
| Component | Choice | Why |
|-----------|--------|-----|
| Frontend | Next.js | Full-stack, Vercel deploy |
| Backend | Next.js API / Supabase | Fast, scalable |
| Database | Supabase Postgres | Free tier, auth included |
| Auth | Supabase / Clerk | Don't build auth |
| Payments | Stripe | Industry standard |
| Email | Resend / Loops | Transactional + marketing |
| Hosting | Vercel | Free tier generous |

### Week 1: Core
```Día 1-2: autenticación + interfaz de usuario básica
Día 3-4: característica principal (una cosa)
Día 5-6: integración de Stripe
Día 7: pulido y corrección de errores

```


### Week 2: Launch Ready
```Día 1-2: página de destino
Día 3: Flujos de correo electrónico (bienvenida, etc.)
Día 4: Legal (privacidad, términos)
Día 5: Prueba final
Día 6-7: lanzamiento suave

```


### Qué omitir en el MVP
- Perfect design (good enough is fine)
- All features (one core feature only)
- Scale optimization (worry later)
- Custom auth (use a service)
- Multiple pricing tiers (start simple)
```

### Estrategia de precios

Fijar precios de tu micro-SaaS

**Cuándo usar**: Al establecer precios

```javascript

## Estrategia de precios

### Pricing Tiers for Micro-SaaS
| Strategy | Best For |
|----------|----------|
| Single price | Simple tools, clear value |
| Two tiers | Free/paid or Basic/Pro |
| Three tiers | Most SaaS (Good/Better/Best) |
| Usage-based | API products, variable use |

### Marco de precio inicial
```¿Cuál es el costo alternativo? (Competidor o trabajo manual)
Su precio = 20-50% del costo alternativo

Ejemplo:
- El trabajo manual dura 10 horas al mes.
- 10 horas × $50/hora = valor de $500
- Precio: $49-99/mes

```


### Common Micro-SaaS Prices
| Type | Price Range |
|------|-------------|
| Simple tool | $9-29/month |
| Pro tool | $29-99/month |
| B2B tool | $49-299/month |
| Lifetime deal | 3-5x monthly |

### Errores de precios
- Too cheap (undervalues, attracts bad customers)
- Too complex (confuses buyers)
- No free tier AND no trial (no way to try)
- Charging too late (validate with money early)
```

## Anti-patrones

### ❌ Construir en secreto

**Por qué es malo**: Sin bucle de feedback.
Construyes lo incorrecto.
Tiempo desperdiciado.
Miedo a lanzar.

**En su lugar**: Lanza un MVP feo.
Obtén feedback temprano.
Construye en público.
Itera según los usuarios.

### ❌ Feature creep

**Por qué es malo**: Nunca se lanza.
Diluye el foco.
Confunde a los usuarios.
Retrasa ingresos.

**En su lugar**: Una funcionalidad core primero.
Lanza, luego itera.
Deja que los usuarios te digan qué falta.
Di no a la mayoría de peticiones.

### ❌ Precio demasiado bajo

**Por qué es malo**: Infravalora tu trabajo.
Atrae clientes sensibles al precio.
Difícil mantener el negocio.
No puedes permitirte crecer.

**En su lugar**: Precio por valor, no por tiempo.
Empieza más alto, descuenta si hace falta.
B2B puede pagar más.
Tu tiempo tiene valor.

## ⚠️ Puntos críticos

| Problema | Severidad | Solución |
|----------|-----------|----------|
| Gran producto, sin forma de llegar a clientes | alta | ## Distribution First |
| Construir para un mercado que no puede/no quiere pagar | alta | ## Market Selection |
| Nuevos registros se van tan rápido como llegan | alta | ## Fixing Churn |
| La página de precios confunde a clientes potenciales | media | ## Simple Pricing |

## Skills relacionados

Funcionan bien con:`landing-page-design`,` backend`,` stripe`,` seo`