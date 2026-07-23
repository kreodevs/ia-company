import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectAgentStepOutput } from "../src/lib/agent-deliverables.js";

describe("collectAgentStepOutput", () => {
  it("joins text from all steps when final text is empty", () => {
    const output = collectAgentStepOutput({
      text: "",
      steps: [
        { text: "Step one analysis." },
        { text: "Final recommendation: 3 tiers." },
      ],
    } as Parameters<typeof collectAgentStepOutput>[0]);

    assert.match(output, /Step one analysis/);
    assert.match(output, /Final recommendation/);
  });

  it("deduplicates identical step text", () => {
    const output = collectAgentStepOutput({
      text: "Same text",
      steps: [{ text: "Same text" }],
    } as Parameters<typeof collectAgentStepOutput>[0]);

    assert.equal(output, "Same text");
  });
});
