import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convergencePromptSection } from "../src/lib/convergence.js";
import { WORKFLOW_NAMES } from "../src/lib/workflow-names.js";

describe("convergence helpers", () => {
  it("includes cycle number and phase in prompt section", () => {
    const section = convergencePromptSection(3, "building");
    assert.match(section, /cycle number: 3/i);
    assert.match(section, /building/i);
    assert.match(section, /topIdeas/i);
    assert.match(section, /goNoGo/i);
  });

  it("exports stable workflow name constants", () => {
    assert.equal(WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY, "opportunity-discovery");
    assert.equal(WORKFLOW_NAMES.FEATURE_DEVELOPMENT, "feature-development");
  });
});
