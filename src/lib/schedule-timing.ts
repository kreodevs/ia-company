const MIN_INTERVAL_SEC = 60;

function parseCronField(field: string, min: number, max: number): Set<number> | null {
  const trimmed = field.trim();
  if (trimmed === "*") return null;

  const values = new Set<number>();
  for (const part of trimmed.split(",")) {
    if (part.includes("/")) {
      const [base, stepRaw] = part.split("/");
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) continue;
      const start = base === "*" ? min : Number(base);
      for (let value = start; value <= max; value += step) values.add(value);
      continue;
    }
    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      for (let value = start; value <= end; value += 1) values.add(value);
      continue;
    }
    values.add(Number(part));
  }
  return values;
}

function cronMatches(date: Date, cronExpr: string): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minuteField, hourField, dayField, monthField, weekdayField] = parts;
  const minute = parseCronField(minuteField, 0, 59);
  const hour = parseCronField(hourField, 0, 23);
  const day = parseCronField(dayField, 1, 31);
  const month = parseCronField(monthField, 1, 12);
  const weekday = parseCronField(weekdayField, 0, 7);

  const dMinute = date.getMinutes();
  const dHour = date.getHours();
  const dDay = date.getDate();
  const dMonth = date.getMonth() + 1;
  const dWeekday = date.getDay();

  if (minute && !minute.has(dMinute)) return false;
  if (hour && !hour.has(dHour)) return false;
  if (month && !month.has(dMonth)) return false;

  const weekdayMatch =
    !weekday ||
    weekday.has(dWeekday) ||
    (dWeekday === 0 && weekday.has(7));
  const dayMatch = !day || day.has(dDay);

  if (weekday && day) {
    return weekdayMatch || dayMatch;
  }
  if (weekday) return weekdayMatch;
  if (day) return dayMatch;
  return true;
}

export function normalizeIntervalSec(intervalSec: number | null | undefined): number {
  return Math.max(MIN_INTERVAL_SEC, intervalSec ?? 1800);
}

export function computeNextRunAt(options: {
  from?: Date;
  intervalSec?: number | null;
  cronExpr?: string | null;
}): Date {
  const from = options.from ?? new Date();

  if (options.cronExpr?.trim()) {
    const cursor = new Date(from.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    const limit = new Date(from.getTime() + 366 * 24 * 60 * 60 * 1000);
    while (cursor <= limit) {
      if (cronMatches(cursor, options.cronExpr.trim())) {
        return new Date(cursor.getTime());
      }
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
    return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(from.getTime() + normalizeIntervalSec(options.intervalSec) * 1000);
}

export function listCronOccurrences(options: {
  cronExpr: string;
  from: Date;
  until: Date;
  max?: number;
}): Date[] {
  const results: Date[] = [];
  const cursor = new Date(options.from.getTime());
  cursor.setSeconds(0, 0);

  while (cursor <= options.until && results.length < (options.max ?? 100)) {
    if (cronMatches(cursor, options.cronExpr.trim())) {
      results.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

export function describeScheduleTiming(intervalSec: number, cronExpr?: string | null): string {
  if (cronExpr?.trim()) return cronExpr.trim();
  if (intervalSec >= 86400 && intervalSec % 86400 === 0) {
    return `every ${intervalSec / 86400}d`;
  }
  if (intervalSec >= 3600 && intervalSec % 3600 === 0) {
    return `every ${intervalSec / 3600}h`;
  }
  return `every ${intervalSec}s`;
}
