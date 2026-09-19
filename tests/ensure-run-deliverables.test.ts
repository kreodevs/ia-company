import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectRunClosureStats } from "../src/lib/product-run-closure.js";
import { collectRunSummarySources } from "../src/lib/run-summary.js";

describe("ensure run deliverables helpers", () => {
  it("collectRunClosureStats flags zero deliverables with outputs", () => {
    const stats = collectRunClosureStats({
      _history: [
        {
          stepId: "s1",
          agentName: "research-thompson",
          output: "Market findings",
          timestamp: new Date().toISOString(),
        },
      ],
    });
    assert.equal(stats.stepsWithOutput, 1);
    assert.equal(stats.deliverablesSaved, 0);
  });

  it("collectRunSummarySources reads step history", () => {
    const sources = collectRunSummarySources({
      _history: [
        {
          stepId: "s1",
          agentName: "ceo-bezos",
          output: "## Strategy\n\nGo to market.\n\n```json\n{\"consensusUpdate\":\"## Strategy\\n\\nGo\",\"nextAction\":\"Launch\"}\n```",
          timestamp: new Date().toISOString(),
          stepOrder: 1,
        },
      ],
    });
    assert.equal(sources.length, 1);
    assert.match(sources[0]!.content, /Strategy/);
  });
});
