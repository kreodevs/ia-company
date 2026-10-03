/**
 * SessionBudgets — Fase 3: corte de presupuesto a nivel encargo (run) y tenant.
 *
 * El presupuesto POR SESIÓN ya lo aplicaba el loop (budgetTokens/budgetUsd en
 * AgentSession). Este módulo agrega el gasto de TODAS las sesiones del run
 * (incluyendo el gasto en memoria de la sesión actual, que solo se persiste al
 * cerrar) y lo contra los límites:
 *   1. budgetTokens/budgetUsd puestos por el coordinador en sharedMemory del run.
 *   2. TenantLlmConfig.maxCostUsdPerRun (tope de costo por corrida del tenant).
 *   3. TenantUsageLimits mensuales (runs, costo, tokens) — misma semántica que
 *      assertTenantCanExecute, pero evaluada DURANTE la corrida, no solo al lanzar.
 *
 * Además persiste el agregado en ExecutionRun.totalTokens/totalCostUsd en cada
 * evaluación, para que el tope mensual del tenant sea visible y real mientras
 * el run está en vuelo (el finalizer lo volvía a escribir solo al cerrar).
 */

import { prisma } from "./prisma.js";

/** Límites resueltos para un run (encargo). */
export interface RunBudgetLimits {
  runBudgetTokens: number | null;
  runBudgetUsd: number | null;
  tenantMaxCostPerRun: number | null;
  tenantMonthly: {
    maxRuns: number | null;
    maxCostUsd: number | null;
    maxTokens: number | null;
  };
}

export interface RunSpendAggregate {
  totalTokens: number;
  totalCostUsd: number;
}

export type BudgetLevel = "session" | "run" | "tenant_per_run" | "tenant_monthly";

export interface BudgetCheckResult {
  ok: boolean;
  reason?: string;
  level?: BudgetLevel;
  /** Payload para checkpoint budget_exceeded si falla. */
  checkpointPayload?: Record<string, unknown>;
}

export interface CurrentSessionSpend {
  sessionId: string;
  spentTokens: number;
  spentCostUsd: number;
}

