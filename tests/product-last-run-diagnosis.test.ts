import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProductLastRunDiagnosis,
  resolveStepDeliverableStatus,
} from "../src/lib/product-last-run.js";

describe("product last run diagnosis", () => {
  const completedRun = {
    id: "run_1",
    status: "COMPLETED" as const,
    workflowName: "pricing",
    totalTokens: 1000,
    totalCostUsd: 0.01,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
  };

  it("flags missing docs and weak handoff", () => {
    const diagnosis = buildProductLastRunDiagnosis({
      run: completedRun,
      steps: [
        {
          agentName: "cfo-campbell",
          stepOrder: 1,
          outputChars: 120,
          memoryKeyChars: 0,
          hasStructuredHandoff: false,
          wroteDocs: false,
          savedDeliverablePath: null,
          deliverableStatus: "handoff_only",
          outputPreview: "",
          output: "plain prose",
          tokensUsed: 500,
        },
      ],
      revisionsRecorded: 1,
      docsInWorkspace: 0,
    });
    assert.equal(diagnosis, "no_docs_and_weak_handoff");
  });

  it("detects partial handoff when some steps lack JSON", () => {
    const diagnosis = buildProductLastRunDiagnosis({
      run: completedRun,
      steps: [
        {
          agentName: "research-thompson",
          stepOrder: 1,
          outputChars: 200,
          memoryKeyChars: 0,
          hasStructuredHandoff: true,
          wroteDocs: true,
          savedDeliverablePath: null,
          deliverableStatus: "saved_to_disk",
          outputPreview: "",
          output: "",
          tokensUsed: 400,
        },
        {
          agentName: "cfo-campbell",
          stepOrder: 2,
          outputChars: 180,
          memoryKeyChars: 0,
          hasStructuredHandoff: false,
          wroteDocs: false,
          savedDeliverablePath: "docs/cfo/fallback.md",
          deliverableStatus: "saved_to_disk",
          outputPreview: "",
          output: "",
          tokensUsed: 300,
        },
      ],
      revisionsRecorded: 2,
      docsInWorkspace: 2,
    });
    assert.equal(diagnosis, "partial_handoff");
  });

  it("resolves step deliverable status from history flags", () => {
    assert.equal(
      resolveStepDeliverableStatus({
        outputChars: 0,
        memoryKeyChars: 0,
        hasStructuredHandoff: false,
        wroteDocs: true,
      }),
      "saved_to_disk",
    );
    assert.equal(
      resolveStepDeliverableStatus({
        outputChars: 50,
        memoryKeyChars: 0,
        hasStructuredHandoff: false,
        savedDeliverablePath: "docs/ceo/run.md",
      }),
      "saved_to_disk",
    );
    assert.equal(
      resolveStepDeliverableStatus({
        outputChars: 0,
        memoryKeyChars: 0,
        hasStructuredHandoff: false,
      }),
      "missing",
    );
  });
});
