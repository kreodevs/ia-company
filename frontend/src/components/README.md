# Frontend components

UI built with **Kreo registry components** styled via the **Letter** design system (`../DESIGN.md`).

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Atoms | `atoms/` | Button, InputText, Badge, Skeleton, StatusPill |
| Molecules | `molecules/` | Card, PageHeader, EmptyState, StatsCard, Sonner (toast) |
| Ops | `ops/` | `OpsFlowStepper` — company phase pipeline on `/ops` |
| War room | `war-room/` | `WarRoomContent` — tactical agent table on `/war-room/:productId` |
| App wrappers | `ui/` | Stable imports for pages (`import Button from "../components/ui/Button"`) |
| Shared widgets | `ModelAutocomplete.tsx` | Platform default model picker (OpenRouter / TokenLab); uses semantic `--color-*` tokens for both themes |
| Shared widgets | `ThemeSwitcher.tsx` | Letter (light) / Slash (dark) theme selector |
| Layout | `AppLayout.tsx` | Authenticated shell: sidebar + top bar + content |
| Layout | `AppSidebar.tsx` | Collapsible navigation (desktop) / drawer (mobile) |
| Layout | `AppHeader.tsx` | Top bar: tenant, theme, language, logout |

## Themes

Letter (light) and Slash (dark) — see `frontend/DESIGN.md`.

## Import convention

- **Pages:** continue importing from `components/ui/*`
- **New Kreo usage:** import from `@/components/atoms/*` or `@/components/molecules/*`
- **Utilities:** `@/lib/utils` (`cn()`)

## Letter variants

- **Card `tint`:** `none` | `peach` | `mint` | `lavender` | `mist`
- **Button variants (Kreo):** `default` (teal), `violet`, `blue`, `secondary`, `outline`, `ghost`, `destructive`, `link`

## Toast notifications

- **`molecules/Sonner.tsx`** — Kreo `Sonner` wrapper (`toast.success` / `toast.error`). `<Toaster />` is mounted once in `App.tsx`.
- Use for save feedback and other non-blocking messages instead of inline `<p>` at the top of long forms.

## Dependencies

- `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`
