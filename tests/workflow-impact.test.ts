import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWorkflowImpactRisks,
  diffRemovedAgentNames,
} from "../src/lib/workflow-impact.js";
import type { WorkflowImpactReport } from "../src/lib/catalog-studio-types.js";

describe("buildWorkflowImpactRisks", () => {
  it("warns when active runs exist", () => {
    const base: WorkflowImpactReport = {
      workflowId: "wf-1",
      workflowName: "feature-development",
      references: [],
      risks: [],
      activeRunCount: 2,
      referenceCount: 0,
    };
    const risks = buildWorkflowImpactRisks(base);
    assert.ok(risks.some((risk) => risk.code === "active_runs"));
  });

  it("warns on rename when office services reference workflow name", () => {
    const base: WorkflowImpactReport = {
      workflowId: "wf-1",
      workflowName: "feature-development",
      references: [
        { kind: "office_service", id: "feature-sprint", name: "feature-sprint" },
      ],
      risks: [],
      activeRunCount: 0,
      referenceCount: 1,
    };
    const risks = buildWorkflowImpactRisks(base, { proposedName: "feature-dev-v2" });
    assert.ok(risks.some((risk) => risk.code === "rename_breaks_name_lookup"));
  });

  it("explains shared references without deleting other flows", () => {
    const base: WorkflowImpactReport = {
      workflowId: "wf-1",
      workflowName: "new-product-evaluation",
      references: [{ kind: "schedule", id: "s1", name: "Weekly eval" }],
      risks: [],
      activeRunCount: 0,
      referenceCount: 1,
    };
    const risks = buildWorkflowImpactRisks(base);
    assert.ok(risks.some((risk) => risk.code === "shared_procedure_behavior_change"));
  });

  it("flags major structure shrink", () => {
    const base: WorkflowImpactReport = {
      workflowId: "wf-1",
      workflowName: "test",
      references: [],
      risks: [],
      activeRunCount: 0,
      referenceCount: 0,
    };
    const risks = buildWorkflowImpactRisks(base, {
      previousStepCount: 6,
      proposedStepCount: 2,
    });
    assert.ok(risks.some((risk) => risk.code === "major_structure_shrink"));
  });
});

describe("diffRemovedAgentNames", () => {
  it("returns agents removed from the proposal", () => {
    const removed = diffRemovedAgentNames(
      [{ agentName: "ceo-bezos" }, { agentName: "critic-munger" }],
      [{ agentName: "ceo-bezos" }, { agentName: "marketing-godin" }],
    );
    assert.deepEqual(removed, ["critic-munger"]);
  });
});
