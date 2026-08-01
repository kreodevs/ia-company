import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agentNamesFromWorkflowSteps,
  buildDepartmentRunScopeWhere,
  extractRunTeamAgentNames,
  officeLaunchMemoryFields,
  runBelongsToDepartmentRoster,
} from "../src/lib/office-run-department.js";

describe("office-run-department", () => {
  it("merges teamAgents, history, and workflow steps", () => {
    const names = extractRunTeamAgentNames(
      {
        teamAgents: ["ceo-bezos"],
        _history: [{ agentName: "research-thompson", output: "", stepId: "1", timestamp: "" }],
      },
      ["critic-munger"],
    );
    assert.deepEqual(names.sort(), ["ceo-bezos", "critic-munger", "research-thompson"].sort());
  });

  it("matches department roster using workflow steps when memory is empty", () => {
    assert.equal(
      runBelongsToDepartmentRoster({
        sharedMemory: { task: "Audit landing" },
        rosterNames: ["fullstack-dhh", "qa-bach"],
        workflowAgentNames: ["fullstack-dhh", "qa-bach", "devops-hightower"],
      }),
      true,
    );
  });

  it("matches org unit runs by orgUnitId", () => {
    assert.equal(
      runBelongsToDepartmentRoster({
        sharedMemory: { orgUnitId: "org-1" },
        rosterNames: [],
        orgUnitId: "org-1",
      }),
      true,
    );
  });

  it("builds launch memory with teamAgents", () => {
    const memory = officeLaunchMemoryFields({
      task: "Validar idea",
      teamAgentNames: ["research-thompson", "ceo-bezos"],
    });
    assert.deepEqual(memory.teamAgents, ["research-thompson", "ceo-bezos"]);
    assert.equal(memory.officeRequest, "Validar idea");
  });

  it("extracts workflow agent names from steps", () => {
    assert.deepEqual(
      agentNamesFromWorkflowSteps([
        { agent: { name: "qa-bach" } },
        { agent: { name: "fullstack-dhh" } },
        { agent: null },
      ]),
      ["qa-bach", "fullstack-dhh"],
    );
  });

  it("builds scoped SQL filters for org units and virtual departments", () => {
    assert.deepEqual(buildDepartmentRunScopeWhere({ orgUnitId: "org-1" }), {
      sharedMemory: { path: ["orgUnitId"], equals: "org-1" },
    });
    assert.deepEqual(buildDepartmentRunScopeWhere({ rosterNames: ["fullstack-dhh"] }), {
      workflow: {
        steps: {
          some: {
            agent: { name: { in: ["fullstack-dhh"] } },
          },
        },
      },
    });
    assert.equal(buildDepartmentRunScopeWhere({}), null);
  });
});
