# Errores y soluciones comunes

## Fallos críticos (romperán tu construcción)

### 1. `:root` Inside`@layer base`❌ **WRONG:**```css
@layer base {
  :root {
    --background: hsl(0 0% 100%);
  }
}
```✅ **CORRECT:**```css
:root {
  --background: hsl(0 0% 100%);
}

@layer base {
  body {
    background-color: var(--background);
  }
}
```**Por qué:** Tailwind v4 elimina el CSS del exterior`@theme`/`@layer`, but`:root` debe estar a nivel de raíz.

---

### 2. Anidado `@theme` Directiva

❌ **MAL:**```css
@theme {
  --color-primary: hsl(0 0% 0%);
}

.dark {
  @theme {
    --color-primary: hsl(0 0% 100%);
  }
}
```✅ **CORRECT:**```css
:root {
  --primary: hsl(0 0% 0%);
}

.dark {
  --primary: hsl(0 0% 100%);
}

@theme inline {
  --color-primary: var(--primary);
}
```**Por qué:** Tailwind v4 no es compatible`@theme` Selectores internos.

---

### 3. Doble `hsl()` Envoltura

❌ **MAL:**```css
@layer base {
  body {
    background-color: hsl(var(--background));
  }
}
```✅ **CORRECT:**```css
@layer base {
  body {
    background-color: var(--background);  /* Already has hsl() */
  }
}
```**Por qué:** Las variables ya contienen` hsl()`, la doble envoltura crea` hsl(hsl(...))`.

---

### 4. Colores en `tailwind.config.ts`❌ **WRONG:**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))'
      }
    }
  }
}
```✅ **CORRECT:**

```typescript
// Delete tailwind.config.ts entirely OR leave it empty
export default {}

// components.json
{
  "tailwind": {
    "config": ""  // ← Empty string
  }
}
```**Por qué:** Tailwind v4 ignora por completo` theme.extend.colors`.

---

### 5. Missing `@theme inline` Mapeo

❌ **MAL:**```css
:root {
  --background: hsl(0 0% 100%);
}

/* No @theme inline block */
```Result:` bg-background`la clase no existe

✅ **CORRECTO:**```css
:root {
  --background: hsl(0 0% 100%);
}

@theme inline {
  --color-background: var(--background);
}
```**Why:**`@theme inline` genera las clases de utilidad.

---

## Errores de configuración

### 6. Configuración de componentes.json incorrecta

❌ **MAL:**

```json
{
  "tailwind": {
    "config": "tailwind.config.ts"  // ← No!
  }
}
```✅ **CORRECT:**

```json
{
  "tailwind": {
    "config": ""  // ← Empty for v4
  }
}
```---

### 7. Uso de PostCSS en lugar del complemento Vite

❌ **MAL:**

```typescript
// vite.config.ts
export default defineConfig({
  css: {
    postcss: './postcss.config.js'  // Old v3 way
  }
})
```✅ **CORRECT:**

```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()]  // v4 way
})
```---

### 8. Faltan alias de ruta

❌ **MAL:**

```typescript
// tsconfig.json has no paths
import { Button } from '../../components/ui/button'
```✅ **CORRECT:**

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
``

```typescript
import { Button } from '@/components/ui/button'
```---

## Errores del sistema de color

### 9. Usando `dark:` Variantes de colores semánticos

❌ **MAL:**

```tsx
<div className="bg-primary dark:bg-primary-dark" />
```✅ **CORRECT:**

```tsx
<div className="bg-primary" />
```**Por qué:** Con la configuración adecuada de variables CSS,` bg-primary`responde automáticamente al tema.

---

### 10. Valores de color codificados

❌ **MAL:**

```tsx
<div className="bg-blue-600 dark:bg-blue-400" />
```✅ **CORRECT:**

```tsx
<div className="bg-primary" />  {/* Or bg-info, bg-success, etc. */}
```**Por qué:** Los tokens semánticos permiten cambiar de tema y reducir la repetición.

---

## Problemas con los componentes

### 11. Desaparecido `cn()` Utilidad

❌ **MAL:**

```tsx
<div className={ `base ${isActive && 'active'}`} />
```✅ **CORRECT:**

```tsx
import { cn } from '@/lib/utils'
<div className={cn("base", isActive && "active")} />
```**Why:**` cn()`fusiona y deduplica adecuadamente las clases de Tailwind.

