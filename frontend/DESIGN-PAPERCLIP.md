# Paperclip Dark Warm — Design System

**Version:** alpha · **Theme id:** `paperclip`

Primary visual anchor: **charcoal** `#141413` (page background, navbar). Typography: **Inter Tight** for display/nav, **Inter** for body, **JetBrains Mono** for code.

## Activation

- `data-theme="paperclip"` on `<html>`
- `data-theme="slash"` — midnight vault (copper accent)

Preference: `localStorage` key `auto-company-ui-theme`.

## Color tokens

| Token | Hex | Role |
|-------|-----|------|
| `--charcoal` | #141413 | Page background, header, sidebar |
| `--manila` | #f3e6c4 | Primary text, headings, CTA fill |
| `--stone-muted` | #9a958a | Secondary / muted text |
| `--dim-text` | #6a6560 | Placeholders, disabled |
| `--dark-surface` | #1f1d1a | Cards, inputs, elevated panels |
| `--dark-raised-surface` | #3a3836 | Raised cards, chips, hover |
| `--dark-border` | #2f2c28 | Borders, dividers |
| `--bond-white` | #ffffff | High-contrast on colored surfaces |
| `--amber-warning` | #e5a536 | Warning |
| `--green-success` | #22c55e | Success |

## Typography scale

| Role | Font | Size | Weight |
|------|------|------|--------|
| Hero / section | Inter Tight | 44.8px | 600 |
| Nav label | Inter Tight | 14.4px | 600 |
| Body | Inter | 16px | 400 / 500 |
| Small | Inter | 14.4px | 400 |
| Code | JetBrains Mono | 12px | 400 / 500 |
| CTA | Inter | 15.2px | 400 |

## Spacing & radii

8px base grid. Key tokens: `--space-xs` (8px) through `--space-section`. Radii: `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px, `--radius-pill` 9999px.

## Semantic bridge

Components use: `--background`, `--foreground`, `--primary`, `--card`, `--border`, `--muted-foreground`, `--font-sans`, `--font-display`.

Office and War Room scopes override via `html[data-theme="paperclip"]` blocks in `office-theme.css`, `office-encargos.css`, `war-room.css`.
