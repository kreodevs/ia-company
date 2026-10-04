import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeGoalProgressPercent, syncCompanyGoalProgress } from "../src/lib/objectives.js";

describe("computeGoalProgressPercent", () => {
  it("devuelve 0 sin encargos", () => {
    assert.equal(computeGoalProgressPercent(0, 0, 40), 0);
  });

  it("escala por meta cuando hay entregas", () => {
    assert.equal(computeGoalProgressPercent(2, 4, 40), 20);
    assert.equal(computeGoalProgressPercent(4, 4, 40), 40);
  });

  it("no supera 100", () => {
    assert.equal(computeGoalProgressPercent(10, 10, 200), 100);
  });
});

describe("syncCompanyGoalProgress", () => {
  it("exporta función de sincronización", () => {
    assert.equal(typeof syncCompanyGoalProgress, "function");
  });
});
