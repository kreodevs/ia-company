# Stripe HDS Light — Style Reference

> Light shell with Stripe indigo accents — default theme id `letter`.

Full design spec: `DESIGN-STRIPE-HDS.md`. Implementation:

- Tokens: `src/styles/letter-theme.css`
- Display / hero: **Inter** 300 (`--font-display`) — sohne-var fallback stack
- Body: **Inter** 400/300 (`--font-sans`)
- Primary action: indigo `#533afd` on pale `#f8fafd`
- Cards: white `#ffffff` with quiet borders `#e5edf5`
- Radii: 6px controls, 16px cards

**Note:** `letter` was previously Paperclip Warm; existing users are migrated to theme id `paperclip`.
