import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MARKETING_AGENCY_TEMPLATE } from "../src/lib/business-templates.js";
import { orgContextToInitialMemory, resolveOrgUnitAgentBreakdown, selectOrgAgentsForTask } from "../src/lib/org-context.js";

describe("org context", () => {
  it("orgContextToInitialMemory includes department agents", () => {
    const mem = orgContextToInitialMemory({
      orgUnitId: "ou1",
      orgUnitSlug: "kreo-marketing",
      orgUnitName: "Kreo Marketing",
      orgUnitType: "marketing_agency",
      orgUnitConfig: { niche: "B2B SaaS" },
      orgUnitDesignMd: "# Design",
      orgUnitTokens: { color: { primary: "#C9A227" } },
      suggestedAgentNames: ["copy-manager", "community-manager"],
    });
    assert.equal(mem.orgUnitSlug, "kreo-marketing");
    assert.deepEqual(mem.orgUnitAgents, ["copy-manager", "community-manager"]);
    assert.equal((mem.orgUnitConfig as { niche: string }).niche, "B2B SaaS");
  });

  it("marketing agency template maps agents to artifact types", () => {
    const copy = MARKETING_AGENCY_TEMPLATE.suggestedAgents.find((a) => a.name === "copy-manager");
    assert.ok(copy?.artifactTypes?.includes("copy"));
    const social = MARKETING_AGENCY_TEMPLATE.suggestedAgents.find(
      (a) => a.name === "community-manager",
    );
    assert.ok(social?.artifactTypes?.includes("social_post"));
  });

  it("selectOrgAgentsForTask prefers community and strategist for social launch", () => {
    const agents = [
      { id: "1", name: "copy-manager", role: "Copy Manager" },
      { id: "2", name: "community-manager", role: "Community Manager" },
      { id: "3", name: "design-lead", role: "Design Lead" },
      { id: "4", name: "marketing-strategist", role: "Marketing Strategist" },
    ];
    const picked = selectOrgAgentsForTask(
      agents,
      "estrategia de lanzamiento en redes sociales para Instagram y TikTok",
      "marketing_agency",
    );
    const names = picked.map((agent) => agent.name);
    assert.ok(names.includes("community-manager"));
    assert.ok(names.includes("marketing-strategist"));
  });

  it("resolveOrgUnitAgentBreakdown merges template and linked agents", () => {
    const breakdown = resolveOrgUnitAgentBreakdown({
      type: "marketing_agency",
      config: { linkedAgentNames: ["seo-specialist", "copy-manager"] },
      template: null,
    });
    assert.ok(breakdown.templateNames.length >= 4);
    assert.ok(breakdown.linkedNames.includes("seo-specialist"));
    assert.ok(breakdown.allNames.includes("copy-manager"));
    assert.ok(breakdown.allNames.includes("seo-specialist"));
  });
});
