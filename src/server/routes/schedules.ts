import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      return prisma.autonomousSchedule.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: { name: string; workflowId: string; intervalSec?: number; enabled?: boolean };
  }>("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { name, workflowId, intervalSec = 1800, enabled = true } = request.body;

      const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, tenantId },
      });
      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      const schedule = await prisma.autonomousSchedule.create({
        data: {
          tenantId,
          workflowId,
          name,
          intervalSec,
          enabled,
          nextRunAt: enabled ? new Date() : null,
        },
      });

      await logAudit(request, "schedule.create", { scheduleId: schedule.id, name });
      return reply.status(201).send(schedule);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Params: { id: string }; Body: { enabled?: boolean; intervalSec?: number } }>(
    "/schedules/:id",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const existing = await prisma.autonomousSchedule.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!existing) return reply.status(404).send({ error: "Schedule not found" });

        const schedule = await prisma.autonomousSchedule.update({
          where: { id: request.params.id },
          data: request.body,
        });
        return schedule;
      } catch (err) {
        return handleRouteError(reply, err);
      }
    },
  );

  app.delete<{ Params: { id: string } }>("/schedules/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.autonomousSchedule.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Schedule not found" });
      await prisma.autonomousSchedule.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Params: { id: string } }>("/schedules/:id/run-now", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const schedule = await prisma.autonomousSchedule.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!schedule) return reply.status(404).send({ error: "Schedule not found" });

      const { assertTenantCanExecute } = await import("../../lib/usage-limits.js");
      const { executeWorkflowInBackground } = await import("../../core/engine.js");

      await assertTenantCanExecute(tenantId);

      const runId = await executeWorkflowInBackground(schedule.workflowId, {
        tenantId,
        mergeConsensus: true,
        syncConsensus: true,
      });

      await logAudit(request, "schedule.run_now", { scheduleId: schedule.id, runId });
      return reply.status(202).send({ runId, status: "PENDING" });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
