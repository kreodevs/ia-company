import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encargoActivityFields,
  encargoHumanHref,
  resolveFinalReport,
  resolveStepMarkdown,
} from "../src/lib/office-encargos.js";

describe("office-encargos", () => {
  it("encargoHumanHref points to human office route", () => {
    assert.equal(encargoHumanHref("run-123"), "/office/encargos/run-123");
  });

  it("encargoActivityFields exposes department and procedure context", () => {
    const fields = encargoActivityFields({
      workflowName: "feature-development",
      sharedMemory: {
        teamAgents: ["fullstack-dhh", "qa-bach"],
        officeRequest: "Implementar login OAuth",
      },
      orgUnitNameById: new Map(),
    });
    assert.equal(fields.title, "Implementar login OAuth");
    assert.equal(fields.procedureLabel, "Feature Development");
    assert.equal(fields.departmentSlug, "engineering");
    assert.equal(fields.orgUnitName, null);
  });

  it("encargoActivityFields resolves custom org unit name", () => {
    const fields = encargoActivityFields({
      workflowName: "marketing-sprint",
      sharedMemory: {
        orgUnitId: "org-42",
        teamAgents: ["marketing-godin"],
      },
      orgUnitNameById: new Map([["org-42", "Agencia LATAM"]]),
    });
    assert.equal(fields.orgUnitName, "Agencia LATAM");
    assert.equal(fields.departmentSlug, null);
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
