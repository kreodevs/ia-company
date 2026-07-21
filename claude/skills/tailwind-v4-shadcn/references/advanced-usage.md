# Patrones de uso avanzados

**Propósito**: Personalización avanzada y patrones de componentes para desarrolladores experimentados de Tailwind v4 + shadcn/ui
**Cuándo cargar**: el usuario solicita colores personalizados más allá de los valores predeterminados, patrones de componentes avanzados, mejores prácticas de composición o personalización de componentes.

---

## Colores personalizados

Agregue nuevos colores semánticos más allá de la paleta predeterminada:```css
:root {
  --brand: hsl(280 65% 60%);
  --brand-foreground: hsl(0 0% 100%);
}

.dark {
  --brand: hsl(280 75% 70%);
  --brand-foreground: hsl(280 20% 10%);
}

@theme inline {
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
}
```**Usage:**

```tsx
<div className="bg-brand text-brand-foreground">Branded Component</div>
```**Patrón clave**: Defina la variable CSS en`:root`/`.dark`, luego referencia en`@theme inline` with`--color-` prefijo.

---

## Migración desde Tailwind v3

Para conocer los pasos completos de migración v3 → v4, consulte`references/migration-guide.md`.

**Resumen rápido**:
- Quitar `tailwind.config.js`(v4 usa configuración CSS)
- Convertir colores codificados en variables CSS
- Actualizar la sintaxis del complemento: `require('tailwindcss/plugin')(plugin)` en configuración v3 →`@plugin "plugin-name"` en CSS
- Cambiar el complemento Vite: `require('tailwindcss')` or`import tailwindcss from 'tailwindcss'` in v3 →`import tailwindcss from '@tailwindcss/vite'` en v4

---

## Mejores prácticas de componentes

### 1. Utilice siempre tokens semánticos

** ✅ CORRECTO: **

```tsx
<Button variant="destructive">Delete</Button>
```**❌ WRONG:**

```tsx
<Button className="bg-red-600">Delete</Button>
```**Por qué**: tokens semánticos (` destructive`,` primary`,` secondary`) adaptarse a los cambios de tema. Los colores codificados rompen el modo oscuro y la personalización del tema.

---

### 2. Uso `cn()` para estilo condicional

**Importar:**

```tsx
import { cn } from "@/lib/utils"
```**Usage:**

```tsx
<div className={cn(
  "base-class",
  isActive && "active-class",
  hasError && "error-class"
)} />
```**What` cn()`hace**: fusiona las clases de Tailwind de forma inteligente (las clases posteriores anulan las anteriores).

---

### 3. Componer componentes shadcn/ui

**Patrón:**

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```**Concepto clave**: Utilice composición (componentes envolventes) en lugar de personalización (pasando accesorios).

---

## Patrones avanzados

### Variables de tema condicionales

Aplicar diferentes variables según el estado:

```tsx
<div className={cn(
  "rounded-lg p-4",
  variant === "success" && "bg-success text-success-foreground",
  variant === "error" && "bg-destructive text-destructive-foreground"
)} />
```

### Fichas de radio personalizadas

Agregar radio de borde semántico:```css
@theme inline {
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
}
```Usage:` className="rounded-[var(--radius-lg)]"`### Patrón de variantes de componentes

uso `cva()` from`class-variance-authority` para variantes complejas:

```tsx
import { cva } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```---

## Recursos oficiales

- Documentos de Tailwind v4: https://tailwindcss.com/blog/tailwindcss-v4-beta
- shadcn/ui: https://ui.shadcn.com
- autoridad de variación de clase: https://cva.style/docs