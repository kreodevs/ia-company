import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGitHubRepoUrl } from "../src/lib/github-repo.js";
import { parseProductProfile, buildProductProfilePromptSection } from "../src/lib/product-profile.js";

describe("parseGitHubRepoUrl", () => {
  it("parses https github urls", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/kreodevs/ia-company");
    assert.ok(parsed);
    assert.equal(parsed.fullName, "kreodevs/ia-company");
    assert.equal(parsed.owner, "kreodevs");
    assert.equal(parsed.repo, "ia-company");
  });

  it("parses ssh github urls", () => {
    const parsed = parseGitHubRepoUrl("git@github.com:org/my-app.git");
    assert.ok(parsed);
    assert.equal(parsed.fullName, "org/my-app");
  });

  it("rejects invalid urls", () => {
    assert.equal(parseGitHubRepoUrl("https://gitlab.com/org/repo"), null);
    assert.equal(parseGitHubRepoUrl(""), null);
  });
});

describe("parseProductProfile", () => {
  it("parses a minimal valid profile", () => {
    const profile = parseProductProfile({
      summary: "AI agency platform",
      valueProposition: "Autonomous product teams",
      techStack: ["TypeScript", "React"],
    });
    assert.ok(profile);
    assert.equal(profile.summary, "AI agency platform");
    assert.deepEqual(profile.techStack, ["TypeScript", "React"]);
  });

  it("returns null without summary", () => {
    assert.equal(parseProductProfile({ valueProposition: "x" }), null);
  });

  it("builds prompt section from profile", () => {
    const section = buildProductProfilePromptSection(
      parseProductProfile({
        summary: "Test product",
        nextAction: "Ship MVP",
      }),
    );
    assert.match(section, /Product profile/);
    assert.match(section, /Test product/);
    assert.match(section, /Ship MVP/);
  });
});
