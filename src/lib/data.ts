import "server-only";
import { TZDate } from "@date-fns/tz";
import { startOfDay } from "date-fns";
import { and, avg, count, desc, eq, gte, ilike, inArray, lt, lte, max, min, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { reading, savedSearch } from "@/db/schema";
import { requireUser } from "./auth";
import { PERIODS, type Category, type Period } from "./bp";
import type { DailyPoint, PeriodAverage } from "./chart-types";
import { dateBounds, getTimeZone } from "./dates";
import type { Filters } from "./filters";

export const PAGE_SIZE = 50;
const EXPORT_MAX_ROWS = 5000;

const CATEGORY_SQL: Record<Category, SQL> = {
  crisis: sql`(${reading.systolic} > 180 or ${reading.diastolic} > 120)`,
  stage2: sql`((${reading.systolic} >= 140 or ${reading.diastolic} >= 90) and ${reading.systolic} <= 180 and ${reading.diastolic} <= 120)`,
  stage1: sql`((${reading.systolic} >= 130 or ${reading.diastolic} >= 80) and ${reading.systolic} < 140 and ${reading.diastolic} < 90)`,
  elevated: sql`(${reading.systolic} between 120 and 129 and ${reading.diastolic} < 80)`,
  normal: sql`(${reading.systolic} < 120 and ${reading.diastolic} < 80)`,
};

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

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
    filters.q ? ilike(reading.notes, `%${escapeLike(filters.q)}%`) : undefined,
  );
}

async function context() {
  const [user, tz] = await Promise.all([requireUser(), getTimeZone()]);
  return { user, tz, now: new Date() };
}

const round = (v: string | number | null) => (v === null ? null : Math.round(Number(v)));

/* ---------- Readings list ---------- */

export async function getReadings(filters: Filters, page = 1) {
  const { user, tz, now } = await context();
  const where = buildWhere(user.id, filters, tz, now);
  const safePage = Math.max(1, Math.floor(page));

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(reading).where(where),
    db
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
      .where(where)
      .orderBy(desc(reading.measuredAt))
      .limit(PAGE_SIZE)
      .offset((safePage - 1) * PAGE_SIZE),
  ]);

  const totalCount = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return { rows, totalCount, page: Math.min(safePage, totalPages), totalPages, tz };
}

export async function getReadingsForExport(filters: Filters) {
  const { user, tz, now } = await context();
  const where = buildWhere(user.id, filters, tz, now);
  const rows = await db
    .select({
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      pulse: reading.pulse,
      period: reading.period,
      measuredAt: reading.measuredAt,
      notes: reading.notes,
    })
    .from(reading)
    .where(where)
    .orderBy(desc(reading.measuredAt))
    .limit(EXPORT_MAX_ROWS);

  return { rows, tz };
}

/** Readings plus what the doctor report needs to describe them. */
export async function getReportData(filters: Filters) {
  const { user, tz, now } = await context();
  const where = buildWhere(user.id, filters, tz, now);
  const rows = await db
    .select({
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      pulse: reading.pulse,
      period: reading.period,
      measuredAt: reading.measuredAt,
      notes: reading.notes,
    })
    .from(reading)
    .where(where)
    .orderBy(desc(reading.measuredAt))
    .limit(EXPORT_MAX_ROWS);

  return { rows, tz, now, bounds: dateBounds(filters, tz, now), patientName: user.name };
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
      sysMin: min(reading.systolic),
      sysMax: max(reading.systolic),
      diaMin: min(reading.diastolic),
      diaMax: max(reading.diastolic),
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
    sysMin: Number(r.sysMin),
    sysMax: Number(r.sysMax),
    diaMin: Number(r.diaMin),
    diaMax: Number(r.diaMax),
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

export type TodayReading = {
  period: Period;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: Date;
};

export async function getDashboard() {
  const { user, tz, now } = await context();
  const base = (range: Filters["range"]) =>
    buildWhere(user.id, { range, period: [], category: [] }, tz, now);
  const todayStart = startOfDay(new TZDate(now, tz));

  const [latestRows, todayRows, last7, last30, daily30] = await Promise.all([
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
    db
      .select({
        period: reading.period,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        pulse: reading.pulse,
        measuredAt: reading.measuredAt,
      })
      .from(reading)
      .where(and(eq(reading.userId, user.id), gte(reading.measuredAt, todayStart)))
      .orderBy(desc(reading.measuredAt)),
    periodAverages(base("7d")),
    periodAverages(base("30d")),
    dailySeries(base("30d"), tz),
  ]);

  const todayByPeriod: Partial<Record<Period, TodayReading>> = {};
  for (const r of todayRows) {
    if (!todayByPeriod[r.period]) todayByPeriod[r.period] = r;
  }

  return { latest: latestRows[0] ?? null, todayByPeriod, last7, last30, daily30, tz, name: user.name };
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
