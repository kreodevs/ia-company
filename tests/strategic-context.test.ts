import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendStrategicContextToTask,
  stripStrategicContextFromTask,
} from "../src/lib/strategic-context.js";

describe("strategic-context task helpers", () => {
  it("añade y elimina bloque estratégico", () => {
    const base = "Implementar onboarding";
    const withCtx = appendStrategicContextToTask(base, {
      companyGoalId: "g1",
      initiativeId: null,
      companyGoalName: "Activación",
      initiativeName: null,
      promptBlock: "Objetivo de empresa: Activación",
      memoryFields: {},
    });
    assert.ok(withCtx.includes("Contexto estratégico"));
    assert.equal(stripStrategicContextFromTask(withCtx), base);
  });

  it("reemplaza contexto previo al editar vínculo", () => {
    const first = appendStrategicContextToTask("Tarea", {
      companyGoalId: "g1",
      initiativeId: null,
      companyGoalName: "A",
      initiativeName: null,
      promptBlock: "Objetivo A",
      memoryFields: {},
    });
    const second = appendStrategicContextToTask(first, {
      companyGoalId: "g2",
      initiativeId: null,
      companyGoalName: "B",
      initiativeName: null,
      promptBlock: "Objetivo B",
      memoryFields: {},
    });
    assert.ok(second.endsWith("Objetivo B"));
    assert.ok(!second.includes("Objetivo A"));
  });
});
