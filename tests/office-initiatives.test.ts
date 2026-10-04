import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeGoalProgressPercent } from "../src/lib/objectives.js";

/** Iniciativas comparten progreso de objetivo vía encargos — misma función de progreso. */
describe("initiative progress via goals", () => {
  it("progreso proporcional a entregas", () => {
    assert.equal(computeGoalProgressPercent(1, 2, 100), 50);
  });
});
