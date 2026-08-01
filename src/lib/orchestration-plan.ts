import type { Prisma } from "@prisma/client";
import type { AutonomousSchedule, OrchestrationMode, ScheduleKind } from "@prisma/client";
import { prisma } from "./prisma.js";
import { computeNextRunAt } from "./schedule-timing.js";
import { getTenantScheduleTimezone } from "./tenant-schedule-settings.js";
import {
  evaluateScheduleConditions,
  loadScheduleConditionContext,
  parseScheduleConditions,
  tenantHasActiveRun,
} from "./orchestration-conditions.js";
import { ORCHESTRATION_PRESETS, isOrchestrationPresetId } from "./orchestration-presets.js";
import { executeMetaScheduleRun, resolveMetaOrchestratorDecision } from "../core/meta-orchestrator.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { isCompanyScopedWorkflow, shouldAttachFocusProductForScheduledRun } from "./scope-contract.js";
import type { OrchestrationPreviewEntry } from "../types/orchestration.js";
import { loadOrgUnitContext, orgContextToInitialMemory } from "./org-context.js";

const LEGACY_META_NAME_PATTERNS = [/^autonomous company/i, /^orquestador din[aá]mico$/i];

export function isLegacyMetaSchedule(
  schedule: Pick<AutonomousSchedule, "name" | "orchestrationMode">,
): boolean {
  if (schedule.orchestrationMode !== "meta_dynamic") return false;
  const name = schedule.name.trim();
  return LEGACY_META_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

export function scheduleKindFromMode(mode: OrchestrationMode): ScheduleKind {
  return mode === "meta_dynamic" ? "meta" : "workflow";
}

export function orchestrationModeFromScheduleKind(kind: ScheduleKind): OrchestrationMode {
  return kind === "meta" ? "meta_dynamic" : "fixed";
}

export function resolveNextRunAt(
  schedule: Pick<AutonomousSchedule, "intervalSec" | "cronExpr" | "enabled">,
  options?: { timeZone?: string },
): Date | null {
  if (!schedule.enabled) return null;
  return computeNextRunAt({
    from: new Date(),
    intervalSec: schedule.intervalSec,
    cronExpr: schedule.cronExpr,
    timeZone: options?.timeZone,
  });
}

export async function resolveNextRunAtForTenant(
  tenantId: string,
  schedule: Pick<AutonomousSchedule, "intervalSec" | "cronExpr" | "enabled">,
): Promise<Date | null> {
  const timeZone = await getTenantScheduleTimezone(tenantId);
  return resolveNextRunAt(schedule, { timeZone });
}

export async function ensureDefaultOrchestrationPlan(tenantId: string) {
  const existing = await prisma.autonomousSchedule.findMany({ where: { tenantId } });
  if (existing.length > 0) {
    await migrateLegacySchedules(existing);
    await migrateObsoleteOrchestrationPlan(tenantId, existing);
    return prisma.autonomousSchedule.findMany({
      where: { tenantId },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
  }

  await applyOrchestrationPreset(tenantId, "on_demand");
  return prisma.autonomousSchedule.findMany({
    where: { tenantId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

async function migrateObsoleteOrchestrationPlan(
  tenantId: string,
  schedules: AutonomousSchedule[],
) {
  const metaDynamic = schedules.filter((schedule) => schedule.orchestrationMode === "meta_dynamic");
  if (metaDynamic.length === 0) return;

  await prisma.autonomousSchedule.deleteMany({
    where: { tenantId, orchestrationMode: "meta_dynamic" },
  });

  const remaining = schedules.filter((schedule) => schedule.orchestrationMode !== "meta_dynamic");
  if (remaining.length === 0) {
    await applyOrchestrationPreset(tenantId, "on_demand");
  }
}

async function migrateLegacySchedules(schedules: AutonomousSchedule[]) {
  for (const schedule of schedules) {
    const expectedMode = orchestrationModeFromScheduleKind(schedule.scheduleKind);
    const updates: {
      orchestrationMode?: OrchestrationMode;
      nextRunAt?: Date | null;
    } = {};

    if (schedule.orchestrationMode !== expectedMode) {
      updates.orchestrationMode = expectedMode;
    }
    if (!schedule.nextRunAt && schedule.enabled) {
      updates.nextRunAt = await resolveNextRunAtForTenant(schedule.tenantId, schedule);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.autonomousSchedule.update({
        where: { id: schedule.id },
        data: updates,
      });
    }
  }
}

export async function applyOrchestrationPreset(
  tenantId: string,
  presetId: string,
): Promise<AutonomousSchedule[]> {
  if (!isOrchestrationPresetId(presetId)) {
    throw new Error(`Unknown orchestration preset: ${presetId}`);
  }

  const preset = ORCHESTRATION_PRESETS[presetId];
  const timeZone = await getTenantScheduleTimezone(tenantId);
  await prisma.autonomousSchedule.deleteMany({ where: { tenantId } });

  const created: AutonomousSchedule[] = [];
  for (const rule of preset.rules) {
    let workflowId: string | null = null;
    if (rule.workflowName) {
      const workflow = await prisma.workflow.findFirst({
        where: { tenantId, name: rule.workflowName },
      });
      workflowId = workflow?.id ?? null;
    }

    const scheduleKind = scheduleKindFromMode(rule.orchestrationMode);
    const nextRunAt = rule.enabled
      ? computeNextRunAt({
          from: new Date(),
          intervalSec: rule.intervalSec ?? 1800,
          cronExpr: rule.cronExpr ?? null,
          timeZone,
        })
      : null;

    const row = await prisma.autonomousSchedule.create({
      data: {
        tenantId,
        name: rule.name,
        scheduleKind,
        orchestrationMode: rule.orchestrationMode,
        workflowId,
        intervalSec: rule.intervalSec ?? 1800,
        cronExpr: rule.cronExpr ?? null,
        priority: rule.priority,
        conditions: (rule.conditions ?? undefined) as Prisma.InputJsonValue | undefined,
        enabled: rule.enabled,
        nextRunAt,
      },
    });
    created.push(row);
  }

  return created;
}

export async function executeScheduleRule(schedule: AutonomousSchedule): Promise<string | null> {
  const conditions = parseScheduleConditions(schedule.conditions);
  const orgUnitId = conditions?.orgUnitId;

  if (schedule.orchestrationMode === "meta_dynamic") {
    return executeMetaScheduleRun(schedule.tenantId, {
      orgUnitId,
      suggestOnly: conditions?.suggestOnly === true,
    });
  }
  if (!schedule.workflowId) {
    throw new Error(`Schedule ${schedule.id} has no workflow configured`);
  }

  const workflow = await prisma.workflow.findUnique({
    where: { id: schedule.workflowId },
    select: { id: true, name: true },
  });
  if (!workflow) {
    throw new Error(`Workflow ${schedule.workflowId} not found`);
  }

  let productId: string | undefined;
  let productSlug: string | undefined;
  let orgMemory: Record<string, unknown> | undefined;

  if (!orgUnitId && shouldAttachFocusProductForScheduledRun(workflow.name)) {
    const { resolveFocusProductForTenant } = await import("./product-run-association.js");
    const focused = await resolveFocusProductForTenant(schedule.tenantId);
    if (focused) {
      productId = focused.id;
      productSlug = focused.slug;
    }
  }

  if (orgUnitId) {
    const linked = await prisma.tenantProduct.findFirst({
      where: {
        tenantId: schedule.tenantId,
        orgUnitId,
        phase: { not: "archived" },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true },
    });
    productId = linked?.id;
    productSlug = linked?.slug;
    const orgCtx = await loadOrgUnitContext(schedule.tenantId, orgUnitId);
    if (orgCtx) {
      orgMemory = {
        ...orgContextToInitialMemory(orgCtx),
        ...(linked ? { focusProductSlug: linked.slug, productId: linked.id } : {}),
      };
    }
  }

  const { buildScheduledWorkflowInitialMemory } = await import("./workflow-run-memory.js");
  const initialMemory = await buildScheduledWorkflowInitialMemory(
    schedule.tenantId,
    workflow.name,
    {
      reason: `Scheduled: ${schedule.name}`,
      productId,
      productSlug,
      orgMemory,
    },
  );

  return executeWorkflowInBackground(schedule.workflowId, {
    tenantId: schedule.tenantId,
    productId: isCompanyScopedWorkflow(workflow.name) ? undefined : productId,
    productSlug: isCompanyScopedWorkflow(workflow.name) ? undefined : productSlug,
    workflowName: workflow.name,
    mergeConsensus: false,
    syncConsensus: true,
    initialMemory,
    metaReason: `Scheduled: ${schedule.name}`,
  });
}

export async function pickDueScheduleForTenant(
  tenantId: string,
  dueSchedules: AutonomousSchedule[],
): Promise<{ schedule: AutonomousSchedule; skipped: Array<{ id: string; reason: string }> } | null> {
  const tenantSchedules = dueSchedules
    .filter((schedule) => schedule.tenantId === tenantId)
    .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

  if (tenantSchedules.length === 0) return null;

  const context = await loadScheduleConditionContext(tenantId);
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const schedule of tenantSchedules) {
    const conditions = parseScheduleConditions(schedule.conditions);
    const evaluation = evaluateScheduleConditions(conditions, context);
    if (!evaluation.met) {
      skipped.push({ id: schedule.id, reason: evaluation.reason ?? "Conditions not met" });
      continue;
    }
    return { schedule, skipped };
  }

  return null;
}

export async function previewOrchestrationPlan(
  tenantId: string,
  days = 7,
): Promise<OrchestrationPreviewEntry[]> {
  const schedules = await prisma.autonomousSchedule.findMany({
    where: { tenantId, enabled: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  const [context, timeZone] = await Promise.all([
    loadScheduleConditionContext(tenantId),
    getTenantScheduleTimezone(tenantId),
  ]);
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const entries: OrchestrationPreviewEntry[] = [];

  for (const schedule of schedules) {
    const conditions = parseScheduleConditions(schedule.conditions);
    const evaluation = evaluateScheduleConditions(conditions, context);
    const workflowName =
      schedule.orchestrationMode === "meta_dynamic"
        ? (await resolveMetaOrchestratorDecision(tenantId, {
            orgUnitId: conditions?.orgUnitId,
          })).workflowName
        : schedule.workflowId
          ? (
              await prisma.workflow.findUnique({
                where: { id: schedule.workflowId },
                select: { name: true },
              })
            )?.name ?? null
          : null;

    const runTimes: Date[] = [];
    if (schedule.cronExpr) {
      runTimes.push(
        ...computeCronPreviewTimes({
          cronExpr: schedule.cronExpr,
          from: schedule.nextRunAt && schedule.nextRunAt > now ? schedule.nextRunAt : now,
          until,
          timeZone,
        }),
      );
    } else if (schedule.nextRunAt && schedule.nextRunAt <= until) {
      let cursor =
        schedule.nextRunAt > now
          ? schedule.nextRunAt
          : computeNextRunAt({
              from: now,
              intervalSec: schedule.intervalSec,
              timeZone,
            });
      while (cursor <= until && runTimes.length < 20) {
        runTimes.push(new Date(cursor.getTime()));
        cursor = computeNextRunAt({ from: cursor, intervalSec: schedule.intervalSec, timeZone });
      }
    }

    for (const runAt of runTimes) {
      entries.push({
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        orchestrationMode: schedule.orchestrationMode,
        workflowName,
        runAt: runAt.toISOString(),
        conditionsMet: evaluation.met,
        skippedReason: evaluation.met ? undefined : evaluation.reason,
      });
    }
  }

  return entries.sort((a, b) => a.runAt.localeCompare(b.runAt)).slice(0, 50);
}

function computeCronPreviewTimes(options: {
  cronExpr: string;
  from: Date;
  until: Date;
  timeZone?: string;
}): Date[] {
  const results: Date[] = [];
  let cursor = new Date(options.from.getTime());
  while (cursor <= options.until && results.length < 20) {
    const next = computeNextRunAt({
      from: cursor,
      cronExpr: options.cronExpr,
      timeZone: options.timeZone,
    });
    if (next <= cursor) break;
    results.push(next);
    cursor = new Date(next.getTime() + 60_000);
  }
  return results;
}

export async function tickOrchestrationSchedules(now = new Date()): Promise<void> {
  const due = await prisma.autonomousSchedule.findMany({
    where: {
      enabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    orderBy: [{ priority: "desc" }, { nextRunAt: "asc" }],
    take: 50,
  });

  const tenantIds = [...new Set(due.map((schedule) => schedule.tenantId))];
  const timezoneByTenant = new Map<string, string>();
  await Promise.all(
    tenantIds.map(async (tenantId) => {
      timezoneByTenant.set(tenantId, await getTenantScheduleTimezone(tenantId));
    }),
  );

  for (const tenantId of tenantIds) {
    const timeZone = timezoneByTenant.get(tenantId) ?? "UTC";

    if (await tenantHasActiveRun(tenantId)) {
      const tenantSchedules = due
        .filter((schedule) => schedule.tenantId === tenantId)
        .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

      await Promise.all(
        tenantSchedules.map((schedule) =>
          prisma.autonomousSchedule.update({
            where: { id: schedule.id },
            data: {
              lastSkipReason: "Active run in progress",
              lastSkippedAt: now,
              nextRunAt: computeNextRunAt({
                from: now,
                intervalSec: schedule.intervalSec,
                cronExpr: schedule.cronExpr,
                timeZone,
              }),
            },
          }),
        ),
      );
      continue;
    }

    const picked = await pickDueScheduleForTenant(tenantId, due);
    const tenantSchedules = due
      .filter((schedule) => schedule.tenantId === tenantId)
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

    if (!picked) {
      const context = await loadScheduleConditionContext(tenantId);
      await Promise.all(
        tenantSchedules.map(async (schedule) => {
          const evaluation = evaluateScheduleConditions(
            parseScheduleConditions(schedule.conditions),
            context,
          );
          if (evaluation.met) return;
          await prisma.autonomousSchedule.update({
            where: { id: schedule.id },
            data: {
              lastSkipReason: evaluation.reason ?? "Conditions not met",
              lastSkippedAt: now,
              nextRunAt: computeNextRunAt({
                from: now,
                intervalSec: schedule.intervalSec,
                cronExpr: schedule.cronExpr,
                timeZone,
              }),
            },
          });
        }),
      );
      continue;
    }

    const { schedule, skipped } = picked;

    try {
      const { assertTenantCanExecute } = await import("./usage-limits.js");
      await assertTenantCanExecute(schedule.tenantId);

      const runId = await executeScheduleRule(schedule);
      if (!runId) {
        await prisma.autonomousSchedule.update({
          where: { id: schedule.id },
          data: {
            lastSkipReason: "Could not start run",
            lastSkippedAt: now,
            nextRunAt: computeNextRunAt({
              from: now,
              intervalSec: schedule.intervalSec,
              cronExpr: schedule.cronExpr,
              timeZone,
            }),
          },
        });
        continue;
      }

      await prisma.autonomousSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastSkipReason: null,
          lastSkippedAt: null,
          nextRunAt: computeNextRunAt({
            from: now,
            intervalSec: schedule.intervalSec,
            cronExpr: schedule.cronExpr,
            timeZone,
          }),
        },
      });

      console.log(
        `Scheduled run ${runId} for ${schedule.name} (${schedule.orchestrationMode}) tenant=${schedule.tenantId}`,
      );

      for (const item of skipped) {
        const skippedSchedule = due.find((row) => row.id === item.id);
        if (!skippedSchedule) continue;
        await prisma.autonomousSchedule.update({
          where: { id: skippedSchedule.id },
          data: {
            lastSkipReason: item.reason,
            lastSkippedAt: now,
            nextRunAt: computeNextRunAt({
              from: now,
              intervalSec: skippedSchedule.intervalSec,
              cronExpr: skippedSchedule.cronExpr,
              timeZone,
            }),
          },
        });
      }
    } catch (err) {
      console.error(`Schedule ${schedule.id} failed:`, err);
    }
  }
}
