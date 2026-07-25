import test from "node:test";
import assert from "node:assert/strict";
import {
  presetConvergencePromptSection,
  resolvePresetTask,
  PRIMARY_PRODUCT_PRESET_IDS,
} from "../src/lib/product-work-launcher.js";

test("presetConvergencePromptSection includes deliverable hint for SEO preset", () => {
  const section = presetConvergencePromptSection("seo-review");
  assert.match(section, /SEO/i);
  assert.match(section, /docs\/research/i);
});

test("resolvePresetTask substitutes product name in SEO preset", () => {
  const task = resolvePresetTask("seo-review", "Alebrije MemorIA");
  assert.ok(task);
  assert.match(task!, /Alebrije MemorIA/);
});

test("primary preset ids cover actionable flows", () => {
  assert.ok(PRIMARY_PRODUCT_PRESET_IDS.includes("seo-review"));
  assert.ok(PRIMARY_PRODUCT_PRESET_IDS.includes("pricing-and-monetization"));
});
