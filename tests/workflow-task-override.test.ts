import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStuckPivotNextAction,
  resolveWorkflowTaskOverride,
} from "../frontend/src/lib/workflow-task-override.ts";

describe("resolveWorkflowTaskOverride", () => {
  it("prefers stored task from AI studio over consensus STUCK", () => {
    const task = resolveWorkflowTaskOverride({
      storedTask: "Generate micro video tutorials from GitHub repo",
      consensusNextAction:
        'STUCK on "Discover new product opportunities" — pivot: ship smallest vertical slice today',
    });
    assert.equal(task, "Generate micro video tutorials from GitHub repo");
  });

  it("skips STUCK consensus and falls back to workflow description", () => {
    const task = resolveWorkflowTaskOverride({
      consensusNextAction:
        'STUCK on "Discover new product opportunities" — pivot: ship smallest vertical slice today',
      workflowDescription: "Analyze repo and produce micro video tutorials.",
    });
    assert.equal(task, "Analyze repo and produce micro video tutorials.");
  });

  it("uses normal consensus next action when not STUCK", () => {
    const task = resolveWorkflowTaskOverride({
      consensusNextAction: "Ship pricing page MVP",
      workflowDescription: "Other workflow",
    });
    assert.equal(task, "Ship pricing page MVP");
  });

  it("detects STUCK pivot prefix", () => {
    assert.equal(
      isStuckPivotNextAction(
        'STUCK on "Discover opportunities" — pivot: ship smallest vertical slice today',
      ),
      true,
    );
    assert.equal(isStuckPivotNextAction("Ship pricing page"), false);
  });
});
