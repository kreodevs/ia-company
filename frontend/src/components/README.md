# Frontend components

UI built with **Kreo registry components** styled via the **Letter** design system (`../DESIGN.md`).

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Atoms | `atoms/` | Button, InputText, Badge, Skeleton, StatusPill |
| Molecules | `molecules/` | Card, PageHeader, EmptyState, StatsCard |
| App wrappers | `ui/` | Stable imports for pages (`import Button from "../components/ui/Button"`) |
| Shared widgets | `ModelAutocomplete.tsx` | Platform default model picker (OpenRouter / TokenLab) |

## Import convention

- **Pages:** continue importing from `components/ui/*`
- **New Kreo usage:** import from `@/components/atoms/*` or `@/components/molecules/*`
- **Utilities:** `@/lib/utils` (`cn()`)

## Letter variants

- **Card `tint`:** `none` | `peach` | `mint` | `lavender` | `mist`
- **Button variants (Kreo):** `default` (teal), `violet`, `blue`, `secondary`, `outline`, `ghost`, `destructive`, `link`

## Dependencies

- `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
