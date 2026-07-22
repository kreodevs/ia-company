import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRationaleFromMemory, type ProposalEvidence } from "../src/lib/decision-proposals.js";

describe("decision-proposals helpers", () => {
  it("builds GO rationale with headline", () => {
    const { rationale, evidence } = buildRationaleFromMemory(
      [
        { agentName: "ceo-bezos", output: "Big market." },
        { agentName: "critic-munger", output: "Watch CAC." },
      ],
      "go",
      "SnapOG-derivated",
    );
    assert.match(rationale, /Recommended GO/);
    assert.match(rationale, /SnapOG-derivated/);
    assert.equal(evidence.length, 2);
    assert.equal(evidence[0].agent, "ceo-bezos");
  });

  it("builds NO-GO rationale with headline", () => {
    const { rationale } = buildRationaleFromMemory(
      [{ agentName: "critic-munger", output: "No clear ICP." }],
      "no_go",
      "ICP is fuzzy",
    );
    assert.match(rationale, /Recommended NO-GO/);
  });

  it("skips empty outputs when building evidence", () => {
    const { evidence } = buildRationaleFromMemory(
      [
        { agentName: "ceo-bezos", output: "   " },
        { agentName: "cto-vogels", output: "Stack works." },
      ],
      "go",
      "fallback",
    );
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].agent, "cto-vogels");
  });

  it("truncates long agent outputs to a 600-char summary", () => {
    const longOutput = "x".repeat(2000);
    const { evidence } = buildRationaleFromMemory(
      [{ agentName: "ceo-bezos", output: longOutput }],
      "go",
      "fallback",
    );
    assert.equal(evidence.length, 1);
    const summary = evidence[0].summary as string;
    assert.ok(summary.length <= 600, `summary should be <= 600 chars, got ${summary.length}`);
  });
});