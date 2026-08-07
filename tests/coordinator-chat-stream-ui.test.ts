import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findCompletedOfficePlan,
  findPendingProposalApproval,
} from "../frontend/src/lib/coordinator-chat-stream.ts";

const samplePlan = {
  planId: "plan-1",
  request: "Objetivo: escaneo de mercado",
  summary: "Escaneo",
  coordinatorNoteKey: "office.notes.default",
  agents: [],
  missingAgentRoles: [],
  workflowId: null,
  workflowName: null,
  presetId: null,
  productId: "prod-1",
  productName: "Alebrije MemorIA",
  deliverableKey: "office.deliverables.marketReport",
  estimatedCostUsd: { min: 0.48, max: 1.8 },
  estimatedMinutes: { min: 16, max: 48 },
  mode: "team" as const,
  serviceId: null,
};

function assistantWithProposal(
  state: "approval-requested" | "complete",
  plan = samplePlan,
  approvalId = "approval-1",
) {
  return {
    role: "assistant",
    parts: [
      {
        type: "tool-call",
        name: "propose_office_task",
        state,
        input: { taskBrief: plan.request, rationale: "Porque encaja con el brief" },
        ...(state === "approval-requested"
          ? { approval: { id: approvalId } }
          : { output: plan }),
      },
    ],
  };
}

describe("coordinator chat stream UI parsers", () => {
  it("ignores completed plans from before the last user message", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", content: "Primera petición" }] },
      assistantWithProposal("complete", { ...samplePlan, planId: "old-plan" }),
      { role: "user", parts: [{ type: "text", content: "Corrección de pricing" }] },
      { role: "assistant", parts: [{ type: "text", content: "Entendido, ajusto el plan." }] },
    ];

    assert.equal(findCompletedOfficePlan(messages), null);
  });

  it("returns the latest completed plan after the last user message", () => {
    const newerPlan = { ...samplePlan, planId: "plan-2", request: "Objetivo: captación planners" };
    const messages = [
      { role: "user", parts: [{ type: "text", content: "Corrección de pricing" }] },
      assistantWithProposal("complete", samplePlan),
      assistantWithProposal("complete", newerPlan),
    ];

    assert.equal(findCompletedOfficePlan(messages)?.planId, "plan-2");
  });

  it("hides completed plans while a newer proposal awaits approval", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", content: "Corrección de pricing" }] },
      assistantWithProposal("complete", samplePlan),
      assistantWithProposal("approval-requested", { ...samplePlan, planId: "plan-2" }, "approval-2"),
    ];

    assert.equal(findPendingProposalApproval(messages)?.approvalId, "approval-2");
    assert.equal(findCompletedOfficePlan(messages), null);
  });

  it("scopes pending approval to the latest user turn", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", content: "Primera petición" }] },
      assistantWithProposal("approval-requested", samplePlan, "stale-approval"),
      { role: "user", parts: [{ type: "text", content: "Segunda petición" }] },
      { role: "assistant", parts: [{ type: "text", content: "Trabajando en ello." }] },
    ];

    assert.equal(findPendingProposalApproval(messages), null);
  });
});
