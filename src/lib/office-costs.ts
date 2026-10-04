import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { syncCostBudgetAlerts } from "./cost-alerts.js";
import { getTenantMonthlyUsage } from "./usage-limits.js";

export type BudgetAlertLevel = 50 | 80 | 100 | null;

export interface OfficeCostFilters {
  since?: Date;
  orgUnitId?: string;
  companyGoalId?: string;
  productId?: string;
  agentId?: string;
  runId?: string;
  model?: string;
}

export interface OfficeCostBreakdownRow {
  key: string;
  label: string;
  costUsd: number;
  runCount: number;
  href: string | null;
}

export interface OfficeCostReport {
  totalCostUsd: number;
  activeRuns: number;
  runCount: number;
  periodStart: string | null;
  budgetLimitUsd: number | null;
  budgetUsedPercent: number | null;
  budgetAlert: BudgetAlertLevel;
  byDepartment: OfficeCostBreakdownRow[];
  byObjective: OfficeCostBreakdownRow[];
  byProduct: OfficeCostBreakdownRow[];
  byModel: OfficeCostBreakdownRow[];
}

export function budgetAlertFromPercent(percent: number | null): BudgetAlertLevel {
  if (percent == null) return null;
  if (percent >= 100) return 100;
  if (percent >= 80) return 80;
  if (percent >= 50) return 50;
  return null;
}

function buildRunWhere(tenantId: string, filters: OfficeCostFilters): Prisma.ExecutionRunWhereInput {
  const where: Prisma.ExecutionRunWhereInput = { tenantId };
  if (filters.since) where.createdAt = { gte: filters.since };
  if (filters.companyGoalId) where.companyGoalId = filters.companyGoalId;
  if (filters.productId) where.productId = filters.productId;
  if (filters.runId) where.id = filters.runId;
  if (filters.orgUnitId) {
    where.OR = [
      { departmentWorkItems: { some: { orgUnitId: filters.orgUnitId } } },
    ];
  }
  if (filters.agentId) {
    where.logs = { some: { agentId: filters.agentId } };
  }
  if (filters.model?.trim()) {
    where.sessions = {
      some: { model: { contains: filters.model.trim(), mode: "insensitive" } },
    };
  }
  return where;
}

export async function getOfficeCostReport(
  tenantId: string,
  filters: OfficeCostFilters = {},
): Promise<OfficeCostReport> {
  const where = buildRunWhere(tenantId, filters);
  const [aggregate, activeRuns, monthly] = await Promise.all([
    prisma.executionRun.aggregate({
      where,
      _sum: { totalCostUsd: true },
      _count: { id: true },
    }),
    prisma.executionRun.count({
      where: { ...where, status: { in: ["RUNNING", "PENDING", "DELEGATED", "AWAITING_USER"] } },
    }),
    getTenantMonthlyUsage(tenantId),
  ]);

  const totalCostUsd = Number(aggregate._sum.totalCostUsd) || 0;
  const limit = monthly.limits.maxCostUsdPerMonth;
  const budgetUsedPercent =
    limit != null && limit > 0
      ? Math.round((monthly.totalCostUsd / limit) * 1000) / 10
      : null;

  const [goalGroups, productGroups, orgUnits, goals, products, modelGroups] = await Promise.all([
    prisma.executionRun.groupBy({
      by: ["companyGoalId"],
      where: { ...where, companyGoalId: { not: null } },
      _sum: { totalCostUsd: true },
      _count: { id: true },
    }),
    prisma.executionRun.groupBy({
      by: ["productId"],
      where: { ...where, productId: { not: null } },
      _sum: { totalCostUsd: true },
      _count: { id: true },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, slug: true },
    }),
    prisma.companyGoal.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.tenantProduct.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.agentSession.groupBy({
      by: ["model"],
      where: {
        tenantId,
        model: { not: null },
        run: where,
      },
      _sum: { spentCostUsd: true },
      _count: { id: true },
    }),
  ]);

  const goalMap = new Map(goals.map((g) => [g.id, g.name]));
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const deptCostRows = await Promise.all(
    orgUnits.map(async (unit) => {
      const cost = await prisma.executionRun.aggregate({
        where: {
          ...where,
          departmentWorkItems: { some: { orgUnitId: unit.id } },
        },
        _sum: { totalCostUsd: true },
        _count: { id: true },
      });
      return {
        key: unit.id,
        label: unit.name,
        costUsd: Number(cost._sum.totalCostUsd) || 0,
        runCount: cost._count.id,
        href: `/office/departments/${unit.slug}`,
      };
    }),
  );

  void syncCostBudgetAlerts(tenantId);

  return {
    totalCostUsd,
    activeRuns,
    runCount: aggregate._count.id,
    periodStart: filters.since?.toISOString() ?? monthly.periodStart,
    budgetLimitUsd: limit,
    budgetUsedPercent,
    budgetAlert: budgetAlertFromPercent(budgetUsedPercent),
    byDepartment: deptCostRows.sort((a, b) => b.costUsd - a.costUsd).slice(0, 12),
    byObjective: goalGroups
      .filter((g) => g.companyGoalId)
      .map((g) => ({
        key: g.companyGoalId as string,
        label: goalMap.get(g.companyGoalId as string) ?? (g.companyGoalId as string),
        costUsd: Number(g._sum.totalCostUsd) || 0,
        runCount: g._count.id,
        href: `/office/objetivos/${g.companyGoalId}`,
      }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 12),
    byProduct: productGroups
      .filter((g) => g.productId)
      .map((g) => ({
        key: g.productId as string,
        label: productMap.get(g.productId as string) ?? (g.productId as string),
        costUsd: Number(g._sum.totalCostUsd) || 0,
        runCount: g._count.id,
        href: `/products/${g.productId}`,
      }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 12),
    byModel: modelGroups
      .filter((g) => g.model)
      .map((g) => ({
        key: g.model as string,
        label: g.model as string,
        costUsd: Math.round((Number(g._sum.spentCostUsd) || 0) * 100) / 100,
        runCount: g._count.id,
        href: null,
      }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 12),
  };
}
