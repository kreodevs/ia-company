import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatInterestsPromptSection,
  INTEREST_CATEGORIES,
  scoreIdeaAgainstInterests,
} from "../src/lib/tenant-interests.js";

describe("tenant interests helpers", () => {
  it("matches idea title against interest keywords", () => {
    const score = scoreIdeaAgainstInterests(
      "Live NBA scores & betting odds",
      null,
      ["sports"],
    );
    assert.ok(score >= 3, `expected >= 3 keyword matches, got ${score}`);
  });

  it("returns zero when no interests are set", () => {
    const score = scoreIdeaAgainstInterests("Some random product", null, []);
    assert.equal(score, 0);
  });

  it("ignores unknown interest categories", () => {
    const score = scoreIdeaAgainstInterests("Anything", null, ["unknown-id", "sports"]);
    assert.ok(score >= 0);
  });

  it("matches multi-category ideas", () => {
    const score = scoreIdeaAgainstInterests(
      "AI-powered CRM with lead scoring",
      "ML agents for sales pipeline",
      ["crm", "ai-ml"],
    );
    assert.ok(score >= 4, `expected high score, got ${score}`);
  });

  it("is case-insensitive", () => {
    const a = scoreIdeaAgainstInterests("NBA Scores", null, ["sports"]);
    const b = scoreIdeaAgainstInterests("nba scores", null, ["sports"]);
    assert.equal(a, b);
  });

  it("formats an empty section when no interests are set", () => {
    assert.equal(formatInterestsPromptSection([]), "");
  });

  it("formats a prompt section listing each selected category", () => {
    const text = formatInterestsPromptSection(["sports", "gaming"]);
    assert.match(text, /## Tenant interests/);
    assert.match(text, /Sports/);
    assert.match(text, /Gaming/);
  });

  it("exposes at least the seed categories required by the UI", () => {
    const ids = INTEREST_CATEGORIES.map((c) => c.id);
    for (const required of [
      "sports",
      "gaming",
      "crm",
      "fintech",
      "health",
      "education",
      "devtools",
      "marketing",
      "ecommerce",
      "saas-b2b",
      "social",
      "ai-ml",
      "content-creator",
      "productivity",
    ]) {
      assert.ok(ids.includes(required), `missing category ${required}`);
    }
  });
});
