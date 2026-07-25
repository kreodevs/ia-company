import { prisma } from "./prisma.js";
import {
  computeNextRunAt,
  DEFAULT_SCHEDULE_TIMEZONE,
  isValidTimezone,
} from "./schedule-timing.js";

export { DEFAULT_SCHEDULE_TIMEZONE, isValidTimezone };

export async function getTenantScheduleTimezone(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { scheduleTimezone: true },
  });
  const tz = tenant?.scheduleTimezone?.trim();
  return tz && isValidTimezone(tz) ? tz : DEFAULT_SCHEDULE_TIMEZONE;
}

export async function updateTenantScheduleTimezone(
  tenantId: string,
  timezone: string,
): Promise<string> {
  const normalized = timezone.trim();
  if (!isValidTimezone(normalized)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { scheduleTimezone: normalized },
  });

  const schedules = await prisma.autonomousSchedule.findMany({
    where: { tenantId, enabled: true },
    select: { id: true, intervalSec: true, cronExpr: true, nextRunAt: true },
  });

  const now = new Date();
  await Promise.all(
    schedules.map((schedule) => {
      const anchor = schedule.nextRunAt && schedule.nextRunAt > now ? schedule.nextRunAt : now;
      const nextRunAt = computeNextRunAt({
        from: anchor,
        intervalSec: schedule.intervalSec,
        cronExpr: schedule.cronExpr,
        timeZone: normalized,
      });
      return prisma.autonomousSchedule.update({
        where: { id: schedule.id },
        data: { nextRunAt },
      });
    }),
  );

  return normalized;
}
