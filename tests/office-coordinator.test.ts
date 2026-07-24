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

  it("does not auto-assign a product when productId is omitted", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(new URL("../src/lib/office-coordinator.ts", import.meta.url), "utf-8");
    assert.match(
      src,
      /const product = options\.productId[\s\S]*?: null;/,
      "planOfficeTask must only bind a product when productId is explicitly passed",
    );
    assert.doesNotMatch(
      src,
      /products\.find\(\(p\) => p\.phase === "building"/,
      "planOfficeTask must not default to building/launching product",
    );
  });
});
