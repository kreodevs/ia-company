# ADR: Catalog Studio (Agent & Skill LLM)

**Status:** Accepted (2026-07-24)

## Context

Tenants manage agents and skills manually under debug routes. Org Studio creates agents from templates but does not let users describe custom roles with LLM assistance. Product decision: **propose ≠ apply** — humans must explicitly approve creation.

## Decision

1. **Shared LLM utilities** in `catalog-studio-llm.ts` (parse JSON, tenant model, rate limit, maxTokens).
2. **Skill Studio** and **Agent Studio** as separate propose/apply flows with Munger review on propose.
3. **Reuse-first prompts** — LLM receives full tenant catalog; prefer existing agents/skills.
4. **Human gates:**
   - New skill: `approved: true` on apply.
   - New agent: `approved: true` on apply.
   - New skills linked to agent: each name in `approvedNewSkillNames[]`.
5. **UX hub** at `/ai-team` under **Tu oficina** nav; debug catalog group removed.
6. **Rate limit:** audit log count of propose actions per tenant per hour (`CATALOG_STUDIO_PROPOSE_MAX_PER_HOUR`, default 30).

## Consequences

- Org Studio refactored to use `ensureTenantAgents` from `tenant-catalog.ts`.
- Coordinator still uses fixed services (Phase 4 TODO).
- Manual CRUD remains in Agents/Skills tabs for power users.

## Alternatives rejected

- Silent skill creation on agent apply — rejected (explicit approval required).
- Platform-global skill catalog — rejected (tenant-scoped only).
