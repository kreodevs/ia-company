# Estructura de niveles y embalaje

## ¿Cuántos niveles?

**2 niveles:** Elección sencilla y clara
- Funciona para: eliminar la división entre pymes y empresas
- Riesgo: Puede dejar dinero sobre la mesa

**3 niveles:** Estándar de la industria
- Buen nivel = Punto de entrada
- Mejor nivel = Recomendado (anclado al mejor)
- Mejor nivel = Clientes de alto valor

**4+ niveles:** Más granularidad
- Funciona para: Amplia gama de tamaños de clientes
- Riesgo: Parálisis de decisiones, complejidad

---

## Marco Bueno-Mejor-Mejor

**Buen nivel (Entrada):**
- Finalidad: Eliminar barreras de entrada.
- Incluye: funciones principales, uso limitado
- Precio: Bajo, accesible
- Objetivo: Equipos pequeños, pruébalo antes de comprar.

**Mejor nivel (recomendado):**
- Propósito: Donde aterrizan la mayoría de los clientes.
- Incluye: funciones completas, límites razonables
- Precio: Su precio "ancla"
- Objetivo: equipos en crecimiento, usuarios serios

**Mejor nivel (Premium):**
- Finalidad: Captar clientes de alto valor
- Incluye: Todo, funciones avanzadas, límites más altos
- Precio: Premium (a menudo 2-3 veces "Mejor")
- Objetivo: equipos más grandes, usuarios avanzados, empresas

---

## Estrategias de diferenciación de niveles

**Control de funciones:**
- Funciones básicas en todos los niveles.
- Funciones avanzadas en niveles superiores
- Funciona cuando las características tienen diferencias de valor claras

**Límites de uso:**
- Mismas características, diferentes límites
- Más usuarios, almacenamiento, llamadas API en niveles superiores
- Funciona cuando el valor aumenta con el uso

**Nivel de soporte:**
- Soporte por correo electrónico → Soporte prioritario → Éxito dedicado
- Funciona para productos con complejidad de implementación.

**Acceso y personalización:**
- Acceso API, SSO, marca personalizada
- Trabajos para la diferenciación empresarial.

---

## Ejemplo de estructura de niveles

```
┌────────────────┬─────────────────┬─────────────────┬─────────────────┐
│                │ Starter         │ Pro             │ Business        │
│                │ $29/mo          │ $79/mo          │ $199/mo         │
├────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Users          │ Up to 5         │ Up to 20        │ Unlimited       │
│ Projects       │ 10              │ Unlimited       │ Unlimited       │
│ Storage        │ 5 GB            │ 50 GB           │ 500 GB          │
│ Integrations   │ 3               │ 10              │ Unlimited       │
│ Analytics      │ Basic           │ Advanced        │ Custom          │
│ Support        │ Email           │ Priority        │ Dedicated       │
│ API Access     │ ✗               │ ✓               │ ✓               │
│ SSO            │ ✗               │ ✗               │ ✓               │
│ Audit logs     │ ✗               │ ✗               │ ✓               │
└────────────────┴─────────────────┴─────────────────┴─────────────────┘
```---

## Embalaje para Personas

### Identificación de personas que fijan precios

Diferentes clientes tienen diferentes:
- Disposición a pagar
- Necesidades de funciones
- Procesos de compra
- Percepción de valor

**Segmentar por:**
- Tamaño de la empresa (emprendedor individual → PYME → empresa)
- Caso de uso (marketing versus ventas versus soporte)
- Sofisticación (principiante → usuario avanzado)
- Industria (diferentes normas presupuestarias)

### Embalaje basado en personas

**Paso 1: Definir personas**

| Persona | Tamaño | Necesidades | DAP | Ejemplo |
|---------|------|-------|-----|---------|
| Profesional independiente | 1 persona | Características básicas | Bajo | $19/mes |
| Equipo pequeño | 2-10 | Colaboración | Medio | $49/mes |
| Compañía en crecimiento | 10-50 | Escala, integraciones | Superior | $149/mes |
| Empresa | 50+ | Seguridad, soporte | Alto | Personalizado |

