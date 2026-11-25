import { ChevronDownIcon } from "lucide-react";
import { CATEGORY_INFO, type Category } from "@/lib/bp";
import { cn } from "@/lib/utils";

const ROWS: { category: Category; systolic: string; joiner: string; diastolic: string; note?: string }[] = [
  { category: "normal", systolic: "Less than 120", joiner: "and", diastolic: "Less than 80" },
  { category: "elevated", systolic: "120 – 129", joiner: "and", diastolic: "Less than 80" },
  { category: "stage1", systolic: "130 – 139", joiner: "or", diastolic: "80 – 89" },
  { category: "stage2", systolic: "140 or higher", joiner: "or", diastolic: "90 or higher" },
  {
    category: "crisis",
    systolic: "Higher than 180",
    joiner: "and/or",
    diastolic: "Higher than 120",
    note: "Seek medical care right away",
  },
];

const FULL_LABEL: Record<Category, string> = {
  normal: "Normal",
  elevated: "Elevated",
  stage1: "High blood pressure — Stage 1",
  stage2: "High blood pressure — Stage 2",
  crisis: "Hypertensive crisis",
};

const ACTIVE_ROW_STYLE: Record<Category, string> = {
  normal: "bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100",
  elevated: "bg-yellow-200 text-yellow-950 dark:bg-yellow-900 dark:text-yellow-100",
  stage1: "bg-orange-200 text-orange-950 dark:bg-orange-900 dark:text-orange-100",
  stage2: "bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-100",
  crisis: "bg-red-700 text-white dark:bg-red-600",
};

function LatestBadge({ category, reading }: { category: Category; reading?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap tabular-nums",
        category === "crisis"
          ? "bg-white text-red-700"
          : "bg-card text-current ring-1 ring-current/20",
      )}
    >
      Your latest{reading ? ` · ${reading}` : ""}
    </span>
  );
}

/** The AHA blood pressure categories table. `highlight` marks the row for the user's latest reading. */
export function BpCategoryChart({
  highlight,
  latestReading,
}: {
  highlight?: Category;
  latestReading?: string;
}) {
  return (
    <div>
      {/* Mobile stacked cards (< sm): no horizontal scrolling */}
      <div className="grid gap-2 sm:hidden">
        {ROWS.map((row) => {
          const active = row.category === highlight;
          const dimmed = Boolean(highlight && !active);
          return (
            <div
              key={row.category}
              aria-current={active ? "true" : undefined}
              className={cn(
                "grid gap-1 rounded-lg px-3 py-2.5 text-sm transition-opacity",
                active ? ACTIVE_ROW_STYLE[row.category] : CATEGORY_INFO[row.category].className,
                active && "shadow-xs",
                dimmed && "opacity-55 hover:opacity-100",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="font-semibold">{FULL_LABEL[row.category]}</span>
                {active ? <LatestBadge category={row.category} reading={latestReading} /> : null}
              </div>
              {row.note ? <div className="text-xs">{row.note}</div> : null}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums">
                <span>
                  <span className="opacity-75">Sys:</span> {row.systolic}
                </span>
                <span className="font-semibold uppercase opacity-80">{row.joiner}</span>
                <span>
                  <span className="opacity-75">Dia:</span> {row.diastolic}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet & desktop table (sm+) */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-sm">
          <caption className="sr-only">American Heart Association blood pressure categories</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="px-3 pb-1 font-medium">Category</th>
              <th scope="col" className="px-3 pb-1 font-medium">Systolic (top)</th>
              <th scope="col" className="w-14 pb-1" aria-label="and / or" />
              <th scope="col" className="px-3 pb-1 font-medium">Diastolic (bottom)</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const active = row.category === highlight;
              const dimmed = Boolean(highlight && !active);
              return (
                <tr
                  key={row.category}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "transition-opacity",
                    active ? ACTIVE_ROW_STYLE[row.category] : CATEGORY_INFO[row.category].className,
                    dimmed && "opacity-55 hover:opacity-100",
                  )}
                >
                  <th scope="row" className="rounded-l-lg px-3 py-2.5 text-left font-semibold">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{FULL_LABEL[row.category]}</span>
                      {active ? <LatestBadge category={row.category} reading={latestReading} /> : null}
                    </div>
                    {row.note ? <div className="text-xs font-normal">{row.note}</div> : null}
                  </th>
                  <td className={cn("px-3 py-2.5 tabular-nums", active && "font-medium")}>{row.systolic}</td>
                  <td className="py-2.5 text-center text-xs font-semibold uppercase">{row.joiner}</td>
                  <td className={cn("rounded-r-lg px-3 py-2.5 tabular-nums", active && "font-medium")}>
                    {row.diastolic}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground">
        Source: American Heart Association. When the two numbers fall in different categories, the higher category
        applies. This is a reference, not a diagnosis — talk to your doctor about your readings.
      </p>
    </div>
  );
}

/** Compact collapsible AHA reference card so it doesn't dominate vertical space. */
export function CollapsibleBpCategories({
  highlight,
  latestReading,
  description = "American Heart Association guideline",
  defaultOpen = false,
}: {
  highlight?: Category;
  latestReading?: string;
  description?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group rounded-xl border bg-card text-card-foreground shadow-xs"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 select-none sm:gap-4 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-sm font-semibold">Blood pressure categories</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {highlight ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                CATEGORY_INFO[highlight].className,
              )}
            >
              {CATEGORY_INFO[highlight].label}
            </span>
          ) : null}
          <ChevronDownIcon
            className="size-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
            aria-hidden
          />
        </div>
      </summary>
      <div className="border-t px-4 pt-3 pb-4 sm:px-5">
        <BpCategoryChart highlight={highlight} latestReading={latestReading} />
      </div>
    </details>
  );
}
