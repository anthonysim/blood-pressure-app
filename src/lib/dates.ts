import "server-only";
import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Filters } from "./filters";
import { isValidTimeZone, TZ_COOKIE } from "./timezone";

export const getTimeZone = cache(async (): Promise<string> => {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : "UTC";
});

function parseLocalDate(value: string, tz: string): TZDate {
  const [y, m, d] = value.split("-").map(Number);
  return new TZDate(y, m - 1, d, tz);
}

/** Parse a datetime-local value ("yyyy-MM-ddTHH:mm") as wall-clock time in `tz`. */
export function parseLocalDateTime(value: string, tz: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const date = new TZDate(y, mo - 1, d, h, mi, tz);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getTime());
}

/** Inclusive start / exclusive end instants for a filter's date range, in the user's zone. */
export function dateBounds(filters: Filters, tz: string, now: Date): { start?: Date; end?: Date } {
  const today = startOfDay(new TZDate(now, tz));
  switch (filters.range) {
    case "7d":
      return { start: subDays(today, 6) };
    case "30d":
      return { start: subDays(today, 29) };
    case "90d":
      return { start: subDays(today, 89) };
    case "month":
      return { start: startOfMonth(today) };
    case "all":
      return {};
    case "custom":
      return {
        start: filters.from ? parseLocalDate(filters.from, tz) : undefined,
        end: filters.to ? addDays(parseLocalDate(filters.to, tz), 1) : undefined,
      };
  }
}

export function formatInZone(date: Date, pattern: string, tz: string): string {
  return format(new TZDate(date, tz), pattern);
}
