import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  executionRunCreateData,
  resolveRunScopeFields,
} from "../src/lib/run-scope.js";

describe("run-scope", () => {
  it("resolves orgUnitId and productId from memory and overrides", () => {
    assert.deepEqual(
      resolveRunScopeFields({
        sharedMemory: { orgUnitId: "org-1", productId: "prod-1" },
      }),
      { orgUnitId: "org-1", productId: "prod-1" },
    );
    assert.deepEqual(
      resolveRunScopeFields({
        sharedMemory: { orgUnitId: "org-mem" },
        orgUnitId: "org-explicit",
        productId: "prod-explicit",
      }),
      { orgUnitId: "org-explicit", productId: "prod-explicit" },
    );
  });

  it("builds prisma create payload with scope columns", () => {
    const data = executionRunCreateData({
      workflowId: "wf-1",
      tenantId: "tenant-1",
      sharedMemory: { task: "x", orgUnitId: "org-1", productId: "prod-1" },
    });
    assert.equal(data.workflowId, "wf-1");
    assert.equal(data.orgUnitId, "org-1");
    assert.equal(data.productId, "prod-1");
    assert.equal(data.status, "PENDING");
  });
});
