---
name: tenant-email-outbound
description: Send deliverables and updates to humans via tenant SMTP with strict allowlist guardrails.
---

# Tenant email outbound

Use the `send_email` tool when a human explicitly asked to receive work by email, or when a workflow step requires delivering a report externally.

## Before sending

1. Confirm SMTP is enabled in tenant Settings → Integrations.
2. Recipients must be on the tenant allowlist (active tenant users + configured extra addresses).
3. Maximum **5 recipients** and **20 emails/day** per tenant (configurable cap).
4. Never send credentials, API keys, or internal secrets.

## Tool: `send_email`

```json
{
  "to": ["user@company.com"],
  "subject": "Weekly pipeline summary",
  "body": "Markdown or plain text body"
}
```

## Guardrails (non-negotiable)

- Only allowlisted addresses; reject unknown recipients.
- Block disposable email domains (mailinator, guerrillamail, tempmail).
- Subject ≤ 200 chars; body ≤ 100k chars.
- One send = one audit log entry (`TenantEmailSendLog`).
- If quota exceeded, tell the human to retry tomorrow or raise the limit in settings.

## Tone

Professional, concise, actionable. Include a short summary plus the deliverable. Do not mention internal tool names unless debugging with an admin.
