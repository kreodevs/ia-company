import { prisma } from './prisma.js';

/**
 * Simple placeholder implementation for Corte 4 – Objective & Initiative data.
 * In a real system these would be proper Prisma models; here we mock the shape
 * based on existing tables to keep the code compile‑ready.
 */
export async function getObjectives(tenantId: string) {
  // Real DB query using Prisma models.
  return prisma.companyGoal.findMany({ where: { tenantId } });
}

export async function getInitiatives(tenantId: string) {
  // Real DB query using Prisma models.
  return prisma.initiative.findMany({ where: { tenantId } });
}

export async function getCostMetrics(tenantId: string) {
  // Aggregate simple cost metrics – in a real app would sum over runs, resources, etc.
  const totalCostUsd = await prisma.executionRun.aggregate({
    where: { tenantId },
    _sum: { totalCostUsd: true },
  }).then(r => Number(r._sum.totalCostUsd) || 0);
  const activeRuns = await prisma.executionRun.count({ where: { tenantId, status: 'RUNNING' } });
  return { totalCostUsd, activeRuns };
}

// ---------- CRUD for CompanyGoal ----------
export async function createObjective(tenantId: string, data: { name: string; description?: string; targetValue?: number }) {
  return prisma.companyGoal.create({ data: { tenantId, name: data.name, description: data.description, targetValue: data.targetValue } });
}

export async function updateObjective(tenantId: string, id: string, data: { name?: string; description?: string; targetValue?: number; currentValue?: number }) {
  return prisma.companyGoal.update({ where: { id }, data: { ...data, tenantId } });
}

export async function deleteObjective(_tenantId: string, id: string) {
  return prisma.companyGoal.delete({ where: { id } });
}

// ---------- CRUD for Initiative ----------
export async function createInitiative(tenantId: string, data: { name: string; description?: string; status?: string; companyGoalId: string }) {
  return prisma.initiative.create({ data: { tenantId, name: data.name, description: data.description, status: data.status, companyGoalId: data.companyGoalId } });
}

export async function updateInitiative(tenantId: string, id: string, data: { name?: string; description?: string; status?: string; companyGoalId?: string }) {
  return prisma.initiative.update({ where: { id }, data: { ...data, tenantId } });
}

export async function deleteInitiative(_tenantId: string, id: string) {
  return prisma.initiative.delete({ where: { id } });
}
