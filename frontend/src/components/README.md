# Frontend components

UI built with **Kreo registry components** styled via the **Paperclip Dark Warm** design system (`../DESIGN-PAPERCLIP.md`).

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Atoms | `atoms/` | Button, InputText, Badge, Skeleton, StatusPill |
| Molecules | `molecules/` | Card, PageHeader, EmptyState, StatsCard, Sonner (toast) |
| Ops | `ops/` | `OpsFlowStepper` — company phase pipeline on `/ops` |
| War room | `war-room/` | `WarRoomContent` — tactical agent table on `/war-room/:productId` |
| Office | `office/` | `OfficeSpendWidget` — sidebar spend bar; main UI in `OfficePage` |
| App wrappers | `ui/` | Stable imports for pages (`import Button from "../components/ui/Button"`) |
| Shared widgets | `ModelAutocomplete.tsx` | Model picker (OpenRouter / TokenLab / Replicate); admin or tenant catalog |
| Shared widgets | `AgentModelFields.tsx` | Per-agent LLM config: provider (inherit or explicit), model kind, model ID |
| Shared widgets | `ThemeSwitcher.tsx` | Stripe HDS Light / Paperclip Warm / Slash theme selector |
| Layout | `AppLayout.tsx` | Authenticated shell: sidebar + top bar + content |
| Layout | `AppSidebar.tsx` | Oficina + **Oficina de depuración** (sección colapsable) + **Catálogo IA** (grupo colapsable) |
| Layout | `AppHeader.tsx` | Fixed top bar (tenant, theme, language, logout); solid at top, translucent + blur on scroll |

## Themes

Stripe HDS Light (`letter`, default), Paperclip Warm (`paperclip`), and Slash — see `frontend/DESIGN.md`.

## Import convention

- **Pages:** continue importing from `components/ui/*`
- **New Kreo usage:** import from `@/components/atoms/*` or `@/components/molecules/*`
- **Utilities:** `@/lib/utils` (`cn()`)

## Theme variants

- **Card `tint`:** `none` | `peach` | `mint` | `lavender` | `mist`
- **Button variants (Kreo):** `default` (manila), `violet`, `blue`, `secondary`, `outline`, `ghost`, `destructive`, `link`

## Toast notifications

- **`molecules/Sonner.tsx`** — Kreo `Sonner` wrapper (`toast.success` / `toast.error`). `<Toaster />` is mounted once in `App.tsx`.
- Use for save feedback and other non-blocking messages instead of inline `<p>` at the top of long forms.

## Dependencies

- `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`
