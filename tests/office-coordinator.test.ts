import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OFFICE_SERVICES } from "../src/lib/office-coordinator.js";

describe("office-coordinator", () => {
  it("exports service catalog with unique ids", () => {
    const ids = OFFICE_SERVICES.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 6);
  });

  it("each service has agents and deliverable key", () => {
    for (const service of OFFICE_SERVICES) {
      assert.ok(service.agentNames.length >= 1);
      assert.ok(service.deliverableKey.startsWith("office.deliverables."));
      assert.ok(service.labelKey.startsWith("office.serviceTemplates."));
    }
  });
});
