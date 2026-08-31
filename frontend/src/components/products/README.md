# Product UI components

| Component | Role |
|-----------|------|
| `ProductRevenueSettingsPanel` | Stripe + waitlist webhooks per product |
| `ProductIntakePreviewPanel` | Intake profile markdown preview + version history sidebar |
| `ProductIntegrationsPanel` | TheForge project ID, support RAG MCP slug, auto-dispatch specs |
| `deliveries/` | Unified encargo outcomes per product — see [deliveries/README.md](./deliveries/README.md) |
| `README.md` | This file |

Product **Entregas** lives at `/products/:id/entregas` (`ProductDeliveriesPage.tsx`) — primary place to read final reports, documents, and pending decisions for a product.

Product **Desk** lives at `/products/:id/desk` (`ProductDeskPage.tsx`):

- **Mesa** — four zones: For you, Ready, In progress, Recent (gate B approvals + dispatch)
- **Roadmap** — Kanban (backlog → approved → in progress → done)
- **Señales** — revenue, waitlist, campaign metrics feeding recommendations
- **Playbooks** — department playbooks (pricing, SEO, sunset, support, creative)

Recommendations appear in **Para ti**; launch a playbook directly or refresh via toolbar.
