import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatProcedureLabel,
  groupWorkflowsByVirtualDepartment,
  resolveEncargoDepartmentContext,
  resolveWorkflowVirtualDepartment,
} from "../src/lib/office-procedures.js";

describe("office-procedures", () => {
  it("formats slug workflow names into readable labels", () => {
    assert.equal(formatProcedureLabel("feature-development"), "Feature Development");
    assert.equal(formatProcedureLabel("Custom Name"), "Custom Name");
  });

  it("assigns workflow to department by agent majority", () => {
    assert.equal(
      resolveWorkflowVirtualDepartment(["fullstack-dhh", "qa-bach", "devops-hightower"]),
      "engineering",
    );
    assert.equal(
      resolveWorkflowVirtualDepartment(["research-thompson", "ceo-bezos"]),
      "strategy",
    );
  });

  it("returns null when agents span departments without a majority", () => {
    assert.equal(
      resolveWorkflowVirtualDepartment([
        "fullstack-dhh",
        "research-thompson",
        "marketing-godin",
      ]),
      null,
    );
  });

  it("groups virtual and org workflows separately", () => {
    const grouped = groupWorkflowsByVirtualDepartment([
      {
        id: "1",
        name: "feature-development",
        description: null,
        steps: [
          { agent: { name: "fullstack-dhh" }, stepOrder: 1 },
          { agent: { name: "qa-bach" }, stepOrder: 2 },
        ],
      } as never,
      {
        id: "2",
        name: "opportunity-discovery",
        description: null,
        steps: [{ agent: { name: "research-thompson" }, stepOrder: 1 }],
      } as never,
    ]);

    assert.equal(grouped.get("engineering")?.length, 1);
    assert.equal(grouped.get("strategy")?.length, 1);
    assert.equal(grouped.get("engineering")?.[0]?.procedureLabel, "Feature Development");
  });

  it("excludes org-assigned workflows from virtual department groups", () => {
    const orgAssignedIds = new Set(["wf-org"]);
    const procedures = [
      { id: "wf-org", departmentSlug: "engineering" },
      { id: "wf-virtual", departmentSlug: "engineering" },
      { id: "wf-other", departmentSlug: "strategy" },
    ];
    const engineeringItems = procedures.filter((procedure) => {
      if (procedure.departmentSlug !== "engineering") return false;
      if (orgAssignedIds.has(procedure.id)) return false;
      return true;
    });
    assert.equal(engineeringItems.length, 1);
    assert.equal(engineeringItems[0]?.id, "wf-virtual");
  });

  it("resolves encargo context for org unit and virtual departments", () => {
    const org = resolveEncargoDepartmentContext({
      teamAgents: ["fullstack-dhh"],
      orgUnitId: "org-1",
      orgUnitName: "Studio SnapOG",
      workflowName: "feature-development",
    });
    assert.equal(org.orgUnitId, "org-1");
    assert.equal(org.departmentHref, "/org-units/org-1");
    assert.equal(org.procedureLabel, "Feature Development");

    const virtual = resolveEncargoDepartmentContext({
      teamAgents: ["fullstack-dhh", "qa-bach"],
      orgUnitId: null,
      orgUnitName: null,
      workflowName: "feature-development",
    });
    assert.equal(virtual.departmentSlug, "engineering");
    assert.equal(virtual.departmentHref, "/office/departments/engineering");
  });
});
