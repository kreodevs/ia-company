import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasStructuredHandoffJson,
  shouldEnforceHandoffJson,
} from "../src/lib/handoff-validation.js";
import { attachScopeContract, buildCompanyScopeContract } from "../src/lib/scope-contract.js";

describe("handoff validation", () => {
  it("detects structured handoff JSON", () => {
    const output = `## Report\n\nFindings here.\n\n\`\`\`json\n{"consensusUpdate":"## Update","nextAction":"Ship"}\n\`\`\``;
    assert.equal(hasStructuredHandoffJson(output), true);
  });

  it("rejects prose-only output", () => {
    assert.equal(hasStructuredHandoffJson("Just prose without JSON block."), false);
  });

  it("enforces handoff for deliver intent scope", () => {
    const memory = attachScopeContract({}, buildCompanyScopeContract("deliver"));
    assert.equal(shouldEnforceHandoffJson({}, memory as never), true);
  });

  it("respects explicit requireHandoffJson=false", () => {
    const memory = attachScopeContract({}, buildCompanyScopeContract("deliver"));
    assert.equal(
      shouldEnforceHandoffJson({ requireHandoffJson: false }, memory as never),
      false,
    );
  });
});
