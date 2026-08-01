import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentDocsPath } from "../src/lib/workspace-layout.js";

describe("company discovery deliverable paths", () => {
  it("uses docs/company/<role> for company-scoped agent docs", () => {
    assert.equal(agentDocsPath("research-thompson", { companyScoped: true }), "docs/company/research");
    assert.equal(agentDocsPath("ceo-bezos", { companyScoped: true }), "docs/company/ceo");
    assert.equal(agentDocsPath("research-thompson"), "docs/research");
  });
});
