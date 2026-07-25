import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { GenerateTextResult, ToolSet } from "ai";
import {
  agentWroteDocsInStep,
  persistAgentDeliverableIfMissing,
  shouldSkipHandoffDocPersist,
} from "../src/lib/agent-deliverables.js";
import {
  buildHandoffRevisionContent,
  extractHandoffFromAgentOutput,
} from "../src/lib/product-consensus.js";

function mockWriteFileResponse(path: string): GenerateTextResult<ToolSet, unknown> {
  return {
    text: "",
    steps: [
      {
        toolResults: [
          {
            toolName: "write_file",
            toolCallId: "call-1",
            result: { path },
          },
        ],
      },
    ],
  } as GenerateTextResult<ToolSet, unknown>;
}

function mockTextOnlyResponse(text: string): GenerateTextResult<ToolSet, unknown> {
  return { text, steps: [] } as GenerateTextResult<ToolSet, unknown>;
}

describe("deliverable dedupe", () => {
  it("detects when agent wrote under docs/", () => {
    assert.equal(agentWroteDocsInStep(mockWriteFileResponse("docs/ceo/pricing.md")), true);
    assert.equal(agentWroteDocsInStep(mockWriteFileResponse("src/index.ts")), false);
    assert.equal(agentWroteDocsInStep(mockTextOnlyResponse("plain prose")), false);
  });

  it("skips convergence doc persist when step already wrote or saved", () => {
    assert.equal(shouldSkipHandoffDocPersist({ wroteDocs: true }), true);
    assert.equal(
      shouldSkipHandoffDocPersist({ savedDeliverablePath: "docs/ceo/2026-pricing.md" }),
      true,
    );
    assert.equal(shouldSkipHandoffDocPersist({}), false);
  });

  it("persistAgentDeliverableIfMissing skips when agent already wrote docs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ac-deliverable-"));
    const saved = await persistAgentDeliverableIfMissing({
      workspaceRoot: dir,
      agentName: "ceo-bezos",
      workflowName: "pricing-and-monetization",
      runId: "run_test",
      output: "## Pricing\n\nThree tiers.",
      response: mockWriteFileResponse("docs/ceo/pricing-plan.md"),
    });
    assert.equal(saved, null);
    const entries = await readdir(join(dir, "docs", "ceo")).catch(() => []);
    assert.equal(entries.length, 0);
  });

  it("persistAgentDeliverableIfMissing writes fallback doc when no write_file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ac-deliverable-"));
    const output = `## Market sizing\n\nTAM $2B.

\`\`\`json
{ "nextAction": "Validate pricing", "consensusUpdate": "## Pricing hypothesis" }
\`\`\``;

    const saved = await persistAgentDeliverableIfMissing({
      workspaceRoot: dir,
      agentName: "research-thompson",
      workflowName: "pricing-and-monetization",
      runId: "run_test_2",
      output,
      response: mockTextOnlyResponse(output),
    });

    assert.ok(saved?.startsWith("docs/research/"));
    const body = await readFile(join(dir, saved!), "utf8");
    assert.match(body, /research-thompson/);
    assert.match(body, /Market sizing/);
  });
});

describe("run → handoff → revision pipeline", () => {
  it("extracts handoff JSON and builds revision-only content", () => {
    const agentOutput = `## Pricing recommendation

Starter at $19/mo.

\`\`\`json
{
  "consensusUpdate": "## Pricing tiers\\n- Starter $19",
  "nextAction": "CEO sign-off",
  "decisions": [{"by": "cfo-campbell", "what": "Starter $19", "why": "Low friction"}]
}
\`\`\``;

    const handoff = extractHandoffFromAgentOutput(agentOutput, "cfo-campbell", 3);
    const revision = buildHandoffRevisionContent(handoff);

    assert.match(revision, /## Cycle 3 — cfo-campbell/);
    assert.match(revision, /Pricing tiers/);
    assert.match(revision, /Starter \$19/);
    assert.match(revision, /\*\*Next action:\*\* CEO sign-off/);
    assert.doesNotMatch(revision, /^## Pricing recommendation/m);
  });
});
