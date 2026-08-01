import test from "node:test";
import assert from "node:assert/strict";
import {
  clearVerticalPackCache,
  discoverVerticalPacks,
  getVerticalPackById,
  mergePresetsForPack,
} from "../src/lib/vertical-packs.js";
import { resolvePresetTask } from "../src/lib/product-work-launcher.js";

test("discoverVerticalPacks finds snapog manifest", async () => {
  clearVerticalPackCache();
  const packs = await discoverVerticalPacks();
  const snapog = packs.find((p) => p.id === "snapog");
  assert.ok(snapog, "snapog pack should exist");
  assert.equal(snapog.product.slug, "snapog");
  assert.ok(snapog.workflows.includes("pricing-and-monetization"));
  assert.ok(snapog.presets.some((p) => p.presetId === "pricing-and-monetization"));
});

test("getVerticalPackById loads snapog by id", async () => {
  clearVerticalPackCache();
  const pack = await getVerticalPackById("snapog");
  assert.ok(pack);
  assert.equal(pack!.name, "SnapOG");
});

test("mergePresetsForPack overrides SnapOG pricing task template", async () => {
  clearVerticalPackCache();
  const pack = await getVerticalPackById("snapog");
  assert.ok(pack);
  const presets = mergePresetsForPack(pack);
  const pricing = presets.find((p) => p.id === "pricing-and-monetization");
  assert.ok(pricing);
  assert.match(pricing!.taskTemplate, /SnapOG Pro/i);
  assert.match(pricing!.deliverableHint, /docs\/cfo/i);
});

test("resolvePresetTask uses pack override after cache warm", async () => {
  clearVerticalPackCache();
  await discoverVerticalPacks();
  const task = resolvePresetTask("pricing-and-monetization", "SnapOG", "snapog");
  assert.ok(task);
  assert.match(task!, /Bannerbear/i);
});

test("discoverVerticalPacks returns bundled snapog when projects dir is missing", async () => {
  clearVerticalPackCache();
  const previous = process.env.WORKSPACE_ROOT;
  process.env.WORKSPACE_ROOT = `/tmp/ac-missing-projects-${Date.now()}`;
  try {
    const packs = await discoverVerticalPacks();
    assert.ok(packs.some((p) => p.id === "snapog"));
  } finally {
    if (previous === undefined) delete process.env.WORKSPACE_ROOT;
    else process.env.WORKSPACE_ROOT = previous;
    clearVerticalPackCache();
  }
});
