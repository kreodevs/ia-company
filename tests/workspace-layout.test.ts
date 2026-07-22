import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentDocsPath, buildWorkspacePromptSection } from "../src/lib/workspace-layout.js";

describe("workspace layout", () => {
  it("maps agent names to docs subfolders", () => {
    assert.equal(agentDocsPath("research-thompson"), "docs/research");
    assert.equal(agentDocsPath("cfo-campbell"), "docs/cfo");
  });

  it("warns against projects/ inside tenant workspace", () => {
    const section = buildWorkspacePromptSection({});
    assert.match(section, /no `projects\/` folder/i);
  });

  it("describes product workspace as cwd for focused runs", () => {
    const section = buildWorkspacePromptSection({ productSlug: "snapog", productName: "SnapOG" });
    assert.match(section, /already inside it/i);
  });
});
