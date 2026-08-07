import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertValidProductUrlField,
  buildProductWebUrlsPromptSection,
  normalizeProductUrl,
} from "../src/lib/product-urls.js";

describe("product-urls", () => {
  it("normalizes bare domains to https", () => {
    assert.equal(normalizeProductUrl("memoria.app"), "https://memoria.app");
  });

  it("rejects invalid urls", () => {
    assert.equal(normalizeProductUrl("not a url"), null);
  });

  it("builds pricing prompt section", () => {
    const section = buildProductWebUrlsPromptSection({
      pricingPageUrl: "https://memoria.app/pricing",
    });
    assert.match(section, /pricing/i);
    assert.match(section, /autoritativa|authoritative/i);
  });

  it("assertValidProductUrlField throws on bad input", () => {
    assert.throws(() => assertValidProductUrlField("website", "???"), /Invalid website URL/);
  });
});
