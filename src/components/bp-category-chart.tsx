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

/** The AHA blood pressure categories table. `highlight` marks the row for the user's latest reading. */
export function BpCategoryChart({ highlight }: { highlight?: Category }) {
  return (
    <div className="overflow-x-auto">
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
            return (
              <tr
                key={row.category}
                aria-current={active ? "true" : undefined}
                className={cn(CATEGORY_INFO[row.category].className, active && "outline-2 outline-offset-1 outline-foreground")}
              >
                <th scope="row" className="rounded-l-lg px-3 py-2.5 text-left font-semibold">
                  {FULL_LABEL[row.category]}
                  {row.note ? <div className="text-xs font-normal">{row.note}</div> : null}
                  {active ? (
                    <div className="mt-0.5 text-xs font-medium">← Your latest reading</div>
                  ) : null}
                </th>
                <td className="px-3 py-2.5 tabular-nums">{row.systolic}</td>
                <td className="py-2.5 text-center text-xs font-semibold uppercase">{row.joiner}</td>
                <td className="rounded-r-lg px-3 py-2.5 tabular-nums">{row.diastolic}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        Source: American Heart Association. When the two numbers fall in different categories, the higher category
        applies. This is a reference, not a diagnosis — talk to your doctor about your readings.
      </p>
    </div>
  );
}

/** Compact collapsible AHA reference card so it doesn't dominate vertical space. */
export function CollapsibleBpCategories({
  highlight,
  description = "American Heart Association guideline",
  defaultOpen = false,
}: {
  highlight?: Category;
  description?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group rounded-xl border bg-card text-card-foreground shadow-xs"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 select-none [&::-webkit-details-marker]:hidden">
        <div className="grid gap-0.5">
          <span className="text-sm font-semibold">Blood pressure categories</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        <div className="flex items-center gap-2">
          {highlight ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
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
      <div className="border-t px-5 pt-3 pb-4">
        <BpCategoryChart highlight={highlight} />
      </div>
    </details>
  );
}
