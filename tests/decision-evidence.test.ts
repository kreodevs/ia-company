import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickDocumentForAgent } from "../src/lib/decision-evidence.js";
import type { OfficeEncargoDocument } from "../src/lib/office-encargos.js";

const summary =
  "Auditoría UX completada. Documentado en `docs/product/webhookpulse_ux_norman_cycle_55.md`.";

const uxDoc: OfficeEncargoDocument = {
  id: "ux",
  kind: "file",
  agentName: "product-norman",
  title: "webhookpulse_ux_norman_cycle_55.md",
  markdown: "# WebhookPulse UX audit\n\nFull deliverable.",
  path: "docs/product/webhookpulse_ux_norman_cycle_55.md",
  stepOrder: 2,
};

const memoryDoc: OfficeEncargoDocument = {
  id: "memory",
  kind: "file",
  agentName: "product-norman",
  title: "handoff.md",
  markdown: `# Company Memory\n\n${"Cycle summary. ".repeat(200)}`,
  path: "docs/product/2026-handoff.md",
  stepOrder: 3,
};

describe("decision-evidence pickDocumentForAgent", () => {
  it("prefers the docs path cited in the evidence summary", () => {
    const picked = pickDocumentForAgent([memoryDoc, uxDoc], "product-norman", summary);
    assert.equal(picked?.path, uxDoc.path);
    assert.match(picked?.markdown ?? "", /WebhookPulse UX audit/);
  });

  it("falls back to longest agent document when no path is cited", () => {
    const picked = pickDocumentForAgent([memoryDoc, uxDoc], "product-norman");
    assert.equal(picked?.id, memoryDoc.id);
  });

  it("returns null when a cited path is missing from run documents", () => {
    const picked = pickDocumentForAgent([memoryDoc], "product-norman", summary);
    assert.equal(picked, null);
  });
});
