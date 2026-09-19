import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRunStepGroupInParallel,
  groupStepsByOrder,
} from "../src/lib/step-groups.js";
import type { WorkflowGraph } from "../src/types/index.js";

function step(id: string, order: number, agentName: string): WorkflowGraph["steps"][number] {
  return {
    id,
    agentId: `agent-${id}`,
    stepOrder: order,
    label: null,
    positionX: 0,
    positionY: 0,
    inputConfig: {},
    outputConfig: {},
    agent: {
      id: `agent-${id}`,
      name: agentName,
      role: agentName,
      systemPrompt: "",
      provider: null,
      model: null,
      modelKind: "text",
      temperature: 0.7,
      skills: [],
    },
  };
}

describe("step groups", () => {
  it("groups steps by stepOrder preserving sequence", () => {
    const groups = groupStepsByOrder([
      step("a", 1, "research-thompson"),
      step("b", 1, "ceo-bezos"),
      step("c", 2, "critic-munger"),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.length, 2);
    assert.equal(groups[1]!.length, 1);
  });

  it("allows parallel groups without fullstack opencode agent", () => {
    const parallel = [
      step("a", 1, "research-thompson"),
      step("b", 1, "ceo-bezos"),
    ];
    assert.equal(canRunStepGroupInParallel(parallel, { implementationMode: "local" }), true);
  });

  it("blocks parallel when fullstack step present under opencode mode", () => {
    const parallel = [step("a", 1, "fullstack-dhh"), step("b", 1, "qa-bach")];
    assert.equal(
      canRunStepGroupInParallel(parallel, { implementationMode: "opencode" }),
      false,
    );
  });
});
