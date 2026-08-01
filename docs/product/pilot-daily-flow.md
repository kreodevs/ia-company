# Flujo diario — piloto operativo

> Guía para operar **tu** empresa con Auto Company mientras tienes otro empleo.  
> Objetivo Fase A: un encargo real → entrega al cliente → sin workarounds.

---

## Rutina recomendada (30–60 min/día laborable)

| Momento | Acción | Dónde |
|---------|--------|-------|
| **Inicio** | Revisar encargos activos y notificaciones | `/office` → bandeja / encargos |
| **Brief** | Definir o refinar el encargo con el coordinador | `/office` chat o sala de departamento |
| **Lanzar** | Aprobar brief y ejecutar procedimiento | Departamento → Procedimientos → Usar |
| **Seguimiento** | Ver reunión en vivo (handoffs, veto Munger) | Sala de juntas o `/war-room/:productId` |
| **Cierre** | Revisar documentos y resumen final | Ficha encargo → Documentos / Resumen |
| **Entrega** | Crear enlace (PIN opcional) y enviar al cliente | Encargo entregado → Entrega al cliente |
| **Fin** | Anotar ingreso si aplica | Producto → revenue / notas |

---

## Flujo paso a paso

### 1. Recepción — definir el trabajo

1. Entra en **`/office`** (planta) o al departamento adecuado (Estrategia, Ingeniería…).
2. Abre el **coordinador** y describe el encargo en lenguaje natural:
   - Qué necesitas (informe, feature, análisis repo, propuesta comercial…)
   - Para qué producto o ámbito (empresa / producto concreto)
   - Plazo o restricciones
3. Revisa el **brief** sintetizado antes de aprobar.

### 2. Lanzar procedimiento

1. En la sala del departamento, pestaña **Procedimientos**.
2. Elige el procedimiento (p. ej. evaluación de idea, desarrollo de feature).
3. Confirma alcance, equipo y presupuesto LLM si aplica.
4. El encargo aparece en **`/office/encargos`**.

### 3. Seguimiento en vivo

- **War room producto:** `/war-room/:productId` — anillo táctico + coordinador colapsable.
- **War room departamento:** sala del dept con `?watchRun=` si hay varios runs.
- Si **Munger emite VETO**, el run se **cancela** — revisa el motivo antes de relanzar.

### 4. Revisar entregables

1. Abre la ficha del encargo: **`/office/encargos/:id`**.
2. Pestañas **Resumen final** y **Documentos del equipo**.
3. Archivo global: **`/office/archive`** (filtros por dept / producto / rol).

### 5. Entregar al cliente externo

1. Cuando el encargo esté en fase **Entregado**, sección **Entrega al cliente**.
2. Elige documentos, caducidad, vista previa.
3. *(Recomendado)* Define un **PIN** y compártelo por canal aparte (SMS, WhatsApp).
4. Copia enlace o envía email desde el panel.
5. Recibirás notificación **`delivery_viewed`** cuando el cliente abra el enlace.

### 6. Registrar ingreso (Fase B)

En el producto asociado, actualiza **revenue** o notas de cierre cuando cobres — aunque sea manual al principio.

---

## Checklist semanal (piloto)

- [ ] Al menos **1 encargo** completado con documentos visibles
- [ ] **0 runs** cancelados por veto sin revisión
- [ ] **1 entrega** externa probada (contigo mismo como cliente)
- [ ] Migraciones y worker en prod al día
- [ ] Anotada **1 fricción UX** para el siguiente sprint

---

## Atajos útiles

| Necesidad | Ruta |
|-----------|------|
| Encargos activos | `/office/encargos` |
| Archivo documentos | `/office/archive` |
| War room general | `/war-room` |
| Branding entrega | `/settings?tab=delivery` |
| Procedimientos (admin) | `/settings?tab=procedures` |

---

## Cuando algo falla

| Síntoma | Qué hacer |
|---------|-----------|
| Run completado, docs vacíos | Revisar logs del run; comprobar que el encargo tenía producto vinculado |
| VETO Munger | Leer `errorMessage` en encargo; ajustar brief o datos antes de relanzar |
| Cliente no abre entrega | Comprobar caducidad / revocación; reenviar PIN por canal alternativo |
| Worker no avanza | Verificar Redis + `npm run worker` en prod |

---

*Parte de [product-roadmap.md](./product-roadmap.md) — Fase A.*
