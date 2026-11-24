export const PERIODS = ["morning", "noon", "night"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  morning: "Morning",
  noon: "Noon",
  night: "Night",
};

export const CATEGORIES = ["normal", "elevated", "stage1", "stage2", "crisis"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<Category, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  elevated: { label: "Elevated", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300" },
  stage1: { label: "Stage 1", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  stage2: { label: "Stage 2", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  crisis: { label: "Crisis", className: "bg-red-700 text-white dark:bg-red-600" },
};

/** AHA blood pressure categories. The higher-risk of the two numbers decides. */
export function classify(systolic: number, diastolic: number): Category {
  if (systolic > 180 || diastolic > 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

/** Suggest a period from a local hour (0–23): before 11 → morning, before 17 → noon, else night. */
export function periodForHour(hour: number): Period {
  if (hour < 11) return "morning";
  if (hour < 17) return "noon";
  return "night";
}
