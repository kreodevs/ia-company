import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MARKETING_AGENCY_TEMPLATE, PLATFORM_BUSINESS_TEMPLATES } from "../src/lib/business-templates.js";
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

  it("product studio and custom templates include agents", () => {
    const productStudio = PLATFORM_BUSINESS_TEMPLATES.find((t) => t.slug === "product-studio");
    const custom = PLATFORM_BUSINESS_TEMPLATES.find((t) => t.slug === "custom-department");
    assert.ok((productStudio?.definition.suggestedAgents.length ?? 0) >= 3);
    assert.ok((custom?.definition.suggestedAgents.length ?? 0) >= 2);
  });

  it("vertical templates are registered with agents and config schema", () => {
    const verticalSlugs = ["sales-revops", "customer-success", "seo-content-studio", "finance-pricing"];
    assert.equal(PLATFORM_BUSINESS_TEMPLATES.length, 7);
    for (const slug of verticalSlugs) {
      const tpl = PLATFORM_BUSINESS_TEMPLATES.find((t) => t.slug === slug);
      assert.ok(tpl, `missing template ${slug}`);
      assert.ok(tpl!.definition.suggestedAgents.length >= 3);
      assert.ok(tpl!.definition.configSchema.sections?.length);
      assert.ok((tpl!.definition.suggestedWorkflows?.length ?? 0) >= 2);
    }
  });

  it("proposeOrgUnit works for sales-revops template", async () => {
    const proposal = await proposeOrgUnit({
      templateSlug: "sales-revops",
      description: "Outbound for mid-market SaaS",
    });
    assert.equal(proposal.templateSlug, "sales-revops");
    assert.equal(proposal.orgUnitType, "department");
    assert.ok(proposal.suggestedAgents.some((a) => a.name === "sales-ross"));
  });
});
