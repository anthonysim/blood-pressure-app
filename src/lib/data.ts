import "server-only";
import { and, avg, count, desc, eq, gte, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { reading, savedSearch } from "@/db/schema";
import { requireUser } from "./auth";
import { PERIODS, type Category } from "./bp";
import type { DailyPoint, PeriodAverage } from "./chart-types";
import { dateBounds, getTimeZone } from "./dates";
import type { Filters } from "./filters";

const MAX_ROWS = 1000;

const CATEGORY_SQL: Record<Category, SQL> = {
  crisis: sql`(${reading.systolic} > 180 or ${reading.diastolic} > 120)`,
  stage2: sql`((${reading.systolic} >= 140 or ${reading.diastolic} >= 90) and ${reading.systolic} <= 180 and ${reading.diastolic} <= 120)`,
  stage1: sql`((${reading.systolic} >= 130 or ${reading.diastolic} >= 80) and ${reading.systolic} < 140 and ${reading.diastolic} < 90)`,
  elevated: sql`(${reading.systolic} between 120 and 129 and ${reading.diastolic} < 80)`,
  normal: sql`(${reading.systolic} < 120 and ${reading.diastolic} < 80)`,
};

function buildWhere(userId: string, filters: Filters, tz: string, now: Date): SQL | undefined {
  const { start, end } = dateBounds(filters, tz, now);
  return and(
    eq(reading.userId, userId),
    start && gte(reading.measuredAt, start),
    end && lt(reading.measuredAt, end),
    filters.period.length > 0 ? inArray(reading.period, filters.period) : undefined,
    filters.category.length > 0 ? or(...filters.category.map((c) => CATEGORY_SQL[c])) : undefined,
    filters.sysMin !== undefined ? gte(reading.systolic, filters.sysMin) : undefined,
    filters.sysMax !== undefined ? lte(reading.systolic, filters.sysMax) : undefined,
    filters.diaMin !== undefined ? gte(reading.diastolic, filters.diaMin) : undefined,
    filters.diaMax !== undefined ? lte(reading.diastolic, filters.diaMax) : undefined,
  );
}

async function context() {
  const [user, tz] = await Promise.all([requireUser(), getTimeZone()]);
  return { user, tz, now: new Date() };
}

const round = (v: string | number | null) => (v === null ? null : Math.round(Number(v)));

/* ---------- Readings list ---------- */

export async function getReadings(filters: Filters) {
  const { user, tz, now } = await context();
  const rows = await db
    .select({
      id: reading.id,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      pulse: reading.pulse,
      period: reading.period,
      measuredAt: reading.measuredAt,
      notes: reading.notes,
    })
    .from(reading)
    .where(buildWhere(user.id, filters, tz, now))
    .orderBy(desc(reading.measuredAt))
    .limit(MAX_ROWS + 1);

  return { rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS, tz };
}

export async function getReading(id: string) {
  const { user, tz } = await context();
  const [row] = await db
    .select()
    .from(reading)
    .where(and(eq(reading.id, id), eq(reading.userId, user.id)))
    .limit(1);
  return row ? { row, tz } : null;
}

/* ---------- Aggregates for charts ---------- */


async function dailySeries(where: SQL | undefined, tz: string): Promise<DailyPoint[]> {
  const day = sql<string>`to_char(${reading.measuredAt} at time zone ${tz}, 'YYYY-MM-DD')`;
  const rows = await db
    .select({
      date: day,
      systolic: avg(reading.systolic),
      diastolic: avg(reading.diastolic),
      pulse: avg(reading.pulse),
      count: count(),
    })
    .from(reading)
    .where(where)
    // Ordinal reference: a parameterized expression repeated in GROUP BY gets a new $n and won't match.
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((r) => ({
    date: r.date,
    systolic: round(r.systolic)!,
    diastolic: round(r.diastolic)!,
    pulse: round(r.pulse),
    count: r.count,
  }));
}

async function periodAverages(where: SQL | undefined): Promise<PeriodAverage[]> {
  const rows = await db
    .select({
      period: reading.period,
      systolic: avg(reading.systolic),
      diastolic: avg(reading.diastolic),
      pulse: avg(reading.pulse),
      count: count(),
    })
    .from(reading)
    .where(where)
    .groupBy(reading.period);

  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  return PERIODS.map((period) => {
    const r = byPeriod.get(period);
    return {
      period,
      systolic: r ? round(r.systolic) : null,
      diastolic: r ? round(r.diastolic) : null,
      pulse: r ? round(r.pulse) : null,
      count: r?.count ?? 0,
    };
  });
}

export async function getTrends(filters: Filters) {
  const { user, tz, now } = await context();
  const where = buildWhere(user.id, filters, tz, now);
  const [daily, byPeriod] = await Promise.all([dailySeries(where, tz), periodAverages(where)]);
  return { daily, byPeriod };
}

/* ---------- Dashboard ---------- */

export async function getDashboard() {
  const { user, tz, now } = await context();
  const base = (range: Filters["range"]) =>
    buildWhere(user.id, { range, period: [], category: [] }, tz, now);

  const [latestRows, last7, last30, daily30] = await Promise.all([
    db
      .select({
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        pulse: reading.pulse,
        period: reading.period,
        measuredAt: reading.measuredAt,
      })
      .from(reading)
      .where(eq(reading.userId, user.id))
      .orderBy(desc(reading.measuredAt))
      .limit(1),
    periodAverages(base("7d")),
    periodAverages(base("30d")),
    dailySeries(base("30d"), tz),
  ]);

  return { latest: latestRows[0] ?? null, last7, last30, daily30, tz, name: user.name };
}

/* ---------- Saved searches ---------- */

export async function getSavedSearches() {
  const { user } = await context();
  return db
    .select({ id: savedSearch.id, name: savedSearch.name, query: savedSearch.query })
    .from(savedSearch)
    .where(eq(savedSearch.userId, user.id))
    .orderBy(savedSearch.name);
}
