import type { FastifyInstance } from "fastify";
import type { ScheduleKind } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { ensureMetaSchedule } from "../../core/meta-orchestrator.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      await ensureMetaSchedule(tenantId);
      return prisma.autonomousSchedule.findMany({
        where: { tenantId },
        orderBy: [{ scheduleKind: "desc" }, { createdAt: "desc" }],
      });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: {
      name: string;
      workflowId?: string;
      intervalSec?: number;
      enabled?: boolean;
      scheduleKind?: ScheduleKind;
    };
  }>("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const {
        name,
        workflowId,
        intervalSec = 1800,
        enabled = true,
        scheduleKind = "workflow",
      } = request.body;

      if (scheduleKind === "meta") {
        const schedule = await ensureMetaSchedule(tenantId);
        if (name !== schedule.name || intervalSec !== schedule.intervalSec || enabled !== schedule.enabled) {
          const updated = await prisma.autonomousSchedule.update({
            where: { id: schedule.id },
            data: { name, intervalSec, enabled, nextRunAt: enabled ? new Date() : null },
          });
          await logAudit(request, "schedule.create", { scheduleId: updated.id, name, scheduleKind: "meta" });
          return reply.status(201).send(updated);
        }
        return reply.status(201).send(schedule);
      }

      if (!workflowId) {
        return reply.status(400).send({ error: "workflowId is required for workflow schedules" });
      }

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
          scheduleKind: "workflow",
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

  app.put<{ Params: { id: string }; Body: { enabled?: boolean; intervalSec?: number; name?: string } }>(
    "/schedules/:id",
    async (request, reply) => {
      try {
        const tenantId = requireImpersonatedTenant(request);
        const existing = await prisma.autonomousSchedule.findFirst({
          where: { id: request.params.id, tenantId },
        });
        if (!existing) return reply.status(404).send({ error: "Schedule not found" });

        const { enabled, intervalSec, name } = request.body;
        const data: {
          enabled?: boolean;
          intervalSec?: number;
          name?: string;
          nextRunAt?: Date | null;
        } = {};

        if (name !== undefined) data.name = name;
        if (intervalSec !== undefined) data.intervalSec = intervalSec;

        if (enabled !== undefined) {
          data.enabled = enabled;
          data.nextRunAt = enabled ? new Date() : null;
        } else if (intervalSec !== undefined && existing.enabled) {
          data.nextRunAt = new Date();
        }

        const schedule = await prisma.autonomousSchedule.update({
          where: { id: request.params.id },
          data,
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

      await assertTenantCanExecute(tenantId);

      let runId: string;
      if (schedule.scheduleKind === "meta") {
        const { executeMetaScheduleRun } = await import("../../core/meta-orchestrator.js");
        runId = await executeMetaScheduleRun(tenantId);
      } else {
        if (!schedule.workflowId) {
          return reply.status(400).send({ error: "Schedule has no workflow configured" });
        }
        const { executeWorkflowInBackground } = await import("../../core/engine.js");
        runId = await executeWorkflowInBackground(schedule.workflowId, {
          tenantId,
          mergeConsensus: true,
          syncConsensus: true,
        });
      }

      await logAudit(request, "schedule.run_now", { scheduleId: schedule.id, runId });
      return reply.status(202).send({ runId, status: "PENDING" });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
