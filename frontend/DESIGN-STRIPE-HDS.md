# Stripe HDS Light — Design System

**Version:** alpha · **Theme id:** `letter` (default)

Light palette anchored on **pale background** `#f8fafd` with **Stripe indigo** `#533afd` for primary actions. Typography uses Inter as a stand-in for sohne-var / SF Pro Display.

## Activation

- `data-theme="letter"` on `<html>` — Stripe HDS Light (**default** for new users)
- Preference: `localStorage` key `auto-company-ui-theme`

## Color tokens

| Token | Hex | Role |
|-------|-----|------|
| `--pale-background` | #f8fafd | Page background |
| `--surface-white` | #ffffff | Cards, header, inputs |
| `--deep-navy` | #061b31 | Headings, primary text |
| `--slate-body` | #50617a | Body, nav links |
| `--subdued-heading` | #64748d | Muted labels |
| `--stripe-indigo` | #533afd | Primary CTA, links, focus ring |
| `--stripe-orange` | #ff6118 | Accent / warning CTA |
| `--brand-lavender` | #7f7dfc | Secondary brand tint |
| `--quiet-surface` | #e5edf5 | Borders, dividers |
| `--dark-slate` | #273951 | Form labels |

## Typography

| Role | Size | Weight |
|------|------|--------|
| Hero | 44px | 300 |
| Section | 26px | 300 |
| Sub-section | 22px | 300 |
| Body | 16px | 400 / 300 |
| Label | 14px | 400 |
| Caption | 11px | 300 |
| Micro | 10px | 400 |

## Radii & shadows

Radii: 4px sm → 16px xl cards. Shadows: `--shadow-sm-bottom` through `--shadow-xl-diffuse` (evidence-backed).

## Semantic bridge

`--primary`, `--background`, `--foreground`, `--card`, `--border`, `--font-sans`, `--font-display` — see `src/styles/letter-theme.css`.

Office and War Room: `html[data-theme="letter"]` overrides in `office-theme.css`, `office-encargos.css`, `war-room.css`.
