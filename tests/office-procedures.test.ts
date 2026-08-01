import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatProcedureLabel,
  groupWorkflowsByVirtualDepartment,
  readLinkedWorkflowIds,
  readVirtualDepartmentSlugFromWorkflow,
  resolveEncargoDepartmentContext,
  resolveWorkflowVirtualDepartment,
  scheduleConditionsTargetOrgUnit,
  scheduleMatchesVirtualDepartmentSlug,
  workflowBelongsToVirtualDepartment,
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

  it("matches scheduled procedures to virtual department by workflow agents", () => {
    const strategyWorkflow = {
      id: "wf-strategy",
      name: "opportunity-discovery",
      description: null,
      steps: [
        { agent: { name: "research-thompson" }, stepOrder: 1 },
        { agent: { name: "ceo-bezos" }, stepOrder: 2 },
      ],
    } as never;

    assert.equal(scheduleMatchesVirtualDepartmentSlug(strategyWorkflow, "strategy"), true);
    assert.equal(scheduleMatchesVirtualDepartmentSlug(strategyWorkflow, "engineering"), false);
    assert.equal(scheduleMatchesVirtualDepartmentSlug(null, "strategy"), false);
  });

  it("matches schedule conditions scoped to an org unit", () => {
    assert.equal(scheduleConditionsTargetOrgUnit({ orgUnitId: "org-1" }, "org-1"), true);
    assert.equal(scheduleConditionsTargetOrgUnit({ orgUnitId: "org-1" }, "org-2"), false);
    assert.equal(scheduleConditionsTargetOrgUnit(null, "org-1"), false);
  });

  it("reads explicit org links and virtual department tags", () => {
    assert.deepEqual(readLinkedWorkflowIds({ config: { linkedWorkflowIds: ["wf-1"] } }), ["wf-1"]);
    assert.equal(
      readVirtualDepartmentSlugFromWorkflow("Notes\n<!-- office-dept-link:strategy -->"),
      "strategy",
    );
    const taggedWorkflow = {
      id: "wf-tagged",
      name: "custom-flow",
      description: "<!-- office-dept-link:strategy -->",
      steps: [{ agent: { name: "research-thompson" }, stepOrder: 1 }],
    } as never;
    assert.equal(workflowBelongsToVirtualDepartment(taggedWorkflow, "strategy"), true);
    assert.equal(workflowBelongsToVirtualDepartment(taggedWorkflow, "product"), false);
  });
});
