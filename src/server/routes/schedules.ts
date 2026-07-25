import type { FastifyInstance } from "fastify";
import { Prisma, type OrchestrationMode, type ScheduleKind } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { handleRouteError, requireImpersonatedTenant } from "../lib/request-context.js";
import {
  applyOrchestrationPreset,
  ensureDefaultOrchestrationPlan,
  executeScheduleRule,
  resolveNextRunAtForTenant,
  scheduleKindFromMode,
} from "../../lib/orchestration-plan.js";
import { computeNextRunAt, normalizeIntervalSec } from "../../lib/schedule-timing.js";
import { ORCHESTRATION_PRESETS, isOrchestrationPresetId } from "../../lib/orchestration-presets.js";
import { enrichSchedulesForTenant, enrichScheduleForTenant } from "../../lib/schedule-enrichment.js";
import {
  getTenantScheduleTimezone,
  updateTenantScheduleTimezone,
} from "../../lib/tenant-schedule-settings.js";
import type { ScheduleConditions } from "../../types/orchestration.js";

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);

  app.get("/schedules", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const schedules = await ensureDefaultOrchestrationPlan(tenantId);
      const timezone = await getTenantScheduleTimezone(tenantId);
      const enriched = await enrichSchedulesForTenant(tenantId, schedules);
      return { timezone, schedules: enriched };
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
      const timezone = await getTenantScheduleTimezone(tenantId);
      const enriched = await enrichSchedulesForTenant(tenantId, schedules);
      return reply.status(201).send({ timezone, schedules: enriched });
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

      const timeZone = await getTenantScheduleTimezone(tenantId);
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
          nextRunAt: enabled
            ? computeNextRunAt({ from: new Date(), intervalSec, cronExpr, timeZone })
            : null,
        },
      });

      await logAudit(request, "schedule.create", { scheduleId: schedule.id, name, orchestrationMode });
      return reply.status(201).send(await enrichScheduleForTenant(tenantId, schedule));
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
      const timeZone = await getTenantScheduleTimezone(tenantId);

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
              from: new Date(),
              intervalSec: nextIntervalSec,
              cronExpr: nextCronExpr,
              timeZone,
            })
          : null;
      } else if (intervalSec !== undefined || cronExpr !== undefined) {
        data.nextRunAt = existing.enabled
          ? computeNextRunAt({
              from: new Date(),
              intervalSec: nextIntervalSec,
              cronExpr: nextCronExpr,
              timeZone,
            })
          : null;
      }

      const schedule = await prisma.autonomousSchedule.update({
        where: { id: request.params.id },
        data,
      });
      return enrichScheduleForTenant(tenantId, schedule);
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
          lastSkipReason: null,
          lastSkippedAt: null,
          nextRunAt: schedule.enabled ? await resolveNextRunAtForTenant(tenantId, schedule) : null,
        },
      });

      await logAudit(request, "schedule.run_now", { scheduleId: schedule.id, runId });

      const { extractRunProductMemory, resolveFocusProductForTenant } = await import(
        "../../lib/product-run-association.js"
      );
      const run = await prisma.executionRun.findUnique({
        where: { id: runId },
        select: { sharedMemory: true },
      });
      let productId = extractRunProductMemory(run?.sharedMemory).productId;
      if (!productId) {
        const focused = await resolveFocusProductForTenant(tenantId);
        productId = focused?.id ?? null;
      }

      return reply.status(202).send({ runId, status: "PENDING", productId });
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}

export async function tenantSchedulingSettingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireTenantContext);
  app.addHook("preHandler", app.requireTenantAdmin);

  app.get("/tenant/settings/scheduling", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const timezone = await getTenantScheduleTimezone(tenantId);
      return { tenantId, timezone };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });

  app.put<{ Body: { timezone: string } }>("/tenant/settings/scheduling", async (request, reply) => {
    try {
      const tenantId = requireImpersonatedTenant(request);
      const { timezone } = request.body;
      const updated = await updateTenantScheduleTimezone(tenantId, timezone);
      await logAudit(request, "tenant.scheduling.update", { timezone: updated });
      return { tenantId, timezone: updated };
    } catch (err) {
      return handleRouteError(reply, err);
    }
  });
}
