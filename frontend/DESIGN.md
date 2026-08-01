# Design systems

The frontend ships three visual themes, switched from the header (**Tema / Theme**).

| Theme | Label | CSS | Reference |
|-------|-------|-----|-----------|
| **Stripe HDS Light** | Default (`letter`) | `letter-theme.css`, `stripe-hds-overrides.css` | `DESIGN-STRIPE-HDS.md` |
| **Paperclip Warm** | Dark warm (`paperclip`) | `src/styles/paperclip-theme.css` | `DESIGN-PAPERCLIP.md` |
| **Slash** | Dark vault (`slash`) | `src/styles/slash-theme.css` | `DESIGN-SLASH.md` |

## Activation

- `data-theme="letter"` — Stripe HDS Light (default for new users)
- `data-theme="paperclip"` — charcoal + manila warm dark
- `data-theme="slash"` — midnight vault (copper accent)

Preference is stored in `localStorage` (`auto-company-ui-theme`) and applied in `index.html` before React mounts to avoid flash.

**Migration:** users who had `letter` before Paperclip was moved to `paperclip` are migrated once to `paperclip` so their choice is preserved.

## Shared semantic tokens

Components should prefer these bridge variables (defined in each theme):

- Surfaces: `--background`, `--card`, `--muted`, `--surface-header`
- Text: `--foreground`, `--foreground-muted`, `--accent`
- Actions: `--primary`, `--primary-foreground`, `--border`, `--ring`
- Shape: `--radius-buttons`, `--radius-inputs`, `--radius-cards`
- Typography: `--font-sans`, `--font-display`, `--font-mono`

Legacy aliases (`--color-background`, `--color-primary`, …) remain for existing pages.
