import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { backfillPipelineFromLastDiscovery } from "../../lib/convergence.js";
import { resolveMetaOrchestratorDecision } from "../../core/meta-orchestrator.js";
import { filterActionablePipelineIdeas } from "../../lib/pipeline-utils.js";
import {
  ensureDefaultProducts,
  ensureTenantCycleState,
  listPipelineIdeas,
  listTenantProducts,
} from "../../lib/product-registry.js";
import { WORKFLOW_NAMES } from "../../lib/workflow-names.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function opsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/ops/portfolio", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      await ensureDefaultProducts(tenantId, tenant.slug);
      await backfillPipelineFromLastDiscovery(tenantId);

      const [products, ideas, cycle, consensus, schedules, recentRuns, lastDiscoveryRun] =
        await Promise.all([
        listTenantProducts(tenantId),
        listPipelineIdeas(tenantId),
        ensureTenantCycleState(tenantId),
        prisma.tenantConsensus.findUnique({ where: { tenantId } }),
        prisma.autonomousSchedule.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.executionRun.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { workflow: { select: { id: true, name: true } } },
        }),
        prisma.executionRun.findFirst({
          where: {
            tenantId,
            status: "COMPLETED",
            workflow: { name: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true },
        }),
      ]);

      const focusProduct = products.find((p) => p.id === cycle.focusProductId) ?? null;
      const buildingCount = products.filter(
        (p) => p.phase === "building" || p.phase === "launching",
      ).length;
      const growingCount = products.filter((p) => p.phase === "growing").length;
      const totalRevenue = products.reduce((sum, p) => sum + (p.revenueUsd ?? 0), 0);

      return {
        companyPhase: consensus?.companyPhase ?? cycle.phase,
        cycleNumber: cycle.cycleNumber,
        stuckCounter: cycle.stuckCounter,
        nextAction: consensus?.nextAction ?? null,
        focusProduct,
        stats: {
          products: products.length,
          building: buildingCount,
          growing: growingCount,
          pipeline: ideas.length,
          totalRevenueUsd: totalRevenue,
        },
        products,
        pipeline: filterActionablePipelineIdeas(ideas, products),
        schedules,
        recentRuns: recentRuns.map((run) => ({
          id: run.id,
          status: run.status,
          createdAt: run.createdAt,
          workflow: run.workflow,
        })),
        lastDiscoveryRun: lastDiscoveryRun
          ? { id: lastDiscoveryRun.id, createdAt: lastDiscoveryRun.createdAt }
          : null,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/ops/next-run", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const decision = await resolveMetaOrchestratorDecision(tenantId);
      return {
        workflowId: decision.workflowId,
        workflowName: decision.workflowName,
        productSlug: decision.productSlug ?? null,
        reason: decision.reason,
      };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
