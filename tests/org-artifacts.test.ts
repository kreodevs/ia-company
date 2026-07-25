import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artifactTitle } from "../src/lib/org-artifacts.js";
import { WORKFLOW_NAMES } from "../src/lib/workflow-names.js";

describe("org artifacts", () => {
  it("artifactTitle includes step order for dedupe keys", () => {
    assert.equal(artifactTitle("copy-manager", "content-sprint", 2), "copy-manager — content-sprint · step 2");
    assert.notEqual(
      artifactTitle("copy-manager", "content-sprint", 1),
      artifactTitle("copy-manager", "content-sprint", 2),
    );
  });

  it("workflow names include department presets", () => {
    assert.equal(WORKFLOW_NAMES.CONTENT_SPRINT, "content-sprint");
    assert.equal(WORKFLOW_NAMES.CAMPAIGN_LAUNCH, "campaign-launch");
  });
});
