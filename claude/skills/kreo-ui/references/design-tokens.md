# Kreo Design Tokens — Resumen

Fuente autoritativa: `pull_design_md` vía MCP. Tema: **Kreo Luxury/Corporate**.

## Paleta core (dark default)

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | #C9A227 | Acciones, links, activo |
| `--primary-foreground` | #0A0A0A | Texto sobre primary |
| `--background` | #0A0A0A | Fondo página |
| `--foreground` | #F5F5F5 | Texto principal |
| `--card` | #141414 | Superficies |
| `--border` | #2A2A2A | Bordes |
| `--muted-foreground` | #A3A3A3 | Texto secundario |
| `--destructive` | #DC2626 | Errores |
| `--success` | #16A34A | Éxito |

Light mode: clase `.light` en `html`/`body`. Gold → #9A7B1A para contraste.

## Tipografía

- **Inter** (`--font-sans`) — UI general
- **JetBrains Mono** (`--font-mono`) — código
- **Playfair Display** (`--font-display`) — marketing headlines

## Spacing

`--spacing-xs` 4px · `--spacing-sm` 8px · `--spacing-md` 16px · `--spacing-lg` 24px · `--spacing-xl` 32px

## Radius

Usar variables, no Tailwind `rounded-*`:

- `--radius-sm` 4px — buttons, inputs
- `--radius-md` 8px — cards, tables
- `--radius-lg` 12px — dialogs

Ejemplo: `rounded-[var(--radius-md)]`

## Z-index

Solo tokens `--z-*`: dropdown 1000 → tooltip 1070.

## Reglas de implementación

1. CSS variables para todo — cero hardcode
2. Lucide React para iconos — no PrimeIcons
3. PrimeReact siempre `unstyled: true`
4. `cva` para variantes → mapear a tokens
5. `forwardRef` en todos los componentes
6. Estados loading / disabled / empty obligatorios
7. Sombras: `--shadow-sm` … `--shadow-lg`, premium: `--shadow-gold`

## Marketing theme

Landings PROTOTYPE: `context.brand.theme: "marketing-light"` + `output.storybook.embed.globals.theme: "marketing-light"`.
