import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeGoalProgressPercent } from "../src/lib/objectives.js";
import { stripStrategicContextFromTask } from "../src/lib/strategic-context.js";

/** Iniciativas comparten progreso de objetivo vía encargos — misma función de progreso. */
describe("initiative progress via goals", () => {
  it("progreso proporcional a entregas", () => {
    assert.equal(computeGoalProgressPercent(1, 2, 100), 50);
  });

  it("contexto estratégico de iniciativa no duplica marcador al re-editar", () => {
    const task = "Lanzar feature\n\n---\nContexto estratégico\nIniciativa: Onboarding";
    assert.equal(stripStrategicContextFromTask(task), "Lanzar feature");
  });
});
