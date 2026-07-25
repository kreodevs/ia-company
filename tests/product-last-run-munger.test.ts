import test from "node:test";
import assert from "node:assert/strict";
import { buildProductLastRunDiagnosis } from "../src/lib/product-last-run.js";

test("buildProductLastRunDiagnosis detects munger veto", () => {
  const diagnosis = buildProductLastRunDiagnosis({
    run: {
      id: "run_1",
      status: "CANCELLED",
      workflowName: "pricing",
      totalTokens: 0,
      totalCostUsd: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: "VETO: Unit economics too weak",
      createdAt: new Date().toISOString(),
    },
    steps: [],
    revisionsRecorded: 1,
    docsInWorkspace: 0,
  });
  assert.equal(diagnosis, "munger_veto");
});
