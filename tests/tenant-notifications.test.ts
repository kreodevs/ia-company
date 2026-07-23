import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRunNotificationCopy } from "../src/lib/tenant-notifications.js";

describe("tenant-notifications", () => {
  it("builds human-readable copy for completed runs", () => {
    const copy = buildRunNotificationCopy({
      status: "COMPLETED",
      workflowName: "feature-development",
      totalCostUsd: 1.23,
      totalTokens: 4500,
    });
    assert.match(copy.title, /completado/i);
    assert.match(copy.body, /\$1\.23/);
    assert.match(copy.body, /4,500/);
  });

  it("builds copy for failed runs", () => {
    const copy = buildRunNotificationCopy({
      status: "FAILED",
      workflowName: "seo-review",
      totalCostUsd: 0,
      totalTokens: 0,
      errorMessage: "Usage limit reached",
    });
    assert.match(copy.title, /falló|failed/i);
    assert.match(copy.body, /Usage limit/);
  });
});
