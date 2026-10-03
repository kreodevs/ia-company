/**
 * Reingeniería 2, Corte 2 (Fase D) — Inbox empresarial.
 * Test puro de orden: prioridad por categoría y desempate por fecha.
 * No requiere DATABASE_URL.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  officeInboxCategoryPriority,
  sortOfficeInboxItems,
  type OfficeInboxCategory,
  type OfficeInboxItem,
} from "../src/lib/office-inbox.js";

function makeItem(
  category: OfficeInboxCategory,
  createdAt: string,
  id: string,
): OfficeInboxItem {
  return {
    id,
    kind: `kind_${category}`,
    category,
    priority: officeInboxCategoryPriority(category),
    title: id,
    body: null,
    href: "/office",
    runId: null,
    refId: id,
    resolve: null,
    createdAt,
  };
}

describe("office inbox ordering", () => {
  it("prioriza decisiones por encima del resto", () => {
    assert.equal(officeInboxCategoryPriority("decision"), 1);
    assert.equal(officeInboxCategoryPriority("handoff"), 2);
    assert.equal(officeInboxCategoryPriority("blocked"), 3);
    assert.equal(officeInboxCategoryPriority("failure"), 4);
    assert.equal(officeInboxCategoryPriority("review"), 5);
    assert.equal(officeInboxCategoryPriority("cost"), 6);
    assert.equal(officeInboxCategoryPriority("info"), 7);
  });

  it("ordena por prioridad de categoría antes que por fecha", () => {
    const old = "2020-01-01T00:00:00.000Z";
    const recent = "2026-10-03T09:00:00.000Z";
    const items = [
      makeItem("info", recent, "info-recent"),
      makeItem("cost", recent, "cost-recent"),
      makeItem("decision", old, "decision-old"),
    ];
    const sorted = sortOfficeInboxItems(items);
    assert.deepEqual(
      sorted.map((item) => item.id),
      ["decision-old", "cost-recent", "info-recent"],
    );
  });

  it("desempata por fecha descendente dentro de la misma categoría", () => {
    const items = [
      makeItem("blocked", "2026-10-01T10:00:00.000Z", "blocked-old"),
      makeItem("blocked", "2026-10-03T10:00:00.000Z", "blocked-new"),
      makeItem("blocked", "2026-10-02T10:00:00.000Z", "blocked-mid"),
    ];
    const sorted = sortOfficeInboxItems(items);
    assert.deepEqual(
      sorted.map((item) => item.id),
      ["blocked-new", "blocked-mid", "blocked-old"],
    );
  });

  it("no muta el array original", () => {
    const items = [
      makeItem("info", "2026-10-01T10:00:00.000Z", "a"),
      makeItem("decision", "2026-10-01T10:00:00.000Z", "b"),
    ];
    const original = [...items];
    sortOfficeInboxItems(items);
    assert.deepEqual(items, original);
  });

  it("filtra por categoría exacta", () => {
    const items = [
      makeItem("decision", "2026-10-03T10:00:00.000Z", "dec"),
      makeItem("review", "2026-10-03T11:00:00.000Z", "rev"),
    ];
    const filtered = sortOfficeInboxItems(items).filter((item) => item.category === "review");
    assert.deepEqual(
      filtered.map((item) => item.id),
      ["rev"],
    );
  });
});