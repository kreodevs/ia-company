import type { AutonomousSchedule } from "@prisma/client";
import {
  evaluateScheduleConditions,
  loadScheduleConditionContext,
  parseScheduleConditions,
  tenantHasActiveRun,
} from "./orchestration-conditions.js";
import { getTenantScheduleTimezone } from "./tenant-schedule-settings.js";

export interface EnrichedAutonomousSchedule extends AutonomousSchedule {
  tenantTimezone: string;
  conditionsMet: boolean;
  currentSkipReason: string | null;
}

export async function enrichSchedulesForTenant(
  tenantId: string,
  schedules: AutonomousSchedule[],
): Promise<EnrichedAutonomousSchedule[]> {
  const [timezone, context, activeRun] = await Promise.all([
    getTenantScheduleTimezone(tenantId),
    loadScheduleConditionContext(tenantId),
    tenantHasActiveRun(tenantId),
  ]);

  return schedules.map((schedule) => {
    const conditions = parseScheduleConditions(schedule.conditions);
    const evaluation = evaluateScheduleConditions(conditions, context);
    let currentSkipReason: string | null = null;
    let conditionsMet = evaluation.met;

    if (activeRun) {
      conditionsMet = false;
      currentSkipReason = "Active run in progress";
    } else if (!evaluation.met) {
      currentSkipReason = evaluation.reason ?? "Conditions not met";
    }

    return {
      ...schedule,
      tenantTimezone: timezone,
      conditionsMet,
      currentSkipReason,
    };
  });
}

export async function enrichScheduleForTenant(
  tenantId: string,
  schedule: AutonomousSchedule,
): Promise<EnrichedAutonomousSchedule> {
  const [enriched] = await enrichSchedulesForTenant(tenantId, [schedule]);
  return enriched;
}
