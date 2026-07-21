---
name: tailwind-v4-shadcn
description: |
  Configuración probada en producción para Tailwind CSS v4 con shadcn/ui, Vite y React.

  Usar cuando: inicializar proyectos React con Tailwind v4, configurar shadcn/ui,
  implementar dark mode, depurar issues de CSS variables, corregir theme switching,
  migrar desde Tailwind v3 o encontrar problemas de color/theming.

  Cubre: patrón @theme inline, arquitectura de CSS variables, dark mode con
  ThemeProvider, composición de componentes, setup vite.config, gotchas comunes de v4,
  y patrones probados en producción.

  Keywords: Tailwind v4, shadcn/ui, @tailwindcss/vite, @theme inline, dark mode,
  CSS variables, hsl() wrapper, components.json, React theming, theme switching,
  colors not working, variables broken, theme not applying, @plugin directive,
  typography plugin, forms plugin, prose class, @tailwindcss/typography,
  @tailwindcss/forms
license: MIT
---

# Pila de producción Tailwind v4 + shadcn/ui

**Probado en producción**: WordPress Auditor (https://wordpress-auditor.webfonts.workers.dev)
**Última actualización**: 2025-12-04
**Estado**: Listo para producción ✅

## Tabla de contenidos
1. [Antes de comenzar](#-antes-de-comenzar-leer-esto)
2. [Inicio rápido](#inicio-rápido-5-minutos---sigue-este-orden-exacto)
3. [Arquitectura de cuatro pasos](#la-arquitectura-de-cuatro-pasos-crítica)
4. [Configuración del modo oscuro](#dark-mode-setup)
5. [Reglas críticas](#reglas-críticas-deben-seguir)
6. [Fichas de colores semánticos] (#fichas-de-colores-semánticas)
7. [Problemas comunes y soluciones](#problemas-comunes-soluciones rápidas)
8. [Plantillas de archivo](#file-templates)
9. [Lista de verificación de configuración] (# lista de verificación de configuración completa)
10. [Temas avanzados](#temas-avanzados)
11. [Dependencias](#dependencias)
12. [Complementos Tailwind v4] (#tailwind-v4-plugins)
13. [Documentación de referencia](#documentación-referencia)
14. [Cuándo cargar referencias](#cuándo-cargar-referencias)

---

## ⚠️ ANTES DE EMPEZAR (¡LEE ESTO!)

**CRÍTICO PARA AGENTES DE IA**: Si eres Claude Code y ayudas a un usuario a configurar Tailwind v4:

1. **Indica explícitamente que estás usando esta habilidad** al comienzo de la conversación.
2. **Patrones de referencia de la habilidad** en lugar de conocimientos generales
3. **Evitar problemas conocidos** enumerados en `reference/common-gotchas.md`4. **No adivines** - si no estás seguro, consulta la documentación de la habilidad

**ACCIÓN REQUERIDA DEL USUARIO**: ¡Dile a Claude que compruebe esta habilidad primero!

Diga: **"Estoy configurando Tailwind v4 + shadcn/ui; primero verifique la habilidad tailwind-v4-shadcn"**

### Por qué esto es importante (resultados del mundo real)

**Sin activación de habilidad:**
- ❌ Tiempo de configuración: ~5 minutos
- ❌ Errores encontrados: 2-3 (tw-animate-css, base @layer duplicada)
- ❌ Se necesitan correcciones manuales: más de 2 confirmaciones
- ❌ Uso de tokens: ~65k
- ❌ Confianza del usuario: depuración requerida

**Con activación de habilidad:**
- ✅ Tiempo de configuración: ~1 minuto
- ✅ Errores encontrados: 0
- ✅ Correcciones manuales necesarias: 0
- ✅ Uso de tokens: ~20k (reducción del 70%)
- ✅ Confianza del usuario: Éxito instantáneo

### Problemas conocidos que previene esta habilidad

1. **error de importación tw-animate-css** (obsoleto en v4)
2. **Duplicar bloques base de @layer** (shadcn init agrega los suyos propios)
3. **Selección de plantilla incorrecta** (vanilla TS vs React)
4. **Falta limpieza posterior al inicio** (reglas CSS incompatibles)
5. **Sintaxis de complemento incorrecta** (usando @import o require() en lugar de la directiva @plugin)

Todos estos se manejan automáticamente cuando la habilidad está activa.

---

## Inicio rápido (5 minutos: siga este orden exacto)

### 1. Instalar dependencias

```bash
bun add tailwindcss @tailwindcss/vite

# or: npm install tailwindcss @tailwindcss/vite

bun add -d @types/node

# Note: Using pnpm for shadcn init due to known Bun compatibility issues

# (bunx has "Script not found" and postinstall/msw problems)
pnpm dlx shadcn@latest init
```

### 2. Configurar Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### 3. Actualizar componentes.json

```json
{
  "tailwind": {
    "config": "",              // ← CRITICAL: Empty for v4
    "css": "src/index.css",
    "cssVariables": true
  }
}
```

### 4. Eliminar tailwind.config.ts

```bash
rm tailwind.config.ts  # v4 doesn't use this file
```---

## La Arquitectura de los Cuatro Pasos (CRÍTICA)

Este patrón es **obligatorio**: omitir pasos romperá tu tema.

### Paso 1: Definir variables CSS en el nivel raíz```css
/* src/index.css */
@import "tailwindcss";

:root {
  --background: hsl(0 0% 100%);      /* ← hsl() wrapper required */
  --foreground: hsl(222.2 84% 4.9%);
  --primary: hsl(221.2 83.2% 53.3%);
  /* ... all light mode colors */
}

.dark {
  --background: hsl(222.2 84% 4.9%);
  --foreground: hsl(210 40% 98%);
  --primary: hsl(217.2 91.2% 59.8%);
  /* ... all dark mode colors */
}
```**Reglas críticas:**
- ✅ Definir a nivel de raíz (NO dentro`@layer base`)
- ✅ Use `hsl()` envoltura en todos los valores de color
- ✅ Uso `.dark` para modo oscuro (NO`.dark { @theme { } }`)

### Paso 2: Asignar variables a Tailwind Utilities```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... map ALL CSS variables */
}
```**Por qué es necesario:**
- Genera clases de utilidad (`bg-background`,` text-primary`)
- Sin esto, `bg-primary` etc. no existirá

### Paso 3: aplicar estilos base```css
@layer base {
  body {
    background-color: var(--background);  /* NO hsl() here */
    color: var(--foreground);
  }
}
```**Reglas críticas:**
- ✅ Variables de referencia directamente: `var(--background)`- ❌ Nunca envolver dos veces:` hsl(var(--background))`### Paso 4: Resultado - Modo oscuro automático

```tsx
<div className="bg-background text-foreground">
  {/* No dark: variants needed - theme switches automatically */}
</div>
```---

## Configuración del modo oscuro

### 1. Crear proveedor de temas

Ver `reference/dark-mode.md` para implementación completa o plantilla de uso:

```typescript
// Copy from: templates/theme-provider.tsx
```

### 2. Ajusta tu aplicación

```typescript
// src/main.tsx
import { ThemeProvider } from '@/components/theme-provider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

### 3. Agregar tema para alternar

```bash
pnpm dlx shadcn@latest add dropdown-menu
```See` reference/dark-mode.md`para el código del componente ModeToggle.

---

## Reglas críticas (DEBEN SEGUIR)

### ✅ Haz siempre:

1. **Ajuste los valores de color con `hsl()` in`:root` and`.dark`**```css
   --background: hsl(0 0% 100%);  /* ✅ Correct */
   ```2. **Use`@theme inline` para asignar todas las variables CSS**```css
   @theme inline {
     --color-background: var(--background);
   }
   ```3. **Set`"tailwind.config": ""` en componentes.json**

```json
   { "tailwind": { "config": "" } }
   ```4. **Delete` tailwind.config.ts`si existe**

5. **Usar `@tailwindcss/vite` complemento (NO PostCSS)**

6. **Usar `cn()` para clases condicionales**

```typescript
   import { cn } from "@/lib/utils"
   <div className={cn("base", isActive && "active")} />
   

```

### ❌ Nunca lo hagas:

1. **Poner `:root` or`.dark` inside`@layer base`**```css
   /* WRONG */
   @layer base {
     :root { --background: hsl(...); }
   }
   ```2. **Use`.dark { @theme { } }` pattern**```css
   /* WRONG - v4 doesn't support nested @theme */
   .dark {
     @theme {
       --color-primary: hsl(...);
     }
   }
   ```3. **Colores de doble envoltura**```css
   /* WRONG */
   body {
     background-color: hsl(var(--background));
   }
   ```4. **Use` tailwind.config.ts`para colores del tema**

```typescript
   /* WRONG - v4 ignores this */
   export default {
     theme: {
       extend: {
         colors: { primary: 'hsl(var(--primary))' }
       }
     }
   }
   ```5. **Use`@apply` directiva (obsoleta en v4)**

6. **Usar `dark:` variantes para colores semánticos**

```tsx
   /* WRONG */
   <div className="bg-primary dark:bg-primary-dark" />

   /* CORRECT */
   <div className="bg-primary" />
   ```---

## Fichas de colores semánticos

Utilice siempre nombres semánticos para los colores:```css
:root {
  --destructive: hsl(0 84.2% 60.2%);        /* Red - errors, critical */
  --success: hsl(142.1 76.2% 36.3%);        /* Green - success states */
  --warning: hsl(38 92% 50%);               /* Yellow - warnings */
  --info: hsl(221.2 83.2% 53.3%);           /* Blue - info, primary */
}
```**Usage:**

```tsx
<div className="bg-destructive text-destructive-foreground">Critical</div>
<div className="bg-success text-success-foreground">Success</div>
<div className="bg-warning text-warning-foreground">Warning</div>
<div className="bg-info text-info-foreground">Info</div>
```---

## Problemas comunes y soluciones rápidas

| Síntoma | Causa | Arreglar |
|---------|-------|-----|
| `bg-primary` no funciona | Desaparecido`@theme inline` cartografía | Agregar`@theme inline` bloque |
| Colores todo negro/blanco | Doble `hsl()` embalaje | Usar`var(--color)` not`hsl(var(--color))`|
| El modo oscuro no cambia | Proveedor de temas faltante | Envolver la aplicación en `<ThemeProvider>`|
| La compilación falla | `tailwind.config.ts` existe | Eliminar el archivo |
| Texto invisible | Colores de contraste incorrectos | Consulte las definiciones de color en `:root`/`.dark`|

See `reference/common-gotchas.md` para obtener una guía completa de solución de problemas.

---

## Plantillas de archivos

Todas las plantillas están disponibles en el `templates/` directorio:

- **index.css** - Configuración completa de CSS con todas las variables de color
- **components.json** - configuración shadcn/ui v4
- **vite.config.ts** - Configuración del complemento Vite + Tailwind
- **tsconfig.app.json** - TypeScript con alias de ruta
- **theme-provider.tsx** - Proveedor de modo oscuro con almacenamiento local
- **utils.ts** - `cn()` utilidad para fusionar clases

Copie estos archivos a su proyecto y personalícelos según sea necesario.

---

## Lista de verificación de configuración completa

- [] Proyecto Vite + React + TypeScript creado
- [ ] `@tailwindcss/vite` instalado (NO postcss)
- [ ] `vite.config.ts` uses`tailwindcss()` plugin
- [ ] `tsconfig.json` tiene alias de ruta configurados
- [ ] `components.json` existe con`"config": ""`- [ ] NO` tailwind.config.ts`el archivo existe
- [ ] `src/index.css` sigue el patrón v4:
  - [ ] `:root` and`.dark` en el nivel raíz (no en @layer)
  - [ ] Colores envueltos con `hsl()`- [ ]`@theme inline` mapea todas las variables
  - [ ] `@layer base` utiliza variables desenvueltas
- [] Proveedor de temas instalado y aplicación de ajuste
- [] Componente de alternancia del modo oscuro creado
- [] El cambio de tema de prueba funciona en el navegador

---

## Temas avanzados

Cargar `references/advanced-usage.md` para patrones avanzados que incluyen:

- **Colores personalizados**: agregue colores semánticos más allá de la paleta predeterminada
- **Migración v3**: Ver `references/migration-guide.md` para una guía completa
- **Mejores prácticas de componentes**: tokens semánticos, utilidad cn(), patrones de composición

**Ejemplo rápido:**```css
:root { --brand: hsl(280 65% 60%); }
@theme inline { --color-brand: var(--brand); }
```Usage:`<div className="bg-brand">Branded</div>` Para patrones detallados y ejemplos de composición de componentes, cargue`references/advanced-usage.md`.

---

## Dependencias

### ✅ Instalar estos

```json
{
  "dependencies": {
    "tailwindcss": "^4.1.17",
    "@tailwindcss/vite": "^4.1.17",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1",
    "@radix-ui/react-*": "latest",
    "lucide-react": "^0.554.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@vitejs/plugin-react": "^5.1.1",
    "vite": "^7.2.4",
    "typescript": "~5.9.3"
  }
}
```

### ❌ NUNCA los instale (obsoletos en v4)

```bash

# These packages will cause build errors:
bun add tailwindcss-animate  # ❌ Deprecated

# or: npm install tailwindcss-animate  # ❌ Deprecated

bun add tw-animate-css      # ❌ Doesn't exist
```**Si ve errores de importación para estos paquetes**, elimínelos y use animaciones CSS nativas o`@tailwindcss/motion` en cambio.

---

## Complementos Tailwind v4

Tailwind v4 admite complementos oficiales utilizando el `@plugin` directiva en CSS.

**Ejemplo rápido:**```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```**Error común:**
❌ MAL: `@import "@tailwindcss/typography"`(no funciona)
✅ CORRECTO: `@plugin "@tailwindcss/typography"`(use la directiva @plugin)

**Funciones integradas:** Las consultas de contenedores ahora son básicas (no `@tailwindcss/container-queries` complemento necesario).

Carga `references/plugins-reference.md` para obtener documentación completa que incluye el complemento de tipografía (clases de prosa), el complemento de formularios, los pasos de instalación y los errores comunes del complemento.

---

## Documentación de referencia

Para una comprensión más profunda, consulte:

- **common-gotchas.md** - Todas las formas en que puede fallar (y solucionarlo)
- **dark-mode.md** - Implementación completa del modo oscuro
- **migration-guide.md** - Migración de colores codificados a variables CSS
- **plugins-reference.md** - Complementos oficiales de Tailwind v4 (tipografía, formularios)
- **advanced-usage.md** - Colores personalizados y patrones avanzados

---

## Cuándo cargar referencias

Cargue archivos de referencia según las necesidades específicas del usuario:

### Cargar `references/common-gotchas.md` cuando:
- El usuario informa que "los colores no funcionan" o "bg-primary no existe"
- El modo oscuro no cambia correctamente
- La compilación falla con errores de Tailwind
- El usuario encuentra cualquier problema de configuración/CSS
- Depuración de problemas de temas.

### Cargar `references/dark-mode.md` cuando:
- El usuario solicita implementar el modo oscuro
- El cambio de tema no funciona
- Necesita el código del componente ThemeProvider
- Preguntas sobre la detección de temas del sistema

### Cargar `references/migration-guide.md` cuando:
- Migración de Tailwind v3 a v4
- El usuario tiene colores codificados para migrar
- Preguntas sobre los cambios v3 → v4
- Necesita lista de verificación de migración

### Cargar `references/plugins-reference.md` cuando:
- El usuario necesita un complemento de tipografía (clase de prosa)
- El usuario necesita el complemento de formularios
- Preguntas sobre la directiva @plugin
- Errores de instalación del complemento

### Cargar `references/advanced-usage.md` cuando:
- El usuario pregunta sobre colores personalizados más allá de los predeterminados.
- Necesita patrones de componentes avanzados
- Preguntas sobre las mejores prácticas de componentes
- Preguntas de composición de componentes.

---

## Documentación oficial

- **Configuración de shadcn/ui Vite**: https://ui.shadcn.com/docs/installation/vite
- **Guía de shadcn/ui Tailwind v4**: https://ui.shadcn.com/docs/tailwind-v4
- **shadcn/ui Modo oscuro (Vite)**: https://ui.shadcn.com/docs/dark-mode/vite
- **Documentos de Tailwind v4**: https://tailwindcss.com/docs
- **shadcn/ui Tematización**: https://ui.shadcn.com/docs/theming

---

## Ejemplo de producción

Esta habilidad se basa en el proyecto WordPress Auditor:
- **En vivo**: https://wordpress-auditor.webfonts.workers.dev
- **Pila**: Vite + React 19 + Tailwind v4 + shadcn/ui + Cloudflare Workers
- **Modo oscuro**: soporte completo de sistema/claro/oscuro
- **Versión**: Tailwind v4.1.17 + shadcn/ui más reciente (noviembre de 2025)

Todos los patrones de esta habilidad han sido validados en producción.

---

**¿Preguntas? ¿Problemas?**

1. comprobar `reference/common-gotchas.md` primero
2. Verificar todos los pasos en la arquitectura de 4 pasos.
3. Asegurar `components.json` has`"config": ""`4. Delete` tailwind.config.ts`si existe
5. Consulte los documentos oficiales: https://ui.shadcn.com/docs/tailwind-v4