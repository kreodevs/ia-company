import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertEmailContentLimits,
  normalizeEmail,
  parseRecipientList,
} from "../src/lib/tenant-email-guardrails.js";

describe("tenant-email-guardrails", () => {
  it("normalizes and deduplicates recipient lists", () => {
    assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
    const parsed = parseRecipientList("a@test.com, B@test.com ; c@test.com\na@test.com");
    assert.deepEqual(parsed, ["a@test.com", "b@test.com", "c@test.com"]);
  });

  it("rejects empty subject or body", () => {
    assert.throws(() => assertEmailContentLimits("", "body"), /subject/i);
    assert.throws(() => assertEmailContentLimits("ok", "   "), /body/i);
  });

  it("rejects oversized content", () => {
    assert.throws(
      () => assertEmailContentLimits("x".repeat(201), "ok"),
      /subject exceeds/i,
    );
    assert.throws(
      () => assertEmailContentLimits("ok", "y".repeat(100_001)),
      /body exceeds/i,
    );
  });
});
