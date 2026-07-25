import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJsonFromLlm } from "../src/lib/catalog-studio-llm.js";
import { slugifyCatalogName } from "../src/lib/tenant-catalog.js";
import { applySkillProposal } from "../src/lib/skill-studio.js";
import { applyAgentProposal } from "../src/lib/agent-studio.js";
import type { AgentStudioProposal, SkillStudioProposal } from "../src/lib/catalog-studio-types.js";

describe("catalog studio helpers", () => {
  it("slugifyCatalogName produces kebab-case slugs", () => {
    assert.equal(slugifyCatalogName("SEO Content Writer!"), "seo-content-writer");
    assert.equal(slugifyCatalogName("  Copy Manager  "), "copy-manager");
  });

  it("parseJsonFromLlm handles fenced and raw JSON", () => {
    const fenced = parseJsonFromLlm('Here:\n```json\n{"skill":{"name":"x"}}\n```');
    assert.equal(fenced?.skill && typeof fenced.skill === "object" ? (fenced.skill as { name: string }).name : null, "x");

    const raw = parseJsonFromLlm('{"reuse":{"existingSkillName":"seo-audit"}}');
    assert.deepEqual(raw?.reuse, { existingSkillName: "seo-audit" });
  });

  it("parseJsonFromLlm returns null on invalid JSON", () => {
    assert.equal(parseJsonFromLlm("not json"), null);
  });
});

describe("skill studio apply", () => {
  it("requires human approval to create new skill", async () => {
    const proposal: SkillStudioProposal = {
      brief: "test brief",
      skill: {
        name: "test-skill",
        description: "desc",
        promptContent: "prompt",
      },
      mungerReview: { approved: true, notes: "ok" },
    };

    await assert.rejects(
      () => applySkillProposal("tenant-does-not-exist", { proposal, approved: false }),
      /Human approval required/,
    );
  });

  it("blocks apply when Munger vetoed", async () => {
    const proposal: SkillStudioProposal = {
      brief: "test",
      skill: { name: "x", description: "d", promptContent: "p" },
      mungerReview: {
        approved: false,
        notes: "fatal",
        veto: { by: "critic-munger", reason: "illegal scope" },
      },
    };

    await assert.rejects(
      () => applySkillProposal("tenant-x", { proposal, approved: true }),
      /VETO/,
    );
  });
});

describe("agent studio apply", () => {
  it("requires human approval to create new agent", async () => {
    const proposal: AgentStudioProposal = {
      brief: "test brief",
      agent: {
        name: "test-agent",
        role: "Tester",
        systemPrompt: "You test.",
        skillNames: [],
      },
      existingSkillNames: [],
      newSkills: [],
      mungerReview: { approved: true, notes: "ok" },
    };

    await assert.rejects(
      () => applyAgentProposal("tenant-does-not-exist", { proposal, approved: false }),
      /Human approval required/,
    );
  });

  it("requires each new skill to be explicitly approved", async () => {
    const proposal: AgentStudioProposal = {
      brief: "test",
      agent: {
        name: "copy-manager",
        role: "Copy",
        systemPrompt: "Write copy.",
        skillNames: [],
      },
      existingSkillNames: [],
      newSkills: [{ name: "new-skill", description: "d", promptContent: "p" }],
      mungerReview: { approved: true, notes: "ok" },
    };

    await assert.rejects(
      () =>
        applyAgentProposal("tenant-x", {
          proposal,
          approved: true,
          approvedNewSkillNames: [],
        }),
      /was not approved/,
    );
  });
});
