/**
 * Tests del corte de presupuesto sesión → run → tenant (Fase 3).
 * checkBudget es lógica pura: sin BD.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { checkBudget, type BudgetCheckInput } from "../src/lib/session-budgets.js";

function base(overrides: Partial<BudgetCheckInput> = {}): BudgetCheckInput {
  return {
    sessionSpentTokens: 100,
    sessionSpentCostUsd: 0.01,
    sessionBudgetTokens: 10000,
    sessionBudgetUsd: 10,
    runSpend: { totalTokens: 100, totalCostUsd: 0.01 },
    limits: {
      runBudgetTokens: null,
      runBudgetUsd: null,
      tenantMaxCostPerRun: null,
      tenantMonthly: { maxRuns: null, maxCostUsd: null, maxTokens: null },
    },
    monthly: null,
    ...overrides,
  };
}

await test("budgets: sin límites todo ok", async () => {
  assert.deepEqual(checkBudget(base()), { ok: true });
});

await test("budgets: corte por tokens de sesión", async () => {
  const result = checkBudget(base({ sessionSpentTokens: 10000 }));
  assert.equal(result.ok, false);
  assert.equal(result.level, "session");
  assert.match(result.reason ?? "", /Token budget exceeded/);
});

await test("budgets: corte por costo de sesión", async () => {
  const result = checkBudget(base({ sessionSpentCostUsd: 10 }));
  assert.equal(result.ok, false);
  assert.equal(result.level, "session");
  assert.match(result.reason ?? "", /Cost budget exceeded/);
});

await test("budgets: corte por tokens del run con varias sesiones agregadas", async () => {
  const result = checkBudget(
    base({
      runSpend: { totalTokens: 50000, totalCostUsd: 0.5 },
      limits: {
        runBudgetTokens: 50000,
        runBudgetUsd: null,
        tenantMaxCostPerRun: null,
        tenantMonthly: { maxRuns: null, maxCostUsd: null, maxTokens: null },
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.level, "run");
  assert.match(result.reason ?? "", /Run token budget exceeded/);
});

await test("budgets: corte por costo del run", async () => {
  const result = checkBudget(
    base({
      runSpend: { totalTokens: 1000, totalCostUsd: 5 },
      limits: {
        runBudgetTokens: null,
        runBudgetUsd: 5,
        tenantMaxCostPerRun: null,
        tenantMonthly: { maxRuns: null, maxCostUsd: null, maxTokens: null },
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.level, "run");
  assert.match(result.reason ?? "", /Run cost budget exceeded/);
});

await test("budgets: tope por corrida del tenant", async () => {
  const result = checkBudget(
    base({
      runSpend: { totalTokens: 2000, totalCostUsd: 3 },
      limits: {
        runBudgetTokens: null,
        runBudgetUsd: null,
        tenantMaxCostPerRun: 3,
        tenantMonthly: { maxRuns: null, maxCostUsd: null, maxTokens: null },
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.level, "tenant_per_run");
});

await test("budgets: tope mensual de costo del tenant", async () => {
  const result = checkBudget(
    base({
      limits: {
        runBudgetTokens: null,
        runBudgetUsd: null,
        tenantMaxCostPerRun: null,
        tenantMonthly: { maxRuns: null, maxCostUsd: 100, maxTokens: null },
      },
      monthly: { runCount: 2, totalTokens: 5000, totalCostUsd: 100 },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.level, "tenant_monthly");
});

await test("budgets: tope mensual de runs usa el propio run en vuelo", async () => {
  // maxRuns=2 y ya hay 2 runs este mes contando el actual → el actual no se corta solo.
  const running = checkBudget(
    base({
      limits: {
        runBudgetTokens: null,
        runBudgetUsd: null,
        tenantMaxCostPerRun: null,
        tenantMonthly: { maxRuns: 2, maxCostUsd: null, maxTokens: null },
      },
      monthly: { runCount: 2, totalTokens: 5000, totalCostUsd: 1 },
    }),
  );
  assert.equal(running.ok, true);
  // Un tercer run (p. ej. otro intento del mismo tenant) sí se corta.
  const overflow = checkBudget(
    base({
      limits: {
        runBudgetTokens: null,
        runBudgetUsd: null,
        tenantMaxCostPerRun: null,
        tenantMonthly: { maxRuns: 2, maxCostUsd: null, maxTokens: null },
      },
      monthly: { runCount: 3, totalTokens: 5000, totalCostUsd: 1 },
    }),
  );
  assert.equal(overflow.ok, false);
  assert.equal(overflow.level, "tenant_monthly");
});
