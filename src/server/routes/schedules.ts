import type { FastifyInstance } from "fastify";
import { Prisma, type OrchestrationMode, type ScheduleKind } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import {
  applyOrchestrationPreset,
  ensureDefaultOrchestrationPlan,
  executeScheduleRule,
  resolveNextRunAt,
  scheduleKindFromMode,
} from "../../lib/orchestration-plan.js";
import { computeNextRunAt, normalizeIntervalSec } from "../../lib/schedule-timing.js";
import { ORCHESTRATION_PRESETS, isOrchestrationPresetId } from "../../lib/orchestration-presets.js";
import type { ScheduleConditions } from "../../types/orchestration.js";

function serializeSchedule<T extends Record<string, unknown>>(schedule: T) {
  return schedule;
}

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const schedules = await ensureDefaultOrchestrationPlan(tenantId);
      return schedules;
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.get("/schedules/presets", async (_request, reply) => {
    try {
      return Object.values(ORCHESTRATION_PRESETS).map((preset) => ({
        id: preset.id,
        labelKey: preset.labelKey,
        descriptionKey: preset.descriptionKey,
        ruleCount: preset.rules.length,
      }));
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{ Body: { presetId: string } }>("/schedules/apply-preset", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { presetId } = request.body;
      if (!isOrchestrationPresetId(presetId)) {
        return reply.status(400).send({ error: "Unknown preset" });
      }
      const schedules = await applyOrchestrationPreset(tenantId, presetId);
      await logAudit(request, "schedule.apply_preset", { presetId, count: schedules.length });
      return reply.status(201).send(schedules);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.post<{
    Body: {
      name: string;
      workflowId?: string;
      intervalSec?: number;
      cronExpr?: string | null;
      enabled?: boolean;
      scheduleKind?: ScheduleKind;
      orchestrationMode?: OrchestrationMode;
      priority?: number;
      conditions?: ScheduleConditions | null;
    };
  }>("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const {
        name,
        workflowId,
        intervalSec = 1800,
        cronExpr = null,
        enabled = true,
        scheduleKind,
        orchestrationMode: orchestrationModeInput,
        priority = 0,
        conditions = null,
      } = request.body;

      const orchestrationMode =
        orchestrationModeInput ??
        (scheduleKind === "meta" ? "meta_dynamic" : "fixed");

      if (orchestrationMode === "meta_dynamic") {
        return reply.status(400).send({
          error:
            "Dynamic meta orchestrator schedules are deprecated. Use the Office for on-demand work or fixed workflow rules.",
        });
      }

      if (orchestrationMode === "fixed" && !workflowId) {
        return reply.status(400).send({ error: "workflowId is required for fixed schedules" });
      }

      if (workflowId) {
        const workflow = await prisma.workflow.findFirst({
          where: { id: workflowId, tenantId },
        });
        if (!workflow) {
          return reply.status(404).send({ error: "Workflow not found" });
        }
      }

      const schedule = await prisma.autonomousSchedule.create({
        data: {
          tenantId,
          workflowId: orchestrationMode === "fixed" ? workflowId : null,
          scheduleKind: scheduleKindFromMode(orchestrationMode),
          orchestrationMode,
          name,
          intervalSec: normalizeIntervalSec(intervalSec),
          cronExpr,
          priority,
          conditions: (conditions ?? undefined) as Prisma.InputJsonValue | undefined,
          enabled,
          nextRunAt: enabled ? computeNextRunAt({ intervalSec, cronExpr }) : null,
        },
      });

      await logAudit(request, "schedule.create", { scheduleId: schedule.id, name, orchestrationMode });
      return reply.status(201).send(schedule);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{
    Params: { id: string };
    Body: {
      enabled?: boolean;
      intervalSec?: number;
      cronExpr?: string | null;
      name?: string;
      priority?: number;
      conditions?: ScheduleConditions | null;
      workflowId?: string | null;
      orchestrationMode?: OrchestrationMode;
    };
  }>("/schedules/:id", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const existing = await prisma.autonomousSchedule.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.status(404).send({ error: "Schedule not found" });

      const {
        enabled,
        intervalSec,
        cronExpr,
        name,
        priority,
        conditions,
        workflowId,
        orchestrationMode,
      } = request.body;

      const data: Prisma.AutonomousScheduleUpdateInput = {};

      if (name !== undefined) data.name = name;
      if (intervalSec !== undefined) data.intervalSec = normalizeIntervalSec(intervalSec);
      if (cronExpr !== undefined) data.cronExpr = cronExpr;
      if (priority !== undefined) data.priority = priority;
      if (conditions !== undefined) {
        data.conditions =
          conditions === null ? Prisma.DbNull : (conditions as Prisma.InputJsonValue);
      }
      if (workflowId !== undefined) data.workflowId = workflowId;
      if (orchestrationMode !== undefined) {
        if (orchestrationMode === "meta_dynamic") {
          return reply.status(400).send({
            error:
              "Dynamic meta orchestrator schedules are deprecated. Use the Office for on-demand work or fixed workflow rules.",
          });
        }
        data.orchestrationMode = orchestrationMode;
        data.scheduleKind = scheduleKindFromMode(orchestrationMode);
      }

      const nextIntervalSec =
        intervalSec !== undefined ? normalizeIntervalSec(intervalSec) : existing.intervalSec;
      const nextCronExpr = cronExpr === undefined ? existing.cronExpr : cronExpr;

      if (enabled !== undefined) {
        data.enabled = enabled;
        data.nextRunAt = enabled
          ? computeNextRunAt({
              intervalSec: nextIntervalSec,
              cronExpr: nextCronExpr,
            })
          : null;
      } else if (intervalSec !== undefined || cronExpr !== undefined) {
        data.nextRunAt = existing.enabled
          ? computeNextRunAt({
              intervalSec: nextIntervalSec,
              cronExpr: nextCronExpr,
            })
          : null;
      }

      const schedule = await prisma.autonomousSchedule.update({
        where: { id: request.params.id },
        data,
      });
      return serializeSchedule(schedule);
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

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
      const { assertTenantCanLaunchRun } = await import("../../lib/run-guards.js");
      await assertTenantCanExecute(tenantId);
      await assertTenantCanLaunchRun(tenantId);

      const runId = await executeScheduleRule(schedule);
      if (!runId) {
        return reply.status(409).send({
          error: "Schedule could not run — an active run or pending decision is blocking execution",
          code: "BLOCKED",
        });
      }

      await prisma.autonomousSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: schedule.enabled ? resolveNextRunAt(schedule) : null,
        },
      });

      await logAudit(request, "schedule.run_now", { scheduleId: schedule.id, runId });
      return reply.status(202).send({ runId, status: "PENDING" });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
