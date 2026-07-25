# Products components

| Component | Role |
|-----------|------|
| `ProductRevenueSettingsPanel.tsx` | Revenue USD, Stripe webhook secret, webhook URL copy — used in `/products/:id/settings` |
| `ProductActionsMenu.tsx` | Pause, archive, NO-GO, delete actions on product cards |

## Product settings (`ProductSettingsPage`)

Tabbed layout (`?tab=general|intake|revenue|opencode`) — same `TabsBar` pattern as tenant Settings and Products list.

| Tab | Content |
|-----|---------|
| General | Name, description, GitHub, department, work item type |
| Intake | Profile status, re-run product-intake workflow |
| Revenue | `ProductRevenueSettingsPanel` — Stripe + waitlist |
| OpenCode | Per-product agent/model/path overrides |

Legacy hash links (`#revenue`) redirect to `?tab=revenue`.

Configure per product under **Settings → Revenue & Stripe**:

- Manual `revenueUsd` baseline
- Stripe webhook URL + signing secret (auto-increment revenue)
- Waitlist endpoint URL + API key (landing form → signup count)
- `stripeWebhookSecret` stored in product metadata (never returned to the client)
- Webhook URL: `POST /api/webhooks/stripe/:productId` with raw JSON body + `Stripe-Signature` header

Supported Stripe events: `checkout.session.completed`, `invoice.paid`, `payment_intent.succeeded`.
Revenue events are deduplicated by Stripe event id (`ProductRevenueEvent`).

## Waitlist

- Endpoint: `POST /api/webhooks/waitlist/:productId`
- Headers: `Content-Type: application/json`, `X-Waitlist-Key: <key>`
- Body: `{ "email": "user@example.com", "source": "landing" }`
- Signups stored in `ProductWaitlistSignup`; count shown in War Room metrics strip.
