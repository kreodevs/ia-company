import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveFinalReport } from "../src/lib/office-encargos.js";
import { buildRunSummaryPrompt, collectRunSummarySources } from "../src/lib/run-summary.js";
import type { SharedMemory } from "../src/types/index.js";

describe("run-summary", () => {
  it("collectRunSummarySources deduplicates agent steps", () => {
    const memory: SharedMemory = {
      _history: [
        { stepId: "a", agentName: "research-thompson", output: "First pass", stepOrder: 1 },
        { stepId: "a-dup", agentName: "research-thompson", output: "First pass", stepOrder: 1 },
        { stepId: "b", agentName: "ceo-bezos", output: "CEO view", stepOrder: 2 },
      ],
    };

    const sources = collectRunSummarySources(memory);
    assert.equal(sources.length, 2);
    assert.equal(sources[0]?.agentName, "research-thompson");
    assert.equal(sources[1]?.agentName, "ceo-bezos");
  });

  it("buildRunSummaryPrompt includes workflow and request", () => {
    const prompt = buildRunSummaryPrompt({
      workflowName: "product-intake",
      request: "Perfil del producto Alebrije",
      productName: "Alebrije MemorIA",
      sources: [{ agentName: "research-thompson", stepOrder: 1, content: "Market notes" }],
    });
    assert.match(prompt, /product-intake/);
    assert.match(prompt, /Alebrije MemorIA/);
    assert.match(prompt, /Market notes/);
  });
});

describe("office-encargos final report", () => {
  it("resolveFinalReport prefers runSummary in memory", () => {
    const memory: SharedMemory = { runSummary: "# Resumen\n\nTodo en uno." };
    const report = resolveFinalReport(memory, [], []);
    assert.equal(report, "# Resumen\n\nTodo en uno.");
  });

  it("resolveFinalReport falls back to agent revision", () => {
    const memory: SharedMemory = {};
    const report = resolveFinalReport(
      memory,
      [{ id: "1", kind: "revision", agentName: "ceo-bezos", title: "CEO", markdown: "CEO report", stepOrder: 4 }],
      [{ agentName: "ceo-bezos", content: "CEO report", stepOrder: 4 }],
    );
    assert.equal(report, "CEO report");
  });
});
