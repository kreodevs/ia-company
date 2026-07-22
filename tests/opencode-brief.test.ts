import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildImplementationBrief } from "../src/lib/opencode-brief.js";

describe("buildImplementationBrief", () => {
  it("includes product context and brief body", () => {
    const brief = buildImplementationBrief({
      brief: "Add login page",
      sharedMemory: { nextAction: "Ship auth MVP", focusProductName: "Router AI" },
      productSlug: "router-ai",
      tenantSlug: "router-ai",
      projectPath: "/repos/router-ai",
    });

    assert.match(brief, /Add login page/);
    assert.match(brief, /Router AI/);
    assert.match(brief, /Ship auth MVP/);
    assert.match(brief, /\/repos\/router-ai/);
  });
});
