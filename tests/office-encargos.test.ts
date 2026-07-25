import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encargoHumanHref,
  resolveFinalReport,
  resolveStepMarkdown,
} from "../src/lib/office-encargos.js";

describe("office-encargos", () => {
  it("encargoHumanHref points to human office route", () => {
    assert.equal(encargoHumanHref("run-123"), "/office/encargos/run-123");
  });

  it("resolveStepMarkdown prefers full output over short handoff stub", () => {
    const handoffStub = `# Company Memory\n- Short bullet about the cycle.`;
    const fullReport = `${handoffStub}\n\n# Pre-Mortem Analysis\n\n${"Long analysis paragraph. ".repeat(40)}`;
    const resolved = resolveStepMarkdown(fullReport, "critic-munger", 3);
    assert.ok(resolved.includes("Pre-Mortem Analysis"));
    assert.ok(resolved.length > handoffStub.length + 80);
  });

  it("resolveFinalReport uses runSummary when present", () => {
    const summary = resolveFinalReport(
      { runSummary: "Executive synthesis for the team." },
      [],
      [],
    );
    assert.equal(summary, "Executive synthesis for the team.");
  });
});
