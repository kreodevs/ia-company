import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topologicalSort } from "../src/core/engine.js";

describe("topologicalSort", () => {
  it("orders steps by edges when acyclic", () => {
    const workflow = {
      steps: [
        { id: "a", stepOrder: 0, agentId: "1", label: null, positionX: 0, positionY: 0, inputConfig: {}, outputConfig: {}, agent: {} as never },
        { id: "b", stepOrder: 1, agentId: "2", label: null, positionX: 0, positionY: 0, inputConfig: {}, outputConfig: {}, agent: {} as never },
        { id: "c", stepOrder: 2, agentId: "3", label: null, positionX: 0, positionY: 0, inputConfig: {}, outputConfig: {}, agent: {} as never },
      ],
      edges: [
        { id: "e1", sourceStepId: "a", targetStepId: "b", sourceHandle: null, targetHandle: null },
        { id: "e2", sourceStepId: "b", targetStepId: "c", sourceHandle: null, targetHandle: null },
      ],
    };

    const sorted = topologicalSort(workflow);
    assert.deepEqual(
      sorted.map((s) => s.id),
      ["a", "b", "c"],
    );
  });

  it("falls back to stepOrder when cycle detected", () => {
    const workflow = {
      steps: [
        { id: "a", stepOrder: 0, agentId: "1", label: null, positionX: 0, positionY: 0, inputConfig: {}, outputConfig: {}, agent: {} as never },
        { id: "b", stepOrder: 1, agentId: "2", label: null, positionX: 0, positionY: 0, inputConfig: {}, outputConfig: {}, agent: {} as never },
      ],
      edges: [
        { id: "e1", sourceStepId: "a", targetStepId: "b", sourceHandle: null, targetHandle: null },
        { id: "e2", sourceStepId: "b", targetStepId: "a", sourceHandle: null, targetHandle: null },
      ],
    };

    const sorted = topologicalSort(workflow);
    assert.deepEqual(
      sorted.map((s) => s.id),
      ["a", "b"],
    );
  });
});
