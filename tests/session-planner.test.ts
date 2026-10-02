/**
 * Tests del planner de sesiones — Fase 2.
 * Ondas topológicas: secuencial, paralelo con join, detección de ciclo.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionExecutionWaves,
  plannerGoalSuffix,
  plannerMemory,
} from "../src/lib/session-planner.js";

await test("planner: cadena secuencial produce una onda por step", async () => {
  const waves = buildSessionExecutionWaves(
    [
      { id: "s1", agentId: "a1", agentName: "research-thompson", stepOrder: 0 },
      { id: "s2", agentId: "a2", agentName: "fullstack-dhh", stepOrder: 1 },
      { id: "s3", agentId: "a3", agentName: "critic-munger", stepOrder: 2 },
    ],
    [
      { sourceStepId: "s1", targetStepId: "s2" },
      { sourceStepId: "s2", targetStepId: "s3" },
    ],
  );
  assert.equal(waves.length, 3);
  assert.deepEqual(waves.map((w) => w.wave), [0, 1, 2]);
  assert.deepEqual(waves[0].agentNames, ["research-thompson"]);
  assert.deepEqual(waves[2].agentIds, ["a3"]);
});

await test("planner: ramas paralelas se agrupan y hacen join en la siguiente onda", async () => {
  const waves = buildSessionExecutionWaves(
    [
      { id: "s1", agentId: "a1", agentName: "research-thompson", stepOrder: 0 },
      { id: "s2", agentId: "a2", agentName: "product-norman", stepOrder: 1 },
      { id: "s3", agentId: "a3", agentName: "cfo-campbell", stepOrder: 1 },
      { id: "s4", agentId: "a4", agentName: "critic-munger", stepOrder: 2 },
    ],
    [
      { sourceStepId: "s1", targetStepId: "s2" },
      { sourceStepId: "s1", targetStepId: "s3" },
      { sourceStepId: "s2", targetStepId: "s4" },
      { sourceStepId: "s3", targetStepId: "s4" },
    ],
  );
  assert.equal(waves.length, 3);
  assert.deepEqual(waves[1].agentNames.sort(), ["cfo-campbell", "product-norman"]);
  assert.deepEqual(waves[2].agentNames, ["critic-munger"]);
  assert.deepEqual(waves[2].stepIds, ["s4"]);
});

await test("planner: steps sin predecesores comparten onda 0", async () => {
  const waves = buildSessionExecutionWaves(
    [
      { id: "s1", agentId: "a1", agentName: "ui-duarte", stepOrder: 0 },
      { id: "s2", agentId: "a2", agentName: "interaction-cooper", stepOrder: 0 },
    ],
    [],
  );
  assert.equal(waves.length, 1);
  assert.equal(waves[0].wave, 0);
  assert.equal(waves[0].stepIds.length, 2);
});

await test("planner: ciclo lanza error explícito", async () => {
  assert.throws(
    () =>
      buildSessionExecutionWaves(
        [
          { id: "s1", agentId: "a1", agentName: "a", stepOrder: 0 },
          { id: "s2", agentId: "a2", agentName: "b", stepOrder: 1 },
        ],
        [
          { sourceStepId: "s1", targetStepId: "s2" },
          { sourceStepId: "s2", targetStepId: "s1" },
        ],
      ),
    /cycle/,
  );
});

await test("planner: memory y sufijo de goal exponen handoffs de ondas previas", async () => {
  const waves = buildSessionExecutionWaves(
    [
      { id: "s1", agentId: "a1", agentName: "research-thompson", stepOrder: 0 },
      { id: "s2", agentId: "a2", agentName: "fullstack-dhh", stepOrder: 1 },
    ],
    [{ sourceStepId: "s1", targetStepId: "s2" }],
  );
  const memory = plannerMemory(waves) as {
    sessionPlanner: { strategy: string; waves: Array<{ wave: number }> };
  };
  assert.equal(memory.sessionPlanner.strategy, "topological-waves");
  assert.equal(memory.sessionPlanner.waves.length, 2);

  const first = plannerGoalSuffix(0, waves);
  const second = plannerGoalSuffix(1, waves);
  assert.match(first, /first execution wave/);
  assert.match(second, /research-thompson/);
});
