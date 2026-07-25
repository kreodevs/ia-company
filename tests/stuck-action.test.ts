import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStuckPivotNextAction,
  isStuckPivotNextAction,
  sanitizeLoadedNextAction,
  unwrapStuckNextAction,
} from "../src/lib/stuck-action.js";

test("unwrapStuckNextAction peels nested STUCK wrappers", () => {
  const nested =
    'STUCK on "STUCK on \\"Validate pricing\\" — pivot: ship smallest vertical slice today" — pivot: ship smallest vertical slice today';
  assert.equal(unwrapStuckNextAction(nested), "Validate pricing");
});

test("unwrapStuckNextAction recovers from truncated corruption", () => {
  const corrupted = 'STUCK on "STUCK on "STUCK on "STUCK on "STUCK on "ST';
  const result = unwrapStuckNextAction(corrupted);
  assert.equal(result, "Ship the smallest vertical slice today");
});

test("buildStuckPivotNextAction never nests STUCK prefixes", () => {
  const once = buildStuckPivotNextAction("Run discovery");
  const twice = buildStuckPivotNextAction(once);
  assert.equal(once, twice);
  assert.equal(isStuckPivotNextAction(once), true);
});

test("sanitizeLoadedNextAction collapses corrupted chains to one pivot line", () => {
  const corrupted = 'STUCK on "STUCK on "STUCK on "broken';
  const sanitized = sanitizeLoadedNextAction(corrupted);
  assert.match(sanitized, /^STUCK on ".+" — pivot: ship smallest vertical slice today$/);
  assert.doesNotMatch(sanitized, /STUCK on "STUCK on/);
});

test("normal nextAction passes through unchanged", () => {
  assert.equal(sanitizeLoadedNextAction("Evaluate top pipeline idea"), "Evaluate top pipeline idea");
});
