# SnapOG — Vertical Playbook

Operator guide for running SnapOG as a monetizable micro-SaaS inside Auto-Company.

## What this vertical includes

- **Code:** `projects/snapog/` — Cloudflare Worker OG API (Hono, D1, R2, Stripe checkout)
- **Workflows:** pricing, launch, SEO, marketing sprint, feature dev, weekly review
- **Presets:** SnapOG-specific task templates (not generic "this product" copy)

## Recommended sequence (first 2 weeks)

1. **Apply vertical pack** — Products → Vertical packs → Apply SnapOG (registers product, clones workflows, seeds profile)
2. **Pricing & monetization** — Validate $19/$49 tiers vs Bannerbear/Placid; output landing pricing copy
3. **Product launch** — Landing hooks, PH draft, success metrics
4. **SEO review** — snapog.dev meta, schema, API docs indexability
5. **Feature development** — One revenue-adjacent slice (e.g. checkout polish, usage dashboard)
6. **Weekly review** — Revenue, usage, next experiment

## Revenue loop

| Step | Owner workflow | Deliverable |
|------|----------------|-------------|
| Stripe live | devops + fullstack | Checkout + webhook in Worker |
| Pricing copy | cfo + marketing | docs/cfo/ + landing section |
| Waitlist → paid | operations | Office encargo with client delivery link |

## Workspace conventions

- Product code stays in `projects/snapog/src/`
- Agent outputs go to `projects/snapog/docs/{role}/`
- Do not commit Stripe secrets — use Worker secrets / platform settings

## Exit criteria (vertical "done" for pilot)

- [ ] Pro checkout works in production
- [ ] Landing pricing section matches CFO model
- [ ] At least one paying customer OR validated waitlist → paid funnel
- [ ] Client delivery link used for external stakeholder review
