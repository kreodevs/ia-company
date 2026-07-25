import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompanyScopeContract,
  buildProductScopeContract,
  isCompanyScopedWorkflow,
  shouldMergeProductConsensus,
} from "../src/lib/scope-contract.js";
import { WORKFLOW_NAMES } from "../src/lib/workflow-names.js";
import { agentAcceptsInput, contractForAgentName } from "../src/lib/agent-contract.js";

describe("scope-contract", () => {
  it("marks opportunity-discovery as company scoped", () => {
    assert.equal(isCompanyScopedWorkflow(WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY), true);
  });

  it("does not merge product consensus for company workflows", () => {
    assert.equal(
      shouldMergeProductConsensus({
        workflowName: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY,
        productId: "prod-1",
      }),
      false,
    );
  });

  it("merges product consensus for product operate workflows", () => {
    assert.equal(
      shouldMergeProductConsensus({
        workflowName: WORKFLOW_NAMES.FEATURE_DEVELOPMENT,
        productId: "prod-1",
      }),
      true,
    );
  });

  it("builds scope contracts", () => {
    const company = buildCompanyScopeContract("discovery");
    assert.equal(company.level, "company");
    const product = buildProductScopeContract({
      productId: "p1",
      productSlug: "memoria",
      intent: "deliver",
    });
    assert.equal(product.level, "product");
    assert.equal(product.productId, "p1");
  });
});

describe("agent-contract", () => {
  it("fullstack accepts spec input", () => {
    const c = contractForAgentName("fullstack-dhh");
    assert.ok(c.inputs.includes("spec"));
    assert.ok(agentAcceptsInput(c.inputs, "spec"));
  });

  it("qa accepts code not spec alone from wrong type", () => {
    const c = contractForAgentName("qa-bach");
    assert.ok(agentAcceptsInput(c.inputs, "code"));
    assert.equal(agentAcceptsInput(c.inputs, "social_post"), false);
  });
});