**Paso 2: Asigna características a personas**

| Característica | Profesional independiente | Equipo pequeño | Creciendo | Empresa |
|---------|------------|------------|---------|------------|
| Características principales | ✓ | ✓ | ✓ | ✓ |
| Colaboración | — | ✓ | ✓ | ✓ |
| Integraciones | — | Limitado | Completo | Completo |
| Acceso API | — | — | ✓ | ✓ |
| SSO/SAML | — | — | — | ✓ |
| Registros de auditoría | — | — | — | ✓ |
| Contrato personalizado | — | — | — | ✓ |

**Paso 3: Precio a valor para cada persona**
- Investigación de disposición a pagar por segmento.
- Establecer precios que capturen valor sin bloquear la adopción.
- Considere páginas de destino específicas del segmento

---

## Freemium frente a prueba gratuita

### Cuándo usar Freemium

**Freemium funciona cuando:**
- El producto tiene efectos virales/de red.
- Los usuarios gratuitos aportan valor (contenido, datos, referencias)
- Mercado grande donde el porcentaje de conversión impulsa el volumen
- Bajo costo marginal para atender a usuarios gratuitos.
- Límites claros de funciones/uso para el activador de actualización

**Riesgos de Freemium:**
- Es posible que los usuarios gratuitos nunca realicen conversiones
- Devalúa la percepción del producto.
- Costos de soporte para usuarios que no pagan
- Es más difícil subir los precios más adelante

### Cuándo utilizar la prueba gratuita

**La prueba gratuita funciona cuando:**
- El producto necesita tiempo para demostrar valor.
- Se requiere inversión en incorporación/instalación
- B2B con comités de compras
- Puntos de precio más altos
- El producto es "pegajoso" una vez configurado

**Mejores prácticas de prueba:**
- 7-14 días para productos simples
- 14-30 días para productos complejos
- Acceso completo (sin funciones limitadas)
- Borrar cuenta atrás y recordatorios.
- Tarjeta de crédito opcional versus compensación requerida

**Tarjeta de crédito por adelantado:**
- Mayor conversión de prueba a pago (40-50 % frente a 15-25 %)
- Menor volumen de prueba
- Clientes potenciales mejor calificados

### Enfoques híbridos

**Freemium + Prueba:**
- Nivel gratuito con funciones limitadas
- Prueba de funciones premium
- Ejemplo: Zoom (40 minutos gratis, prueba de Pro)

**Prueba inversa:**
- Comience con acceso completo
- Después de la prueba, baje al nivel gratuito
- Ejemplo: ver el valor de la prima, vivir con limitaciones hasta que esté listo

---

## Precios empresariales

### Cuándo agregar precios personalizados

Agregue "Contactar con Ventas" cuando:
- Los tamaños de las ofertas superan los $10.000+ ARR
- Los clientes necesitan contratos personalizados
- Se requiere implementación/incorporación
- Requisitos de seguridad/cumplimiento
- Procesos de adquisiciones involucrados

### Elementos del nivel empresarial

**Apuestas de mesa:**
- SSO/SAML
- Registros de auditoría
- Controles de administración
- SLA de tiempo de actividad
- Certificaciones de seguridad

**Valor agregado:**
- Soporte dedicado/éxito
- Incorporación personalizada
- Sesiones de entrenamiento
- Integraciones personalizadas
- Entrada de hoja de ruta prioritaria

### Estrategias de precios empresariales

**Por asiento a escala:**
- Descuentos por volumen para equipos grandes.
- Ejemplo: $15/usuario (estándar) → $10/usuario (100+)

**Tarifa de plataforma + uso:**
- Tarifa base de acceso
- Umbrales superiores basados en el uso
- Ejemplo: base de $500/mes + $0,01 por llamada API

**Contratos basados en valor:**
- Precio vinculado a los ingresos/resultados del cliente.
- Ejemplo: % de transacciones, participación en los ingresos