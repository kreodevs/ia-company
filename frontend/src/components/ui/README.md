# UI primitives

Thin **compatibility adapters** over Kreo UI (`atoms/`, `molecules/`, `organisms/`). Pages and feature modules import from here so APIs stay stable while the design system evolves.

## Kreo-backed adapters

| Component | Kreo source | Notes |
|-----------|-------------|--------|
| `Button` | `atoms/Button` | Maps `primary` → `default` variant |
| `Input` | `atoms/InputText` | |
| `Select` | `atoms/Select` (Radix) | String `value` / `onChange` API |
| `Badge` | `atoms/Badge` | |
| `Card` | `molecules/Card` | |
| `Panel` | `molecules/Card` | Keeps `app-panel-*` layout classes |
| `PageHeader` | `molecules/PageHeader` | |
| `AuthPageShell` | — | Centered auth layout (login, setup, password recovery) |
| `PageLoading` | `atoms/Skeleton` | |
| `EmptyState` | `molecules/EmptyState` | |
| `StatCard` | `molecules/StatsCard` | |
| `KpiCard` | `organisms/DashboardKPI` | Sparkline + trend |
| `StatusPill` | `atoms/StatusPill` | Domain status → Kreo semantic via `kreo-status-map.ts` |
| `StatusBadge` | `atoms/StatusPill` | Run status mapping |
| `ConfirmDialog` | `molecules/Dialog` (`AlertDialog`) | |
| `Breadcrumbs` | `atoms/Breadcrumb` | React Router `to` links |
| `TabsBar` | Radix tabs + Kreo underline tokens | Header-only tabs; optional `sticky` for long settings pages |
| `MermaidDiagram` | `molecules/MermaidDiagram` | Prop `chart` → `code` |

## App-specific (not Kreo)

| Component | Purpose |
|-----------|---------|
| `ProductActionsMenu` | Product lifecycle actions |
| `MarkdownView` / `MarkdownPreview` / `RichMarkdownView` | Read-only markdown (react-markdown) |
| `MarkdownChartBlock` | Chart blocks inside markdown |

Org OS uses Kreo **DynamicForm** and **DataTable** directly under `components/org/`.

Global styles: `src/index.css`, `src/styles/kreo-vars.css` (supplemental aliases only — themes own palette).

Kreo stack: Radix UI + TanStack Table + react-day-picker under `atoms/`, `molecules/`, `organisms/` (registry v5.3, no PrimeReact).
