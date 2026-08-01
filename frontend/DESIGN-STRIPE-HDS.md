# Stripe HDS Light — Design System

**Version:** alpha · **Theme id:** `letter` (default)

Light palette anchored on **pale background** `#f6f9fc` with **Stripe blurple** `#635bff` for primary actions. Typography uses Inter as a stand-in for sohne-var / SF Pro Display.

## Activation

- `data-theme="letter"` on `<html>` — Stripe HDS Light (**default** for new users)
- Preference: `localStorage` key `auto-company-ui-theme`

## Color tokens

| Token | Hex | Role |
|-------|-----|------|
| `--pale-background` | #f6f9fc | Page background |
| `--surface-white` | #ffffff | Cards, header, inputs |
| `--surface-sunken` | #eef3f9 | Workflow canvas, muted wells |
| `--deep-navy` | #0a2540 | Headings, primary text |
| `--slate-body` | #425466 | Body, nav links |
| `--subdued-heading` | #697386 | Muted labels |
| `--stripe-indigo` | #635bff | Primary CTA, links, focus ring |
| `--stripe-indigo-hover` | #5851ea | Primary hover |
| `--stripe-orange` | #ff7a00 | Accent / warning CTA |
| `--brand-lavender` | #7a73ff | Secondary brand tint |
| `--quiet-surface` | #e6ebf1 | Borders, dividers |
| `--dark-slate` | #3c4257 | Form labels |

**Contrast:** On tinted surfaces (`primary/10`, filter pills, mode pills), use **indigo text** (`#635bff` / `#5851ea`) — never white on pale lavender fills.

## Workflow canvas tokens

| Token | Role |
|-------|------|
| `--flow-canvas-bg` | Light board background (not dark slab) |
| `--flow-grid-color` | Dot grid |
| `--flow-edge-color` | Edge stroke |
| `--flow-node-bg` / `--flow-node-border` | Agent nodes |
| `--flow-minimap-mask` | Minimap overlay |

React Flow uses `colorMode="light"` when `letter` is active. Overrides: `stripe-hds-overrides.css`.

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

Office and War Room: `html[data-theme="letter"]` overrides in `office-theme.css`, `office-encargos.css`, `war-room.css`. App shell + React Flow: `stripe-hds-overrides.css`.
