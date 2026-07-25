import test from "node:test";
import assert from "node:assert/strict";
import { collectRunClosureStats } from "../src/lib/product-run-closure.js";
import { WORKFLOW_NAMES } from "../src/lib/workflow-names.js";

test("collectRunClosureStats counts output and saved deliverables", () => {
  const stats = collectRunClosureStats({
    _history: [
      { agentName: "research-thompson", output: "Findings", wroteDocs: true },
      { agentName: "cfo-campbell", output: "", savedDeliverablePath: "docs/cfo/run.md" },
      { agentName: "qa-bach", output: "" },
    ],
  });
  assert.equal(stats.stepsTotal, 3);
  assert.equal(stats.stepsWithOutput, 1);
  assert.equal(stats.deliverablesSaved, 2);
});

test("collectRunClosureStats handles empty history", () => {
  const stats = collectRunClosureStats({ _history: [] });
  assert.equal(stats.stepsTotal, 0);
  assert.equal(stats.deliverablesSaved, 0);
});

test("workflow names exist for primary presets", () => {
  assert.ok(WORKFLOW_NAMES.SEO_REVIEW);
  assert.ok(WORKFLOW_NAMES.PRICING_MONETIZATION);
  assert.ok(WORKFLOW_NAMES.PRODUCT_LAUNCH);
});
