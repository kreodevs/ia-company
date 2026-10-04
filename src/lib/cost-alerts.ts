import { prisma } from "./prisma.js";
import { budgetAlertFromPercent } from "./office-costs.js";
import { getTenantMonthlyUsage } from "./usage-limits.js";
import { createTenantNotification } from "./tenant-notifications.js";

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Crea notificación in-app `cost_alert` al cruzar 50/80/100% del presupuesto mensual (una por umbral y mes).
 */
export async function syncCostBudgetAlerts(tenantId: string): Promise<void> {
  const monthly = await getTenantMonthlyUsage(tenantId);
  const limit = monthly.limits.maxCostUsdPerMonth;
  if (limit == null || limit <= 0) return;

  const percent = Math.round((monthly.totalCostUsd / limit) * 1000) / 10;
  const level = budgetAlertFromPercent(percent);
  if (!level) return;

  const since = startOfMonth();
  const marker = `budget-${level}`;
  const existing = await prisma.tenantNotification.findFirst({
    where: {
      tenantId,
      type: "cost_alert",
      body: { contains: marker },
      createdAt: { gte: since },
    },
  });
  if (existing) {
    if (level >= 100) await pauseSchedulesForBudgetExhausted(tenantId);
    return;
  }

  const title =
    level >= 100
      ? "Presupuesto mensual agotado\n---\nMonthly budget exhausted"
      : level >= 80
        ? "Presupuesto mensual al 80%\n---\nMonthly budget at 80%"
        : "Presupuesto mensual al 50%\n---\nMonthly budget at 50%";

  await createTenantNotification({
    tenantId,
    type: "cost_alert",
    title,
    body: `${marker}: $${monthly.totalCostUsd.toFixed(2)} / $${limit.toFixed(2)} (${percent}%).`,
    href: "/office/dashboard",
  });

  if (level >= 100) await pauseSchedulesForBudgetExhausted(tenantId);
}

async function pauseSchedulesForBudgetExhausted(tenantId: string): Promise<void> {
  const { setDepartmentOperationEnabled } = await import("./department-operations.js");
  const schedules = await prisma.autonomousSchedule.findMany({
    where: { tenantId, enabled: true },
    select: { id: true },
  });
  const reason = "Pausado automáticamente: presupuesto mensual agotado";
  for (const schedule of schedules) {
    await setDepartmentOperationEnabled(tenantId, schedule.id, false, reason);
  }
}
