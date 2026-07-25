export const DEFAULT_SCHEDULE_TIMEZONE = "UTC";

export function isValidTimezone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  const hour = Number(lookup.hour);
  return {
    minute: Number(lookup.minute),
    hour: hour === 24 ? 0 : hour,
    day: Number(lookup.day),
    month: Number(lookup.month),
    weekday: WEEKDAY_TO_INDEX[lookup.weekday] ?? 0,
  };
}

function fieldMatches(value: number, field: string): boolean {
  if (field === "*") return true;
  if (field.startsWith("*/")) {
    const step = Number(field.slice(2));
    return Number.isFinite(step) && step > 0 && value % step === 0;
  }
  return field.split(",").some((part) => {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      return value >= start && value <= end;
    }
    return Number(part) === value;
  });
}

export function cronMatches(
  date: Date,
  cronExpr: string,
  options?: { timeZone?: string },
): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const timeZone = options?.timeZone ?? DEFAULT_SCHEDULE_TIMEZONE;
  const zoned = getDatePartsInTimeZone(date, timeZone);

  return (
    fieldMatches(zoned.minute, minute) &&
    fieldMatches(zoned.hour, hour) &&
    fieldMatches(zoned.day, dayOfMonth) &&
    fieldMatches(zoned.month, month) &&
    fieldMatches(zoned.weekday, dayOfWeek)
  );
}

export function normalizeIntervalSec(value: number): number {
  if (!Number.isFinite(value) || value < 60) return 60;
  return Math.floor(value);
}

export function computeNextRunAt(options: {
  from: Date;
  intervalSec?: number;
  cronExpr?: string | null;
  timeZone?: string;
}): Date {
  const from = options.from;
  const timeZone = options.timeZone ?? DEFAULT_SCHEDULE_TIMEZONE;

  if (options.cronExpr?.trim()) {
    const cronExpr = options.cronExpr.trim();
    const cursor = new Date(from.getTime());
    cursor.setUTCSeconds(0, 0);
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

    const limit = new Date(from.getTime());
    limit.setUTCDate(limit.getUTCDate() + 400);

    while (cursor <= limit) {
      if (cronMatches(cursor, cronExpr, { timeZone })) {
        return new Date(cursor.getTime());
      }
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    }

    return new Date(from.getTime() + normalizeIntervalSec(options.intervalSec ?? 1800) * 1000);
  }

  const intervalSec = normalizeIntervalSec(options.intervalSec ?? 1800);
  return new Date(from.getTime() + intervalSec * 1000);
}

export function formatScheduleInstant(
  iso: string | Date | null | undefined,
  timeZone: string,
  locale?: string,
): string | null {
  if (!iso) return null;
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale ?? undefined, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
