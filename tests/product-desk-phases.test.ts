import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_PLAYBOOKS,
  getPlaybookById,
  playbooksForOrgType,
} from "../src/lib/product-playbooks.js";
import { computeProductRecommendations } from "../src/lib/product-desk-recommender.js";

describe("product-playbooks", () => {
  it("includes sunset-review and support-triage", () => {
    assert.ok(getPlaybookById("sunset-review"));
    assert.ok(getPlaybookById("support-triage"));
    assert.equal(PRODUCT_PLAYBOOKS.length >= 5, true);
  });

  it("filters playbooks by org unit type", () => {
    const marketing = playbooksForOrgType("marketing_agency");
    assert.ok(marketing.some((p) => p.id === "adapt-creative"));
    const all = playbooksForOrgType(null);
    assert.equal(all.length, PRODUCT_PLAYBOOKS.length);
  });
});

describe("product-desk-recommender", () => {
  it("computeProductRecommendations is exported and callable", () => {
    assert.equal(typeof computeProductRecommendations, "function");
  });
});