---

### 12. Cadena vacía en Radix Select

❌ **MAL:**

```tsx
<SelectItem value="">Select an option</SelectItem>
```✅ **CORRECT:**

```tsx
<SelectItem value="placeholder">Select an option</SelectItem>
```**Por qué:** Radix UI Select no permite valores de cadena vacíos.

---

## Errores de instalación

### 13. Paquete de viento de cola incorrecto

❌ **MAL:**

```bash
npm install tailwindcss@^3.4.0  # v3
```✅ **CORRECT:**

```bash
npm install tailwindcss@^4.1.0  # v4
npm install @tailwindcss/vite
```---

### 14. Dependencias faltantes

❌ **MAL:**

```json
{
  "dependencies": {
    "tailwindcss": "^4.1.0"
    // Missing @tailwindcss/vite
  }
}
```✅ **CORRECT:**

```json
{
  "dependencies": {
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.0"
  }
}
```---

### 17. Error de importación de tw-animate-css (PROBLEMA DEL MUNDO REAL)

❌ **MAL:**

```bash
npm install tailwindcss-animate  # Deprecated package
`````css
@import "tw-animate-css";  # Package doesn't exist in v4
```✅ **CORRECT:**

```bash

# Don't install tailwindcss-animate at all

# Use native CSS animations or @tailwindcss/motion
```**Why:**
- `tailwindcss-animate` está en desuso en Tailwind v4
- Provoca errores de importación durante la compilación.
- Es posible que los documentos shadcn/ui aún hagan referencia a él (obsoleto)
- La habilidad maneja las animaciones de manera diferente en v4.

**Impacto:** Error de compilación; requiere limpieza manual del archivo CSS

---

### 18. Duplicar la base de @layer después de shadcn init (PROBLEMA DEL MUNDO REAL)

❌ **MAL:**```css
/* After running shadcn init, you might have: */
@layer base {
  body {
    background-color: var(--background);
  }
}

@layer base {  /* ← Duplicate added by shadcn init */
  * {
    border-color: hsl(var(--border));
  }
}
```✅ **CORRECT:**```css
/* Merge into single @layer base block */
@layer base {
  * {
    border-color: var(--border);
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
  }
}
```**Why:**
- `shadcn init` agrega el suyo`@layer base` bloquear
- Resultados en declaraciones de capas duplicadas
- Puede causar problemas inesperados de prioridad de CSS
- Fácil de pasar por alto durante la configuración

**Prevención:**
- comprobar `src/index.css` inmediatamente después de correr`shadcn init`- Fusionar cualquier duplicado`@layer base` bloques
- Mantenga solo una sección de la capa base

**Impacto:** Problemas de prioridad de CSS, problemas de estilo más difíciles de depurar

---

## Problemas de prueba

### 15. No probar ambos temas

❌ **MAL:**
Solo probando en modo ligero

✅ **CORRECTO:**
Prueba en:
- Modo de luz
- Modo oscuro
- Modo del sistema
- Tanto la carga inicial como la alternancia

---

### 16. No comprobar el contraste

❌ **MAL:**
Los colores se ven bien pero fallan WCAG

✅ **CORRECTO:**
- Utilice el navegador DevTools Lighthouse
- Verifique las relaciones de contraste (mínimo 4,5:1)
- Prueba con usuarios reales.

---

## Diagnóstico rápido

**Síntomas → Causa probable:**

| Síntoma | Causa probable |
|---------|-------------|
| `bg-primary` no funciona | Desaparecido`@theme inline` cartografía |
| Colores todo negro/blanco | Doble `hsl()` embalaje |
| El modo oscuro no cambia | Proveedor de temas faltante |
| La compilación falla | `tailwind.config.ts` existe con la configuración del tema |
| Texto invisible | Colores de contraste incorrectos |
| `@/` las importaciones fracasan | Faltan alias de ruta en tsconfig |

---

## Lista de verificación de prevención

Antes de implementar:
- [ ] No `tailwind.config.ts` archivo (o está vacío)
- [ ] `components.json` has`"config": ""`- [] Todos los colores tienen` hsl()`envoltorio en`:root`- [ ]`@theme inline` mapea todas las variables
- [ ] `@layer base` no se envuelve`:root`- [] El proveedor de temas envuelve la aplicación
- [] Probado tanto en modo claro como oscuro
- [] Todo el texto tiene suficiente contraste.