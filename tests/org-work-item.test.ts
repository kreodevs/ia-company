import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultWorkItemKindForOrgType,
  presetForOrgWorkItem,
  workflowForOrgWorkItem,
} from "../src/lib/org-work-item.js";
import { WORKFLOW_NAMES } from "../src/lib/workflow-names.js";

describe("org work item mapping", () => {
  it("defaults client for marketing agency", () => {
    assert.equal(defaultWorkItemKindForOrgType("marketing_agency"), "client");
    assert.equal(defaultWorkItemKindForOrgType("product_studio"), "product");
    assert.equal(defaultWorkItemKindForOrgType("custom"), "project");
  });

  it("maps marketing agency campaign to content-sprint", () => {
    assert.equal(presetForOrgWorkItem("campaign", "marketing_agency"), "content-sprint");
    assert.equal(workflowForOrgWorkItem("campaign", "marketing_agency", 1), WORKFLOW_NAMES.CONTENT_SPRINT);
  });

  it("maps marketing agency client to campaign-launch", () => {
    assert.equal(presetForOrgWorkItem("client", "marketing_agency"), "campaign-launch");
    assert.equal(workflowForOrgWorkItem("client", "marketing_agency", 1), WORKFLOW_NAMES.CAMPAIGN_LAUNCH);
  });

  it("alternates presets for generic product work items in marketing agency", () => {
    assert.equal(presetForOrgWorkItem("product", "marketing_agency", 2), "content-sprint");
    assert.equal(presetForOrgWorkItem("product", "marketing_agency", 1), "campaign-launch");
  });
});
