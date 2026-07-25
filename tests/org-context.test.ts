import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MARKETING_AGENCY_TEMPLATE } from "../src/lib/business-templates.js";
import { orgContextToInitialMemory } from "../src/lib/org-context.js";

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
});
