# Letter — Style Reference

> Private gallery with iridescent vault artifacts. A black-walled showroom where serif headlines float above chrome sculptures on tinted gallery walls.

**Theme:** mixed

Letter is the visual system for the Auto-Company frontend. It combines a deep ink-black hero stage with a bright editorial body, serif display typography (Albra Sans substitute: Playfair Display), and extended grotesque UI text (Neufile substitute: IBM Plex Sans).

## Implementation in this repo

- **Tokens:** `src/styles/letter-theme.css`
- **Kreo atoms:** `src/components/atoms/` — Button, InputText, Badge, Skeleton, StatusPill
- **Kreo molecules:** `src/components/molecules/` — Card, PageHeader, EmptyState, StatsCard
- **App wrappers:** `src/components/ui/` — backward-compatible exports used by pages

## Key rules

- Headlines use `--font-albra-sans`; UI copy uses `--font-neufile-grotesk-extended`
- Button/card radius: **2px** (cards: **0px**)
- No box-shadows on UI surfaces
- Brand action colors: teal `#186f64`, violet `#536eff`, blue `#154ea5`
- Tinted panels: peach `#fcede1`, mint `#eefcef`, lavender `#e6def0`

See the full token tables, component specs, and agent prompts in the project design brief used to generate this file.
