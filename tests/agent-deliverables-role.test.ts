import test from "node:test";
import assert from "node:assert/strict";
import { agentWroteDocsInStep } from "../src/lib/agent-deliverables.js";

test("agentWroteDocsInStep requires correct role folder when agentName provided", () => {
  const wrongFolder = {
    steps: [
      {
        toolResults: [
          {
            toolName: "write_file",
            result: { path: "docs/marketing-godin/brief.md" },
          },
        ],
      },
    ],
  } as Parameters<typeof agentWroteDocsInStep>[0];

  assert.equal(agentWroteDocsInStep(wrongFolder, "cfo-campbell"), false);

  const rightFolder = {
    steps: [
      {
        toolResults: [
          {
            toolName: "write_file",
            result: { path: "docs/cfo/pricing.md" },
          },
        ],
      },
    ],
  } as Parameters<typeof agentWroteDocsInStep>[0];

  assert.equal(agentWroteDocsInStep(rightFolder, "cfo-campbell"), true);
});
