import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectAgentStepOutput,
  collectToolStepArtifacts,
} from "../src/lib/agent-deliverables.js";

describe("collectAgentStepOutput", () => {
  it("joins text from all steps when final text is empty", () => {
    const output = collectAgentStepOutput({
      text: "",
      steps: [
        { text: "Step one analysis." },
        { text: "Final recommendation: 3 tiers." },
      ],
    } as Parameters<typeof collectAgentStepOutput>[0]);

    assert.match(output, /Step one analysis/);
    assert.match(output, /Final recommendation/);
  });

  it("deduplicates identical step text", () => {
    const output = collectAgentStepOutput({
      text: "Same text",
      steps: [{ text: "Same text" }],
    } as Parameters<typeof collectAgentStepOutput>[0]);

    assert.equal(output, "Same text");
  });

  it("falls back to read_file tool results when assistant text is empty", () => {
    const output = collectAgentStepOutput({
      text: "",
      steps: [
        {
          text: "",
          toolResults: [
            {
              toolCallId: "c1",
              toolName: "read_file",
              result: { path: "README.md", content: "# Product overview\nSEO landing copy." },
            },
          ],
        },
      ],
    } as Parameters<typeof collectAgentStepOutput>[0]);

    assert.match(output, /README\.md/);
    assert.match(output, /SEO landing copy/);
  });
});

describe("collectToolStepArtifacts", () => {
  it("captures write_file content from tool call args", () => {
    const output = collectToolStepArtifacts({
      steps: [
        {
          toolCalls: [
            {
              toolCallId: "w1",
              toolName: "write_file",
              args: { path: "docs/marketing/seo.md", content: "## Meta title\nAlebrije MemorIA" },
            },
          ],
        },
      ],
    } as Parameters<typeof collectToolStepArtifacts>[0]);

    assert.match(output, /docs\/marketing\/seo\.md/);
    assert.match(output, /Meta title/);
  });
});
