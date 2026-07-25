import test from "node:test";
import assert from "node:assert/strict";
import { taskForScheduledWorkflow } from "../src/lib/workflow-run-memory.js";
import { WORKFLOW_NAMES } from "../src/lib/workflow-names.js";

test("taskForScheduledWorkflow sets discovery task with interests hint", () => {
  const task = taskForScheduledWorkflow(WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY, {
    interests: ["gaming", "saas"],
  });
  assert.match(task, /tenant interests/i);
  assert.match(task, /topIdeas/i);
});

test("taskForScheduledWorkflow sets generic discovery task without interests", () => {
  const task = taskForScheduledWorkflow(WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY, {
    interests: [],
  });
  assert.doesNotMatch(task, /tenant interests/i);
  assert.match(task, /topIdeas/i);
});

test("taskForScheduledWorkflow evaluates pending pipeline idea", () => {
  const task = taskForScheduledWorkflow(WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION, {
    interests: [],
    pendingIdea: { title: "AI tutor", description: "For kids" },
  });
  assert.match(task, /AI tutor/);
  assert.match(task, /For kids/);
});

test("taskForScheduledWorkflow scopes product workflows to focus product", () => {
  const task = taskForScheduledWorkflow(WORKFLOW_NAMES.FEATURE_DEVELOPMENT, {
    interests: [],
    focusProduct: { name: "MemorIA", slug: "alebrije-memoria" },
  });
  assert.match(task, /MemorIA/);
  assert.match(task, /alebrije-memoria/);
});
