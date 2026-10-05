# Global styles

Theme entry: `src/index.css` imports layered CSS in this order:

1. **letter-theme.css** — light editorial default
2. **stripe-hds-overrides.css** — Stripe HDS tweaks for letter
3. **paperclip-theme.css** — dark manila accent variant
4. **slash-theme.css** — dark luxe (copper/gilded), panels, KPI, hero-strip
5. **office-theme.css** — Office / War Room layouts
6. **office-encargos.css** — encargo detail surfaces
7. **war-room.css** — War Room session UI
8. **kreo-vars.css** — Kreo component token bridge
9. **command-center.css** — app shell ambient, `PageFrame`, stat-led bento KPI grid, command headers

## Command center (Inspo-aligned)

Brief: dark B2B AI operations console — **stat-led** KPIs, grotesk sans (Inter), warm accent on Slash/Paperclip.

- **`.app-viewport`** — wraps authenticated main; subtle radial ambient behind content
- **`.page-frame--*`** — shared max-widths (`--page-width-office` = 87.5rem)
- **`.page-header--command`** — display title + accent rule
- **`.command-stat-bento`** — 12-column KPI bento for dashboards
- **`.command-toolbar`** — glass filter bars (period, filters)

Use `PageFrame` + `PageHeader variant="command"` on Office and superadmin pages.
