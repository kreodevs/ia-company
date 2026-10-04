/**
 * Fase H — métricas de dashboard (sin DATABASE_URL).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "../src/lib/office-departments.js";
import {
  computeAverageHandoffAcceptHours,
  computeDocumentFirstPassApprovalRate,
} from "../src/lib/dashboard.js";

describe("department management metrics (virtual depts)", () => {
  it("define los cuatro departamentos virtuales del plan", () => {
    const slugs = VIRTUAL_OFFICE_DEPARTMENTS.map((d) => d.slug);
    assert.deepEqual(slugs, ["strategy", "product", "engineering", "business"]);
  });
});

describe("dashboard metric helpers", () => {
  it("computeAverageHandoffAcceptHours promedia horas aceptación", () => {
    const base = new Date("2026-01-01T12:00:00Z");
    const avg = computeAverageHandoffAcceptHours([
      { createdAt: base, acceptedAt: new Date("2026-01-01T14:00:00Z") },
      { createdAt: base, acceptedAt: new Date("2026-01-01T16:00:00Z") },
    ]);
    assert.equal(avg, 3);
  });

  it("computeDocumentFirstPassApprovalRate es porcentaje aprobados", () => {
    assert.equal(computeDocumentFirstPassApprovalRate(3, 1), 75);
    assert.equal(computeDocumentFirstPassApprovalRate(0, 0), null);
  });
});
