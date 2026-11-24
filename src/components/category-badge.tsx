import { CATEGORY_INFO, classify } from "@/lib/bp";
import { cn } from "@/lib/utils";

export function CategoryBadge({ systolic, diastolic }: { systolic: number; diastolic: number }) {
  const info = CATEGORY_INFO[classify(systolic, diastolic)];
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", info.className)}>
      {info.label}
    </span>
  );
}
