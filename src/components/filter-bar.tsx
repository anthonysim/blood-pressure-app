"use client";

import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, CATEGORY_INFO, PERIOD_LABELS, PERIODS } from "@/lib/bp";
import { parseFilters, RANGE_LABELS, RANGES, serializeFilters, type Filters, type Range } from "@/lib/filters";
import { cn } from "@/lib/utils";

type Props = { basePath: "/readings" | "/trends"; filters: Filters };

/** Form-shaped filter state: number bounds stay as raw strings while the user types. */
type Draft = {
  range: Range;
  from: string;
  to: string;
  period: string[];
  category: string[];
  sysMin: string;
  sysMax: string;
  diaMin: string;
  diaMax: string;
};

type BoundKey = "sysMin" | "sysMax" | "diaMin" | "diaMax";

const TYPING_DELAY_MS = 500;

function toDraft(f: Filters): Draft {
  const str = (n?: number) => (n === undefined ? "" : String(n));
  return {
    range: f.range,
    from: f.from ?? "",
    to: f.to ?? "",
    period: [...f.period],
    category: [...f.category],
    sysMin: str(f.sysMin),
    sysMax: str(f.sysMax),
    diaMin: str(f.diaMin),
    diaMax: str(f.diaMax),
  };
}

function toQuery(d: Draft): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(d)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v !== "") sp.append(key, v);
  }
  return serializeFilters(parseFilters(sp));
}

/** Filters apply as soon as they change; number boxes wait until typing pauses. State lives in the URL. */
export function FilterBar({ basePath, filters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const serverQuery = serializeFilters(filters);
  const [draft, setDraft] = useState(() => toDraft(filters));
  const [syncedQuery, setSyncedQuery] = useState(serverQuery);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // URL changed from outside the bar (saved search, Reset, back button): adopt it.
  if (serverQuery !== syncedQuery) {
    setSyncedQuery(serverQuery);
    setDraft(toDraft(filters));
  }

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  function navigate(next: Draft) {
    clearTimeout(typingTimer.current);
    const query = toQuery(next);
    if (query === serverQuery) return;
    startTransition(() => {
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    });
  }

  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    navigate(next);
  }

  function updateBound(key: BoundKey, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => navigate(next), TYPING_DELAY_MS);
  }

  function toggle(key: "period" | "category", value: string) {
    const list = draft[key];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4" role="search" aria-label="Filter readings">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="range">Date range</Label>
          <select
            id="range"
            value={draft.range}
            onChange={(e) => update({ range: e.target.value as Range })}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        {draft.range === "custom" ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => update({ from: e.target.value })} className="w-fit" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => update({ to: e.target.value })} className="w-fit" />
            </div>
          </>
        ) : null}
        <BoundInputs label="Systolic" minKey="sysMin" maxKey="sysMax" draft={draft} onChange={updateBound} onCommit={() => navigate(draft)} />
        <BoundInputs label="Diastolic" minKey="diaMin" maxKey="diaMax" draft={draft} onChange={updateBound} onCommit={() => navigate(draft)} />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <ChipGroup
          legend="Time of day"
          options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
          selected={draft.period}
          onToggle={(v) => toggle("period", v)}
        />
        <ChipGroup
          legend="Category"
          options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_INFO[c].label }))}
          selected={draft.category}
          onToggle={(v) => toggle("category", v)}
        />
        <div className="ml-auto flex items-center gap-2">
          <span aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isPending ? (
              <>
                <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
                Updating…
              </>
            ) : null}
          </span>
          <Link href={basePath} replace scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Reset
          </Link>
        </div>
      </div>
    </div>
  );
}

function BoundInputs(props: {
  label: string;
  minKey: BoundKey;
  maxKey: BoundKey;
  draft: Draft;
  onChange: (key: BoundKey, value: string) => void;
  onCommit: () => void;
}) {
  const field = (key: BoundKey, placeholder: string) => (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={400}
      placeholder={placeholder}
      value={props.draft[key]}
      onChange={(e) => props.onChange(key, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") props.onCommit();
      }}
      aria-label={`${props.label} ${placeholder}imum`}
      className="w-20"
    />
  );
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{props.label}</legend>
      <div className="flex items-center gap-1.5">
        {field(props.minKey, "min")}
        <span className="text-muted-foreground">–</span>
        {field(props.maxKey, "max")}
      </div>
    </fieldset>
  );
}

function ChipGroup(props: {
  legend: string;
  options: { value: string; label: string }[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">{props.legend}</legend>
      <span aria-hidden className="mr-1 text-sm font-medium">
        {props.legend}
      </span>
      {props.options.map((o) => {
        const checked = props.selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => props.onToggle(o.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors select-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              checked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}
