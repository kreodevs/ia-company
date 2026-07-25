import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MARKETING_AGENCY_TEMPLATE } from "../src/lib/business-templates.js";
import { proposeOrgUnit } from "../src/lib/org-studio.js";
import { slugifyOrgName } from "../src/lib/org-workspace.js";

describe("org studio", () => {
  it("slugifyOrgName produces safe slugs", () => {
    assert.equal(slugifyOrgName("Kreo Marketing!"), "kreo-marketing");
  });

  it("marketing agency template includes copy and social agents", () => {
    const names = MARKETING_AGENCY_TEMPLATE.suggestedAgents.map((a) => a.name);
    assert.ok(names.includes("copy-manager"));
    assert.ok(names.includes("community-manager"));
    assert.ok(MARKETING_AGENCY_TEMPLATE.configSchema.sections?.length);
  });

  it("proposeOrgUnit returns DynamicForm-compatible schema", async () => {
    const proposal = await proposeOrgUnit({
      templateSlug: "marketing-agency",
      description: "B2B SaaS LinkedIn content",
    });
    assert.equal(proposal.templateSlug, "marketing-agency");
    assert.ok(proposal.configSchema.sections?.[0]?.fields.length);
    assert.match(proposal.summary, /marketing/i);
    assert.ok(proposal.suggestedAgents.length >= 3);
  });
});
