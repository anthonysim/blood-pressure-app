import type { Period } from "./bp";

export type DailyPoint = { date: string; systolic: number; diastolic: number; pulse: number | null; count: number };

export type PeriodAverage = {
  period: Period;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  count: number;
};
