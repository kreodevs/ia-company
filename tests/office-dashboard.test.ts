/**
 * Fase H — métricas de dashboard (sin DATABASE_URL).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "../src/lib/office-departments.js";

describe("department management metrics (virtual depts)", () => {
  it("define los cuatro departamentos virtuales del plan", () => {
    const slugs = VIRTUAL_OFFICE_DEPARTMENTS.map((d) => d.slug);
    assert.deepEqual(slugs, ["strategy", "product", "engineering", "business"]);
  });
});
