# Product UI components

| Component | Role |
|-----------|------|
| `ProductRevenueSettingsPanel` | Stripe + waitlist webhooks per product |
| `ProductIntegrationsPanel` | TheForge project ID, support RAG MCP slug, auto-dispatch specs |
| `README.md` | This file |

Product **Desk** lives at `/products/:id/desk` (`ProductDeskPage.tsx`):

- **Mesa** — four zones: For you, Ready, In progress, Recent (gate B approvals + dispatch)
- **Roadmap** — Kanban (backlog → approved → in progress → done)
- **Señales** — revenue, waitlist, campaign metrics feeding recommendations
- **Playbooks** — department playbooks (pricing, SEO, sunset, support, creative)

Recommendations appear in **Para ti**; launch a playbook directly or refresh via toolbar.
