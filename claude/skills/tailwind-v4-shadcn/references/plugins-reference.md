# Referencia de complementos de Tailwind v4

**Propósito**: Guía completa de los complementos oficiales de Tailwind v4 (Tipografía, Formularios)
**Cuándo cargar**: el usuario menciona una clase de prosa, un complemento de tipografía, un complemento de formularios, una directiva @plugin o errores de instalación del complemento.

---

## Descripción general

Tailwind v4 admite complementos oficiales utilizando el `@plugin` directiva en CSS (no el enfoque del archivo de configuración v3).

---

## Complementos oficiales (Tailwind Labs)

### Complemento de tipografía: descuento de estilo/contenido CMS

**Cuándo usarlo:** Mostrar publicaciones de blog, documentación o cualquier HTML de Markdown/CMS.

**Instalación:**

```bash
bun add -d @tailwindcss/typography

# or: npm install -D @tailwindcss/typography
```**Configuración (sintaxis v4):**```css
/* src/index.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```**Usage:**```html
<article class="prose lg:prose-xl dark:prose-invert">
  {{ markdown_content }}
</article>
```**Clases disponibles:**
- `prose`- Estilos de tipografía base.
-`prose-sm`,` prose-base`,` prose-lg`,` prose-xl`,` prose-2xl`- Variantes de tamaño
- `dark:prose-invert`- Estilos de modo oscuro

---

### Complemento de formularios: restablecer estilos de elementos de formulario

**Cuándo usarlo:** Crear formularios personalizados sin componentes shadcn/ui, o necesita un estilo de formulario consistente en todos los navegadores.

**Instalación:**

```bash
bun add -d @tailwindcss/forms

# or: npm install -D @tailwindcss/forms
```**Configuración (sintaxis v4):**```css
/* src/index.css */
@import "tailwindcss";
@plugin "@tailwindcss/forms";
```**Qué hace:**
- Restablece los estilos de formulario predeterminados del navegador
- Hace que los elementos del formulario sean estilizables con las utilidades Tailwind
- Corrige inconsistencias entre navegadores para entradas, selecciones, casillas de verificación y radios.

**Nota:** Menos crítico para los usuarios de shadcn/ui (tienen componentes de formulario prediseñados), pero sigue siendo útil para formularios básicos.

---

## Errores comunes de complementos

Estos errores ocurren cuando se usa la sintaxis v3 en proyectos v4:

### Error 1: uso de la sintaxis del archivo de configuración v3

**❌ INCORRECTO (sintaxis del archivo de configuración v3):**```js
// tailwind.config.js
module.exports = {
  plugins: [require('@tailwindcss/typography')]
}
```**Por qué falla**: Tailwind v4 no utiliza` tailwind.config.js`para complementos.

** ✅ CORRECTO (directiva @plugin v4): **```css
/* src/index.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```---

### Error 2: usar @import en lugar de @plugin

**❌ MAL (@import en lugar de @plugin):**```css
@import "@tailwindcss/typography";  /* Doesn't work */
```**Por qué falla**: Los complementos deben cargarse con`@plugin`, not`@import`.

**✅ CORRECT:**```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```---

## Múltiples complementos

Cargue múltiples complementos agregando múltiples `@plugin` directivas:```css
/* src/index.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```**El orden importa**: Importe tailwindcss primero, luego los complementos.

---

## Documentación oficial

- Tipografía: https://tailwindcss.com/docs/typography-plugin
- Formularios: https://tailwindcss.com/docs/plugins#official-plugins
- Sistema de complementos Tailwind v4: https://tailwindcss.com/blog/tailwindcss-v4-beta#css-first-configuration