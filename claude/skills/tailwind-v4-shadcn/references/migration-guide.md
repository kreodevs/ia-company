# Guía de migración: colores codificados → Variables CSS

## Descripción general

Esta guía le ayuda a migrar desde colores Tailwind codificados (`bg-blue-600`) a variables CSS semánticas (` bg-primary`).

**Beneficios:**
- Soporte automático de modo oscuro
- Uso constante del color
- Fuente única de verdad.
- Fácil personalización del tema
- Mejor accesibilidad

---

## Mapeo de colores semánticos

| Color codificado | Variables CSS | Caso de uso |
|----------|--------------|----------|
| `bg-red-*`/` text-red-*`|` bg-destructive`/` text-destructive`| Problemas críticos, errores, acciones de eliminación |
| `bg-green-*`/` text-green-*`|` bg-success`/` text-success`| Estados de éxito, métricas positivas |
| `bg-yellow-*`/` text-yellow-*`|` bg-warning`/` text-warning`| Advertencias, problemas moderados |
| `bg-blue-*`/` text-blue-*`|` bg-info`or` bg-primary`| Cuadros informativos, acciones primarias |
| `bg-gray-*`/` text-gray-*`|` bg-muted`/` text-muted-foreground`| Fondos, texto secundario |
| `bg-purple-*`|` bg-info`| Eliminar: use azul en su lugar |
| `bg-orange-*`|` bg-warning`| Eliminar: use amarillo en su lugar |
| `bg-emerald-*`|` bg-success`| Eliminar: use verde en su lugar |

---

## Patrones de migración

### Patrón 1: Fondos sólidos

❌ **Antes:**

```tsx
<div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
```✅ **After:**

```tsx
<div className="bg-info/10 text-info">
```**Note:**`/10` crea un 10% de opacidad

---

### Patrón 2: Bordes

❌ **Antes:**

```tsx
<div className="border-2 border-green-200 dark:border-green-800">
```✅ **After:**

```tsx
<div className="border-2 border-success/30">
```---

### Patrón 3: colores del texto

❌ **Antes:**

```tsx
<span className="text-red-600 dark:text-red-400">
```✅ **After:**

```tsx
<span className="text-destructive">
```---

### Patrón 4: Iconos

❌ **Antes:**

```tsx
<AlertCircle className="text-yellow-500" />
```✅ **After:**

```tsx
<AlertCircle className="text-warning" />
```---

### Patrón 5: Degradados

❌ **Antes:**

```tsx
<div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
```✅ **After:**

```tsx
<div className="bg-gradient-to-r from-success/10 to-success/20">
```---

## Migración paso a paso

### Paso 1: Agregar colores semánticos a CSS```css
/* src/index.css */
:root {
  /* Add these if not already present */
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(210 40% 98%);
  --success: hsl(142.1 76.2% 36.3%);
  --success-foreground: hsl(210 40% 98%);
  --warning: hsl(38 92% 50%);
  --warning-foreground: hsl(222.2 47.4% 11.2%);
  --info: hsl(221.2 83.2% 53.3%);
  --info-foreground: hsl(210 40% 98%);
}

.dark {
  --destructive: hsl(0 62.8% 30.6%);
  --destructive-foreground: hsl(210 40% 98%);
  --success: hsl(142.1 70.6% 45.3%);
  --success-foreground: hsl(222.2 47.4% 11.2%);
  --warning: hsl(38 92% 55%);
  --warning-foreground: hsl(222.2 47.4% 11.2%);
  --info: hsl(217.2 91.2% 59.8%);
  --info-foreground: hsl(222.2 47.4% 11.2%);
}

@theme inline {
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
}
```

### Paso 2: buscar colores codificados

```bash

# Search for background colors
grep -r "bg-\(red\|yellow\|blue\|green\|purple\|orange\|pink\|emerald\)-[0-9]" src/

# Search for text colors
grep -r "text-\(red\|yellow\|blue\|green\|purple\|orange\|pink\|emerald\)-[0-9]" src/

# Search for border colors
grep -r "border-\(red\|yellow\|blue\|green\|purple\|orange\|pink\|emerald\)-[0-9]" src/
```

### Paso 3: Reemplazar componente por componente

Comience con componentes de alto impacto:
1. Botones
2. Insignias
3. Cuadros de alerta
4. Indicadores de estado
5. Tarjetas

### Paso 4: Pruebe ambos temas

Después de cada componente:
- [] Verifique la apariencia del modo de luz
- [] Verifique la apariencia del modo oscuro
- [] Verificar el contraste del texto
- [] Prueba de estados flotantes/activos

---

## Ejemplo: componente de insignia

❌ **Antes:**

```tsx
const severityConfig = {
  critical: {
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  warning: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  info: {
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  }
}
```✅ **After:**

```tsx
const severityConfig = {
  critical: {
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
  },
  warning: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  info: {
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/20',
  }
}
```---

## Lista de verificación de pruebas

Después de la migración:
- [] Todos los niveles de gravedad (crítico/advertencia/información) visualmente distintos
- [] El texto tiene el contraste adecuado tanto en el modo claro como en el oscuro.
- [] No quedan clases de color codificadas
- [] Los estados de desplazamiento funcionan correctamente
- [] Los degradados se renderizan sin problemas
- [] Los iconos son visibles y coloreados correctamente
- [] Los bordes son visibles
- [] Sin regresiones visuales

---

## Comandos de verificación

```bash

# Should return 0 results when migration complete
grep -r "text-red-[0-9]" src/components/
grep -r "bg-blue-[0-9]" src/components/
grep -r "border-green-[0-9]" src/components/

# Verify semantic colors are used
grep -r "bg-destructive" src/components/
grep -r "text-success" src/components/
```---

## Impacto en el rendimiento

**Antes:** Cada componente tiene `dark:` variantes

```tsx
<div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
```**Después:** Clase única, CSS maneja el cambio

```tsx
<div className="bg-info/10 text-info border-info/30">
```**Resultado:**
- 60% menos clases de CSS en marcado
- Carga útil HTML más pequeña
- Representación más rápida
- Más fácil de mantener

---

## Errores comunes

### 1. Olvidar el mapa en @theme en línea

Variables definidas en `:root` pero no mapeado → las utilidades no existen

### 2. Sintaxis de opacidad incorrecta

❌ `bg-success-10`(no funciona)
✅ `bg-success/10`(correcto)

### 3. Enfoques combinados

No mezcle codificación rígida y semántica en el mismo componente: elija un enfoque.

### 4. No probar el modo oscuro

Pruebe siempre ambos temas durante la migración.

---

## Plan de reversión

Si la migración causa problemas:

1. Mantenga los componentes originales en el historial de git
2. Utilice indicadores de funciones para alternar un nuevo tema
3. Pruebe primero con un subconjunto de usuarios
4. Tener seguimiento de las regresiones visuales.

---

## Mayor personalización

Después de la migración, puedes fácilmente:
- Agregar nuevos colores semánticos
- Crear variantes de tema (alto contraste, etc.)
- Admite múltiples temas de marca
- Implementar esquemas de color seleccionables por el usuario

Todo mediante la edición de variables CSS: ¡no se necesitan cambios en los componentes!