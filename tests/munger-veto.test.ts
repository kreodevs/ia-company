import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMungerVeto,
  formatMungerVetoError,
  isVetoErrorMessage,
} from "../src/lib/munger-veto.js";
import { parseConsensusHandoffFromOutput } from "../src/lib/product-consensus.js";

describe("munger-veto", () => {
  it("extracts veto from critic-munger JSON handoff", () => {
    const output = `
Analysis complete.

\`\`\`json
{
  "consensusUpdate": "Unit economics fail at 5% conversion.",
  "veto": { "by": "critic-munger", "reason": "Negative margin at any realistic CAC" }
}
\`\`\`
`;
    const veto = extractMungerVeto("critic-munger", output);
    assert.ok(veto);
    assert.equal(veto?.by, "critic-munger");
    assert.match(veto?.reason ?? "", /Negative margin/);
  });

  it("ignores veto blocks from other agents", () => {
    const output = `\`\`\`json\n{"veto":{"by":"critic-munger","reason":"nope"}}\n\`\`\``;
    assert.equal(extractMungerVeto("ceo-bezos", output), null);
  });

  it("formats veto errors for run status", () => {
    const msg = formatMungerVetoError({
      by: "critic-munger",
      reason: "Wait for more data",
    });
    assert.equal(msg, "VETO: Wait for more data");
    assert.equal(isVetoErrorMessage(msg), true);
  });
});

describe("pipeline handoff parsing", () => {
  it("parses handoff fields used in convergence pipeline", () => {
    const output = `\`\`\`json
{
  "consensusUpdate": "## CFO\\nPricing at $19/mo",
  "nextAction": "CEO final call",
  "decisions": [{ "by": "cfo-campbell", "what": "Price $19", "why": "Competitive" }]
}
\`\`\``;

    const handoff = parseConsensusHandoffFromOutput(output, "cfo-campbell");
    assert.match(handoff.content ?? "", /Pricing at \$19/);
    assert.equal(handoff.nextAction, "CEO final call");
    assert.equal(handoff.decisions?.[0]?.what, "Price $19");
  });
});