export interface MonthlyUsageSnapshot {
  runCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface BudgetCheckInput {
  sessionSpentTokens: number;
  sessionSpentCostUsd: number;
  sessionBudgetTokens: number | null;
  sessionBudgetUsd: number | null;
  runSpend: RunSpendAggregate;
  limits: RunBudgetLimits;
  monthly?: MonthlyUsageSnapshot | null;
}

function blocked(
  reason: string,
  level: BudgetLevel,
  payload: Record<string, unknown>,
): BudgetCheckResult {
  return { ok: false, reason, level, checkpointPayload: { reason, level, ...payload } };
}

/**
 * Lógica pura de corte de presupuesto (sin BD, testeable):
 * sesión → run (encargo) → tenant por corrida → tenant mensual.
 */
export function checkBudget(input: BudgetCheckInput): BudgetCheckResult {
  // 1. Presupuesto de sesión.
  if (input.sessionBudgetTokens && input.sessionSpentTokens >= input.sessionBudgetTokens) {
    return blocked(
      `Token budget exceeded (${input.sessionSpentTokens}/${input.sessionBudgetTokens} tokens)`,
      "session",
      {
        budgetTokens: input.sessionBudgetTokens,
        budgetUsd: input.sessionBudgetUsd,
        spentTokens: input.sessionSpentTokens,
        spentCostUsd: input.sessionSpentCostUsd,
      },
    );
  }
  if (input.sessionBudgetUsd && input.sessionSpentCostUsd >= input.sessionBudgetUsd) {
    return blocked(
      `Cost budget exceeded ($${input.sessionSpentCostUsd.toFixed(4)}/$${input.sessionBudgetUsd.toFixed(4)})`,
      "session",
      {
        budgetTokens: input.sessionBudgetTokens,
        budgetUsd: input.sessionBudgetUsd,
        spentTokens: input.sessionSpentTokens,
        spentCostUsd: input.sessionSpentCostUsd,
      },
    );
  }

  // 2. Presupuesto del run (agregado de todas sus sesiones).
  const { limits, runSpend } = input;
  if (limits.runBudgetTokens && runSpend.totalTokens >= limits.runBudgetTokens) {
    return blocked(
      `Run token budget exceeded (${runSpend.totalTokens}/${limits.runBudgetTokens} tokens)`,
      "run",
      {
        budgetTokens: limits.runBudgetTokens,
        budgetUsd: limits.runBudgetUsd,
        spentTokens: runSpend.totalTokens,
        spentCostUsd: runSpend.totalCostUsd,
      },
    );
  }
  if (limits.runBudgetUsd && runSpend.totalCostUsd >= limits.runBudgetUsd) {
    return blocked(
      `Run cost budget exceeded ($${runSpend.totalCostUsd.toFixed(4)}/$${limits.runBudgetUsd.toFixed(4)})`,
      "run",
      {
        budgetTokens: limits.runBudgetTokens,
        budgetUsd: limits.runBudgetUsd,
        spentTokens: runSpend.totalTokens,
        spentCostUsd: runSpend.totalCostUsd,
      },
    );
  }

  // 3. Tope de costo por corrida del tenant.
  if (limits.tenantMaxCostPerRun && runSpend.totalCostUsd >= limits.tenantMaxCostPerRun) {
    return blocked(
      `Tenant per-run cost limit exceeded ($${runSpend.totalCostUsd.toFixed(4)}/$${limits.tenantMaxCostPerRun.toFixed(4)})`,
      "tenant_per_run",
      {
        budgetTokens: null,
        budgetUsd: limits.tenantMaxCostPerRun,
        spentTokens: runSpend.totalTokens,
        spentCostUsd: runSpend.totalCostUsd,
      },
    );
  }

  // 4. Límites mensuales del tenant (misma ventana que assertTenantCanExecute).
  const monthly = input.monthly;
  if (monthly) {
    if (limits.tenantMonthly.maxRuns && monthly.runCount > limits.tenantMonthly.maxRuns) {
      return blocked(
        `Monthly run limit reached (${monthly.runCount}/${limits.tenantMonthly.maxRuns} runs)`,
        "tenant_monthly",
        {
          maxRuns: limits.tenantMonthly.maxRuns,
          spentTokens: monthly.totalTokens,
          spentCostUsd: monthly.totalCostUsd,
        },
      );
    }
    if (limits.tenantMonthly.maxCostUsd && monthly.totalCostUsd >= limits.tenantMonthly.maxCostUsd) {
      return blocked(
        `Monthly cost limit reached ($${monthly.totalCostUsd.toFixed(4)}/$${limits.tenantMonthly.maxCostUsd.toFixed(4)})`,
        "tenant_monthly",
        { budgetUsd: limits.tenantMonthly.maxCostUsd, spentTokens: monthly.totalTokens, spentCostUsd: monthly.totalCostUsd },
      );
    }
    if (limits.tenantMonthly.maxTokens && monthly.totalTokens >= limits.tenantMonthly.maxTokens) {
      return blocked(
        `Monthly token limit reached (${monthly.totalTokens}/${limits.tenantMonthly.maxTokens} tokens)`,
        "tenant_monthly",
        { budgetTokens: limits.tenantMonthly.maxTokens, spentTokens: monthly.totalTokens, spentCostUsd: monthly.totalCostUsd },
      );
    }
  }

  return { ok: true };
}

/**
 * Agrega el gasto de todas las sesiones del run, sustituyendo el valor persistido
 * de la sesión actual por su gasto en memoria (todavía no persistido a mitad de loop).
 */
export async function aggregateRunSpend(
  runId: string,
  current?: CurrentSessionSpend,
): Promise<RunSpendAggregate> {
  const sessions = await prisma.agentSession.findMany({
    where: { runId },
    select: { id: true, spentTokens: true, spentCostUsd: true },
  });
  let totalTokens = 0;
  let totalCostUsd = 0;
  for (const session of sessions) {
    if (current && session.id === current.sessionId) {
      totalTokens += current.spentTokens;
      totalCostUsd += current.spentCostUsd;
    } else {
      totalTokens += session.spentTokens;
      totalCostUsd += session.spentCostUsd;
    }
  }
  return { totalTokens, totalCostUsd };
}

/** Resuelve los límites aplicables a un run + tenant. */
export async function resolveRunBudgetLimits(
  runId: string,
  tenantId: string | null | undefined,
): Promise<RunBudgetLimits> {
  const run = await prisma.executionRun.findUnique({
    where: { id: runId },
    select: { sharedMemory: true },
  });
  const memory = (run?.sharedMemory ?? {}) as Record<string, unknown>;

  const limits: RunBudgetLimits = {
    runBudgetTokens: typeof memory.budgetTokens === "number" ? memory.budgetTokens : null,
    runBudgetUsd: typeof memory.budgetUsd === "number" ? memory.budgetUsd : null,
    tenantMaxCostPerRun: null,
    tenantMonthly: { maxRuns: null, maxCostUsd: null, maxTokens: null },
  };

  if (tenantId) {
    const [llmConfig, usageLimits] = await Promise.all([
      prisma.tenantLlmConfig.findUnique({
        where: { tenantId },
        select: { maxCostUsdPerRun: true },
      }),
      prisma.tenantUsageLimits.findUnique({ where: { tenantId } }),
    ]);
    limits.tenantMaxCostPerRun = llmConfig?.maxCostUsdPerRun ?? null;
    if (usageLimits) {
      limits.tenantMonthly = {
        maxRuns: usageLimits.maxRunsPerMonth ?? null,
        maxCostUsd: usageLimits.maxCostUsdPerMonth ?? null,
        maxTokens: usageLimits.maxTokensPerMonth ?? null,
      };
    }
  }

  return limits;
}

async function getMonthlyUsageSnapshot(tenantId: string): Promise<MonthlyUsageSnapshot> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const [runCount, agg] = await Promise.all([
    prisma.executionRun.count({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.executionRun.aggregate({
      where: { tenantId, createdAt: { gte: since } },
      _sum: { totalTokens: true, totalCostUsd: true },
    }),
  ]);
  return {
    runCount,
    totalTokens: agg._sum.totalTokens ?? 0,
    totalCostUsd: agg._sum.totalCostUsd ?? 0,
  };
}

/**
 * Evalúa presupuesto sesión → run → tenant por corrida → tenant mensual.
 * Llamado desde el loop antes de cada turno. Persiste el agregado del run
 * (costo visible durante la corrida) aunque no exceda ningún límite.
 */
export async function evaluateRunBudget(input: {
  runId: string;
  tenantId?: string | null;
  currentSession: CurrentSessionSpend;
  sessionBudgetTokens: number | null;
  sessionBudgetUsd: number | null;
}): Promise<BudgetCheckResult> {
  // 1. Corte de sesión sin queries (estado en memoria del loop).
  const sessionOnly = checkBudget({
    sessionSpentTokens: input.currentSession.spentTokens,
    sessionSpentCostUsd: input.currentSession.spentCostUsd,
    sessionBudgetTokens: input.sessionBudgetTokens,
    sessionBudgetUsd: input.sessionBudgetUsd,
    runSpend: { totalTokens: 0, totalCostUsd: 0 },
    limits: {
      runBudgetTokens: null,
      runBudgetUsd: null,
      tenantMaxCostPerRun: null,
      tenantMonthly: { maxRuns: null, maxCostUsd: null, maxTokens: null },
    },
  });
  if (!sessionOnly.ok) return sessionOnly;

  // 2. Agregado del run + límites.
  const runSpend = await aggregateRunSpend(input.runId, input.currentSession);
  const limits = await resolveRunBudgetLimits(input.runId, input.tenantId);

  // Persistir el agregado en el run: costo visible en vivo + base del tope mensual.
  await prisma.executionRun
    .update({
      where: { id: input.runId },
      data: { totalTokens: runSpend.totalTokens, totalCostUsd: runSpend.totalCostUsd },
    })
    .catch(() => undefined);

  const needsMonthly =
    Boolean(input.tenantId) &&
    (limits.tenantMonthly.maxRuns != null ||
      limits.tenantMonthly.maxCostUsd != null ||
      limits.tenantMonthly.maxTokens != null);
  const monthly = needsMonthly && input.tenantId ? await getMonthlyUsageSnapshot(input.tenantId) : null;

  return checkBudget({
    sessionSpentTokens: input.currentSession.spentTokens,
    sessionSpentCostUsd: input.currentSession.spentCostUsd,
    sessionBudgetTokens: input.sessionBudgetTokens,
    sessionBudgetUsd: input.sessionBudgetUsd,
    runSpend,
    limits,
    monthly,
  });
}