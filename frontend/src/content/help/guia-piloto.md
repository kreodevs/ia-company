# Guía — Flujo diario piloto

Cómo operar **tu empresa** con la plataforma en **30–60 minutos al día** mientras tienes otro empleo: de la recepción a la entrega al cliente, sin atajos técnicos.

> Si buscas el detalle de cada pantalla, combina esta guía con [Oficina y encargos](/help/guia-oficina).

---

## Tabla de contenidos

1. [Rutina diaria](#rutina-diaria)
2. [Flujo paso a paso](#flujo-paso-a-paso)
3. [Checklist semanal](#checklist-semanal)
4. [Atajos útiles](#atajos-útiles)
5. [Cuando algo falla](#cuando-algo-falla)

---

## Rutina diaria

| Momento | Acción | Dónde |
|---------|--------|-------|
| **Inicio** | Revisar encargos activos y notificaciones | **Inicio** (`/office`) → **Mis encargos** |
| **Brief** | Definir o refinar el encargo con el coordinador | Chat en Oficina o sala de departamento |
| **Lanzar** | Aprobar brief y ejecutar procedimiento | Departamento → **Procedimientos** → **Usar** |
| **Seguimiento** | Ver reunión en vivo (handoffs, veto Munger) | Sala de juntas o **War room** |
| **Cierre** | Revisar documentos y resumen final | Ficha del encargo → Documentos / Resumen |
| **Entrega** | Crear enlace (PIN opcional) y enviar al cliente | Encargo **Entregado** → **Entrega al cliente** |
| **Fin** | Anotar ingreso si aplica | Ficha del **producto** (revenue / notas) |

```mermaid
flowchart LR
  A[Oficina / Coordinador] --> B[Aprobar encargo]
  B --> C[War room en vivo]
  C --> D[Documentos + resumen]
  D --> E[Enlace al cliente]
  E --> F[Notificación de apertura]
```

---

## Flujo paso a paso

### 1. Recepción — definir el trabajo

1. Entra en **Inicio** (`/office`) o al departamento adecuado (Estrategia, Ingeniería…).
2. Abre el **Coordinador** y describe el encargo en lenguaje natural:
   - Qué necesitas (informe, feature, análisis de repo, propuesta comercial…)
   - Para qué producto o ámbito (empresa / producto concreto)
   - Plazo o restricciones
3. Revisa el **brief** sintetizado antes de pulsar **Aprobar y ejecutar**.

Ver también: [Coordinador y alcance](/help/guia-oficina#coordinador-y-alcance).

### 2. Lanzar procedimiento

1. En la sala del departamento, panel **Procedimientos del departamento**.
2. Elige el procedimiento (p. ej. evaluación de idea, desarrollo de feature).
3. Confirma alcance, equipo y presupuesto LLM si aplica.
4. El encargo aparece en **Mis encargos** (`/office/encargos`).

### 3. Seguimiento en vivo

| Vista | Cuándo usarla |
|-------|---------------|
| **War room de producto** (`/war-room/:productId`) | Anillo táctico + coordinador lateral |
| **War room general** (`/war-room`) | Portfolio completo |
| **Sala del departamento** | Contexto dept/procedimiento; varios runs con `?watchRun=` |

Si **Munger emite VETO**, el encargo se **cancela** — lee el motivo en la ficha antes de relanzar con más contexto.

### 4. Revisar entregables

1. Abre la ficha del encargo en **Mis encargos**.
2. Pestañas **Resumen final** y **Documentos del equipo**.
3. **Archivo de la Oficina** (`/office/archive`) — filtros por departamento, producto o rol.

### 5. Entregar al cliente externo

Cuando el encargo esté en fase **Entregado**:

1. Sección **Entrega al cliente** en la ficha del encargo.
2. Elige documentos, caducidad del enlace y **vista previa**.
3. *(Recomendado)* Define un **PIN de acceso** y compártelo por otro canal (SMS, WhatsApp).
4. **Copia enlace** o **Envía email** desde el panel.
5. Recibirás notificación cuando el cliente **abra el enlace por primera vez**.

Branding del enlace: **Configuración** → pestaña **Entrega cliente** (`/settings?tab=delivery`).

### 6. Registrar ingreso

En el producto asociado, anota **ingresos** o notas de cierre cuando cobres — aunque sea manual al principio. Ver [Productos](/help/guia-productos).

---

## Checklist semanal

- [ ] Al menos **1 encargo** completado con documentos visibles
- [ ] **0 vetos** de Munger sin revisar el motivo
- [ ] **1 entrega externa** probada (puedes ser tú mismo el cliente)
- [ ] **1 fricción UX** anotada para mejorar la semana siguiente

---

## Atajos útiles

| Necesidad | Ruta |
|-----------|------|
| Encargos activos | `/office/encargos` |
| Archivo documentos | `/office/archive` |
| War room general | `/war-room` |
| Branding entrega | `/settings?tab=delivery` |
| Procedimientos (admin) | `/settings?tab=procedures` |
| Centro de ayuda | `/help/guia-piloto` |

---

## Cuando algo falla

| Síntoma | Qué hacer |
|---------|-----------|
| Encargo completado, documentos vacíos | Abre el detalle del encargo y revisa el informe; confirma que el encargo tenía **producto** vinculado. Ver [Mis encargos](/help/guia-oficina#mis-encargos). |
| VETO Munger | Lee el mensaje de error en la ficha; ajusta brief o datos y relanza. |
| Cliente no abre la entrega | Comprueba caducidad o revocación del enlace; reenvía el **PIN** por canal alternativo. |
| El encargo no avanza | Refresca **Mis encargos**; si persiste, contacta al administrador de la plataforma. |

---

## Guías relacionadas

| Tema | Enlace |
|------|--------|
| Oficina, coordinador, war room | [/help/guia-oficina](/help/guia-oficina) |
| Productos e ingresos | [/help/guia-productos](/help/guia-productos) |
| Procedimientos por departamento | [/help/guia-flujos](/help/guia-flujos) |
| Manual completo | [/help/guia-completa](/help/guia-completa) |
