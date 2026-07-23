import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProductContentFromRevision,
  DEFAULT_PRODUCT_CONSENSUS_CONTENT,
  extractHandoffFromAgentOutput,
  extractHandoffFromSharedMemory,
  formatProductConsensusFileBody,
  type AgentHandoff,
} from "../src/lib/product-consensus.js";

describe("product consensus helpers", () => {
  const handoff: AgentHandoff = {
    agentName: "ceo-bezos",
    stepOrder: 1,
    content: "",
    nextAction: "Ship pricing page",
    decisions: [{ by: "ceo-bezos", what: "Pricing page live", why: "Highest LTV signal" }],
    openQuestions: ["Stripe vs LemonSqueezy?"],
  };

  it("builds a structured revision body from a handoff", () => {
    const content = buildProductContentFromRevision("# SnapOG\n", handoff);
    assert.match(content, /# SnapOG/);
    assert.match(content, /## Cycle 1 — ceo-bezos/);
    assert.match(content, /\*\*Decisions:\*\*/);
    assert.match(content, /Pricing page live/);
    assert.match(content, /Highest LTV signal/);
    assert.match(content, /\*\*Open questions:\*\*/);
    assert.match(content, /Stripe vs LemonSqueezy/);
    assert.match(content, /\*\*Next action:\*\* Ship pricing page/);
  });

  it("renders a veto block when Munger blocks", () => {
    const vetoed: AgentHandoff = {
      ...handoff,
      veto: { by: "critic-munger", reason: "Unit economics negative at 5% conversion" },
    };
    const content = buildProductContentFromRevision("", vetoed);
    assert.match(content, /\*\*VETO\*\* by critic-munger: Unit economics negative/);
  });

  it("appends explicit content inside the cycle section", () => {
    const handoffWithOverride: AgentHandoff = {
      ...handoff,
      content: "## Pricing tiers\n\n- Starter $9\n- Pro $29",
    };
    const content = buildProductContentFromRevision("# Old\n", handoffWithOverride);
    assert.match(content, /# Old/);
    assert.match(content, /## Cycle 1 — ceo-bezos/);
    assert.match(content, /## Pricing tiers/);
    assert.match(content, /Starter \$9/);
    assert.doesNotMatch(content, /^# Fresh rewrite/m);
  });

  it("appends Next Action only when missing", () => {
    const withNext = formatProductConsensusFileBody("# Doc\n", "Ship X");
    assert.match(withNext, /## Next Action\nShip X/);
    const already = formatProductConsensusFileBody("# Doc\n\n## Next Action\nDone", "Other");
    assert.equal(already.match(/## Next Action/g)?.length, 1);
    assert.doesNotMatch(already, /Other/);
  });

  it("default content includes product memory framing", () => {
    const text = DEFAULT_PRODUCT_CONSENSUS_CONTENT("SnapOG");
    assert.match(text, /# SnapOG/);
    assert.match(text, /Product-scoped consensus memory/);
  });

  it("extracts handoff from agent output JSON block", () => {
    const output = `## Analysis
Three tiers recommended.

\`\`\`json
{
  "consensusUpdate": "## Pricing model\\n- Starter: $9/mo",
  "nextAction": "Validate with 5 users",
  "decisions": [{"by": "cfo-campbell", "what": "3 tiers", "why": "Clear segmentation"}]
}
\`\`\``;
    const extracted = extractHandoffFromAgentOutput(output, "cfo-campbell", 2);
    assert.equal(extracted.content, "## Pricing model\n- Starter: $9/mo");
    assert.equal(extracted.nextAction, "Validate with 5 users");
    assert.equal(extracted.decisions?.[0].what, "3 tiers");
  });

  it("falls back to prose outside JSON when consensusUpdate is missing", () => {
    const output = `Key finding: target SMB at $29/mo.

\`\`\`json
{ "nextAction": "Sales playbook next" }
\`\`\``;
    const extracted = extractHandoffFromAgentOutput(output, "sales-ross", 3);
    assert.match(extracted.content, /Key finding: target SMB/);
    assert.equal(extracted.nextAction, "Sales playbook next");
  });

  it("extracts structured handoff from shared memory", () => {
    const mem = {
      consensusUpdate: "## Cycle summary\nPivoted to B2B.",
      nextAction: "Talk to 3 design partners",
      decisions: [{ by: "ceo-bezos", what: "B2B focus", why: "Higher willingness to pay" }],
      openQuestions: ["What price?"],
      veto: { by: "critic-munger", reason: "Wait" },
      lastOutput: "ignored because consensusUpdate is present",
    };
    const extracted = extractHandoffFromSharedMemory(mem, "ceo-bezos");
    assert.equal(extracted.agentName, "ceo-bezos");
    assert.equal(extracted.content, "## Cycle summary\nPivoted to B2B.");
    assert.equal(extracted.nextAction, "Talk to 3 design partners");
    assert.equal(extracted.decisions?.length, 1);
    assert.equal(extracted.decisions?.[0].what, "B2B focus");
    assert.equal(extracted.openQuestions?.[0], "What price?");
    assert.deepEqual(extracted.veto, { by: "critic-munger", reason: "Wait" });
  });

  it("falls back to lastOutput when consensusUpdate is missing", () => {
    const mem = { lastOutput: "free-form thoughts", nextAction: "do X" };
    const extracted = extractHandoffFromSharedMemory(mem, "cto-vogels");
    assert.equal(extracted.content, "free-form thoughts");
    assert.equal(extracted.nextAction, "do X");
  });

  it("ignores malformed decisions", () => {
    const mem = {
      decisions: [
        { by: "ok", what: "valid" },
        { by: "no-what" },
        "not-an-object",
      ],
    };
    const extracted = extractHandoffFromSharedMemory(mem, "ceo-bezos");
    assert.equal(extracted.decisions?.length, 1);
    assert.equal(extracted.decisions?.[0].by, "ok");
  });

  it("appendProductHandoff writes revision.productId from ProductConsensus.id, not TenantProduct.id", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../src/lib/product-consensus.ts", import.meta.url),
      "utf8",
    );
    // Find the revision.create() block inside appendProductHandoff and
    // assert it uses consensus.id (ProductConsensus.id) for productId.
    // Regression guard for: "Foreign key constraint violated on
    // ProductConsensusRevision_productId_fkey".
    const revisionCreate = src.match(
      /tx\.productConsensusRevision\.create\(\{[\s\S]*?\}\)/,
    );
    assert.ok(revisionCreate, "expected to find a productConsensusRevision.create call");
    assert.match(
      revisionCreate[0],
      /productId:\s*consensus\.id\b/,
      "revision create must set productId to consensus.id (ProductConsensus row id)",
    );
    assert.doesNotMatch(
      revisionCreate[0],
      /productId:\s*consensus\.productId\b/,
      "revision create must NOT set productId to consensus.productId (that is TenantProduct.id)",
    );
  });
});
