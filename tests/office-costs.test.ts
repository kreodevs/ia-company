import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { budgetAlertFromPercent } from "../src/lib/office-costs.js";
import { syncCostBudgetAlerts } from "../src/lib/cost-alerts.js";
import { wrapOrganigramWithExecutive } from "../src/lib/organigram.js";

describe("budgetAlertFromPercent", () => {
  it("umbrales 50/80/100", () => {
    assert.equal(budgetAlertFromPercent(null), null);
    assert.equal(budgetAlertFromPercent(40), null);
    assert.equal(budgetAlertFromPercent(55), 50);
    assert.equal(budgetAlertFromPercent(85), 80);
    assert.equal(budgetAlertFromPercent(100), 100);
  });
});

describe("wrapOrganigramWithExecutive", () => {
  it("envuelve raíces en nodo CEO", () => {
    const wrapped = wrapOrganigramWithExecutive([
      {
        id: "a",
        name: "Ops",
        type: "department",
        slug: "ops",
        parentId: null,
        workItemCount: 2,
        blockedWorkItems: 1,
        pendingHandoffsIn: 0,
        pendingHandoffsOut: 1,
        mission: "Operaciones",
        missionDescKey: null,
        labelKey: null,
        procedureHighlights: ["Informe semanal"],
        children: [],
      },
    ]);
    assert.equal(wrapped.length, 1);
    assert.equal(wrapped[0]?.type, "executive");
    assert.equal(wrapped[0]?.children.length, 1);
    assert.equal(wrapped[0]?.workItemCount, 2);
  });
});

describe("syncCostBudgetAlerts", () => {
  it("exporta función", () => {
    assert.equal(typeof syncCostBudgetAlerts, "function");
  });
});
