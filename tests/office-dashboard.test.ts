import { getDashboardMetrics } from '../src/lib/dashboard';
import { prisma } from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    executionRun: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalCostUsd: 123.45 } }),
      count: jest.fn().mockResolvedValue(3),
    },
    decisionProposal: { count: jest.fn().mockResolvedValue(2) },
    departmentHandoff: { count: jest.fn().mockResolvedValue(1) },
    documentReview: { count: jest.fn().mockResolvedValue(4) },
  },
}));

describe('getDashboardMetrics', () => {
  it('returns aggregated metrics', async () => {
    const metrics = await getDashboardMetrics('tenant1');
    expect(metrics.totalCostUsd).toBeCloseTo(123.45);
    expect(metrics.activeRuns).toBe(3);
    expect(metrics.pendingDecisions).toBe(2);
    expect(metrics.pendingHandoffs).toBe(1);
    expect(metrics.pendingReviews).toBe(4);
  });
});
