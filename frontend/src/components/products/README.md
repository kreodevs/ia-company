# Products components

| Component | Role |
|-----------|------|
| `ProductRevenueSettingsPanel.tsx` | Revenue USD, Stripe webhook secret, webhook URL copy — used in `/products/:id/settings` |
| `ProductActionsMenu.tsx` | Pause, archive, NO-GO, delete actions on product cards |

## Revenue / Stripe

Configure per product under **Settings → Revenue & Stripe**:

- Manual `revenueUsd` baseline
- `stripeWebhookSecret` stored in product metadata (never returned to the client)
- Webhook URL: `POST /api/webhooks/stripe/:productId` with raw JSON body + `Stripe-Signature` header

Supported Stripe events: `checkout.session.completed`, `invoice.paid`, `payment_intent.succeeded`.
