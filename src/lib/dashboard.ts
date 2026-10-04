import { DepartmentWorkStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { VIRTUAL_OFFICE_DEPARTMENTS } from "./office-departments.js";

export interface DashboardMetricsOptions {
  /** ISO date — limit cost/run aggregates to runs created on or after this instant. */
  since?: Date;
}

export interface DepartmentManagementRow {
  departmentKey: string;
  departmentName: string;
  kind: "virtual" | "org_unit";
  activeCount: number;
  blockedCount: number;
  costUsd: number;
  deliveredCount: number;
  href: string;
}

export interface ManagementDashboardMetrics {
  totalCostUsd: number;
  activeRuns: number;
  pendingDecisions: number;
  pendingHandoffs: number;
  pendingReviews: number;
  activeGoals: number;
  activeInitiatives: number;
  blockedWorkItems: number;
  periodStart: string | null;
}

const ACTIVE_WORK_STATUSES: DepartmentWorkStatus[] = [
  DepartmentWorkStatus.planned,
  DepartmentWorkStatus.active,
  DepartmentWorkStatus.waiting_review,
];

/**
 * Return aggregated business metrics for the dashboard.
 */
export async function getDashboardMetrics(
  tenantId: string,
  options: DashboardMetricsOptions = {},
): Promise<ManagementDashboardMetrics> {
  const since = options.since;
  const runWhere = since
    ? { tenantId, createdAt: { gte: since } }
    : { tenantId };

  const [
    costResult,
    activeRuns,
    decisions,
    handoffs,
    reviews,
    activeGoals,
    activeInitiatives,
    blockedWorkItems,
  ] = await Promise.all([
    prisma.executionRun.aggregate({
      where: runWhere,
      _sum: { totalCostUsd: true },
    }),
    prisma.executionRun.count({ where: { tenantId, status: "RUNNING" } }),
    prisma.decisionProposal.count({ where: { tenantId, status: "pending_review" } }),
    prisma.departmentHandoff.count({ where: { tenantId, status: "pending_acceptance" } }),
    prisma.documentReview.count({ where: { tenantId, status: "pending_review" } }),
    prisma.companyGoal.count({ where: { tenantId } }),
    prisma.initiative.count({
      where: {
        tenantId,
        OR: [{ status: null }, { status: { notIn: ["completed", "done", "cancelled"] } }],
      },
    }),
    prisma.departmentWorkItem.count({
      where: { tenantId, status: DepartmentWorkStatus.blocked },
    }),
  ]);

  return {
    totalCostUsd: costResult._sum.totalCostUsd ?? 0,
    activeRuns,
    pendingDecisions: decisions,
    pendingHandoffs: handoffs,
    pendingReviews: reviews,
    activeGoals,
    activeInitiatives,
    blockedWorkItems,
    periodStart: since?.toISOString() ?? null,
  };
}

/**
 * Fase H — tabla departamental (activos, bloqueados, coste, entregados).
 */
export async function getDepartmentManagementMetrics(
  tenantId: string,
  options: DashboardMetricsOptions = {},
): Promise<DepartmentManagementRow[]> {
  const since = options.since;
  const workItems = await prisma.departmentWorkItem.findMany({
    where: { tenantId },
    select: {
      departmentSlug: true,
      orgUnitId: true,
      status: true,
      run: { select: { totalCostUsd: true, createdAt: true } },
    },
  });

  const orgUnits = await prisma.orgUnit.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  type Bucket = {
    departmentKey: string;
    departmentName: string;
    kind: "virtual" | "org_unit";
    href: string;
    activeCount: number;
    blockedCount: number;
    deliveredCount: number;
    costUsd: number;
  };

  const buckets = new Map<string, Bucket>();

  const ensure = (key: string, name: string, kind: "virtual" | "org_unit", href: string) => {
    let row = buckets.get(key);
    if (!row) {
      row = {
        departmentKey: key,
        departmentName: name,
        kind,
        href,
        activeCount: 0,
        blockedCount: 0,
        deliveredCount: 0,
        costUsd: 0,
      };
      buckets.set(key, row);
    }
    return row;
  };

  for (const def of VIRTUAL_OFFICE_DEPARTMENTS) {
    ensure(def.slug, def.slug, "virtual", `/office/departments/${def.slug}`);
  }
  for (const unit of orgUnits) {
    ensure(`org:${unit.id}`, unit.name, "org_unit", `/office/departments/${unit.slug}`);
  }

  for (const item of workItems) {
    const runCreated = item.run?.createdAt;
    if (since && runCreated && runCreated < since) continue;

    const key =
      item.orgUnitId != null
        ? `org:${item.orgUnitId}`
        : item.departmentSlug
          ? item.departmentSlug
          : null;
    if (!key) continue;

    const name =
      item.orgUnitId != null
        ? (orgUnits.find((u) => u.id === item.orgUnitId)?.name ?? key)
        : key;
    const kind = item.orgUnitId != null ? "org_unit" : "virtual";
    const href =
      item.orgUnitId != null
        ? `/office/departments/${orgUnits.find((u) => u.id === item.orgUnitId)?.slug ?? ""}`
        : `/office/departments/${item.departmentSlug}`;
    const row = ensure(key, name, kind, href);

    if (item.status === DepartmentWorkStatus.blocked) row.blockedCount += 1;
    else if (item.status === DepartmentWorkStatus.completed) row.deliveredCount += 1;
    else if (ACTIVE_WORK_STATUSES.includes(item.status)) row.activeCount += 1;

    row.costUsd += item.run?.totalCostUsd ?? 0;
  }

  return [...buckets.values()]
    .map((row) => ({
      ...row,
      costUsd: Math.round(row.costUsd * 100) / 100,
    }))
    .filter((row) => row.activeCount > 0 || row.blockedCount > 0 || row.deliveredCount > 0 || row.costUsd > 0)
    .sort((a, b) => b.blockedCount - a.blockedCount || b.activeCount - a.activeCount);
}
