import { z } from "zod";
import { CATEGORIES, PERIODS } from "./bp";

export const RANGES = ["7d", "30d", "90d", "month", "all", "custom"] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABELS: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  month: "This month",
  all: "All time",
  custom: "Custom",
};

const DEFAULT_RANGE: Range = "30d";
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bound = z.coerce.number().int().min(0).max(400);

const filtersSchema = z.object({
  range: z.enum(RANGES).catch(DEFAULT_RANGE),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  period: z.array(z.enum(PERIODS)).catch([]),
  category: z.array(z.enum(CATEGORIES)).catch([]),
  sysMin: bound.optional().catch(undefined),
  sysMax: bound.optional().catch(undefined),
  diaMin: bound.optional().catch(undefined),
  diaMax: bound.optional().catch(undefined),
});

export type Filters = z.infer<typeof filtersSchema>;

type RawParams = Record<string, string | string[] | undefined>;

const ARRAY_KEYS = new Set(["period", "category"]);

/** Parse URL search params into validated filters. Invalid values fall back to defaults. */
export function parseFilters(params: RawParams | URLSearchParams): Filters {
  const raw: Record<string, unknown> = {};
  const entries =
    params instanceof URLSearchParams
      ? Array.from(params.keys(), (key) => [key, params.getAll(key)] as const)
      : Object.entries(params);

  for (const [key, value] of entries) {
    const list = (Array.isArray(value) ? value : [value]).filter(
      (v): v is string => typeof v === "string" && v !== "",
    );
    if (list.length === 0) continue;
    raw[key] = ARRAY_KEYS.has(key) ? list.flatMap((v) => v.split(",")) : list[0];
  }
  return filtersSchema.parse(raw);
}

/** Canonical query string for filters (stable order, defaults omitted). */
export function serializeFilters(filters: Filters): string {
  const sp = new URLSearchParams();
  if (filters.range !== DEFAULT_RANGE) sp.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
  }
  for (const p of filters.period) sp.append("period", p);
  for (const c of filters.category) sp.append("category", c);
  for (const key of ["sysMin", "sysMax", "diaMin", "diaMax"] as const) {
    const v = filters[key];
    if (v !== undefined) sp.set(key, String(v));
  }
  return sp.toString();
}

export function hasActiveFilters(filters: Filters): boolean {
  return serializeFilters(filters) !== "";
}
