# Design systems

The frontend ships two visual themes, switched from the header (**Tema / Theme**).

| Theme | Mode | CSS | Reference |
|-------|------|-----|-----------|
| **Letter** | Light (default) | `src/styles/letter-theme.css` | `DESIGN-LETTER.md` |
| **Slash** | Dark | `src/styles/slash-theme.css` | `DESIGN-SLASH.md` |

## Activation

- `data-theme="letter"` on `<html>` — editorial light gallery (IBM Plex Sans + Playfair Display)
- `data-theme="slash"` — midnight vault (Inter + Libre Caslon Display, copper accent, pill controls)

Preference is stored in `localStorage` (`auto-company-ui-theme`) and applied before React mounts to avoid flash.

## Shared semantic tokens

Components should prefer these bridge variables (defined in both themes):

- Surfaces: `--background`, `--card`, `--muted`, `--surface-header`
- Text: `--foreground`, `--foreground-muted`, `--accent`
- Actions: `--primary`, `--primary-foreground`, `--border`, `--ring`
- Shape: `--radius-buttons`, `--radius-inputs`, `--radius-cards`
- Typography: `--font-sans`, `--font-display`

Legacy aliases (`--color-background`, `--color-primary`, …) remain for existing pages.
