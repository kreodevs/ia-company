import { prisma } from './prisma.js';

/**
 * Return aggregated business metrics for the dashboard.
 * Includes:
 * - totalCostUsd: sum of totalCostUsd across all runs.
 * - activeRuns: count of runs with status RUNNING.
 * - pendingDecisions: count of DecisionProposal with status pending_review.
 * - pendingHandoffs: count of DepartmentHandoff with status pending_acceptance.
 * - pendingReviews: count of DocumentReview with status pending_review.
 */
export async function getDashboardMetrics(tenantId: string) {
  const [costResult, activeRuns, decisions, handoffs, reviews] = await Promise.all([
    prisma.executionRun.aggregate({
      where: { tenantId },
      _sum: { totalCostUsd: true },
    }),
    prisma.executionRun.count({ where: { tenantId, status: 'RUNNING' } }),
    prisma.decisionProposal.count({ where: { tenantId, status: 'pending_review' } }),
    prisma.departmentHandoff.count({ where: { tenantId, status: 'pending_acceptance' } }),
    prisma.documentReview.count({ where: { tenantId, status: 'pending_review' } }),
  ]);

  return {
    totalCostUsd: costResult._sum.totalCostUsd ?? 0,
    activeRuns,
    pendingDecisions: decisions,
    pendingHandoffs: handoffs,
    pendingReviews: reviews,
  };
}
