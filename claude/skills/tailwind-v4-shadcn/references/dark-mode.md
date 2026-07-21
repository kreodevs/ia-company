# Implementación del modo oscuro

## Descripción general

El modo oscuro Tailwind v4 + shadcn/ui requiere:
1. `ThemeProvider` componente para gestionar el estado
2. `.dark` cambio de clase activado`<html>` elemento
3. persistencia del almacenamiento local
4. Detección de temas del sistema

---

## Componente ThemeProvider

### Implementación completa

```typescript
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    } catch (e) {
      return defaultTheme
    }
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem(storageKey, theme)
      } catch (e) {
        console.warn('Storage unavailable')
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
```

### Envuelve tu aplicación

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
```---

## Componente de alternancia de tema

### Usando el menú desplegable shadcn/ui

```bash
pnpm dlx shadcn@latest add dropdown-menu
``

```typescript
// src/components/mode-toggle.tsx
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```---

## Cómo funciona

### Flujo del tema

```
User selects theme → setTheme() called
  ↓
Save to localStorage
  ↓
Update state
  ↓
useEffect triggers
  ↓
Remove existing classes (.light, .dark)
  ↓
Add new class to <html>
  ↓
CSS variables update (.dark overrides :root)
  ↓
UI updates automatically
```

### Detección de temas del sistema

```typescript
if (theme === 'system') {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
    .matches ? 'dark' : 'light'
  root.classList.add(systemTheme)
}
```Esto respeta la preferencia del sistema operativo del usuario cuando se selecciona "Sistema".

---

## Problemas comunes

### Problema: el modo oscuro no cambia

**Causa:** El proveedor del tema no ajusta la aplicación
**Solución:** Asegurar `<ThemeProvider>` envuelve tu aplicación en`main.tsx`### Problema: el tema se restablece al actualizar la página

**Causa:** el almacenamiento local no funciona
**Solución:** Verifique la configuración de privacidad del navegador, agregue respaldo de almacenamiento de sesión

### Problema: Flash de un tema incorrecto al cargar

**Causa:** Tema aplicado después del renderizado inicial.
**Solución:** Agregar secuencia de comandos en línea a `index.html`(avanzado)

### Problema: los iconos no cambian

**Causa:** Las transiciones CSS no funcionan
**Solución:** Verificar el uso de clases de íconos `dark:` variantes para animaciones

---

## Lista de verificación de pruebas

- [] El modo de luz se muestra correctamente
- [] El modo oscuro se muestra correctamente
- [] El modo del sistema respeta la configuración del sistema operativo
- [] El tema persiste después de actualizar la página.
- [] El componente de alternancia muestra el estado actual
- [] Todo el texto tiene el contraste adecuado.
- [] No aparece ningún tema incorrecto al cargar
- [] Funciona en modo incógnito (retroceso elegante)

---

## Documentación oficial

- Modo oscuro shadcn/ui (Vite): https://ui.shadcn.com/docs/dark-mode/vite
- Modo oscuro Tailwind: https://tailwindcss.com/docs/dark-mode