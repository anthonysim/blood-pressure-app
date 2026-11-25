"use client";

import { LoaderCircleIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, CATEGORY_INFO, PERIOD_LABELS, PERIODS } from "@/lib/bp";
import { hasActiveFilters, parseFilters, RANGES, serializeFilters, type Filters, type Range } from "@/lib/filters";
import { cn } from "@/lib/utils";

type Props = { basePath: "/readings" | "/trends"; filters: Filters };

/** Form-shaped filter state: number bounds and query stay as raw strings while the user types. */
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
  q: string;
};

type TextKey = "sysMin" | "sysMax" | "diaMin" | "diaMax" | "q";

const TYPING_DELAY_MS = 450;

const SHORT_RANGE_LABELS: Record<Range, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  month: "Month",
  all: "All",
  custom: "Custom",
};

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
    q: f.q ?? "",
  };
}

function toQuery(d: Draft): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(d)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v !== "") sp.append(key, v);
  }
  return serializeFilters(parseFilters(sp));
}

function countAdvanced(d: Draft): number {
  let n = d.period.length + d.category.length;
  if (d.sysMin || d.sysMax) n += 1;
  if (d.diaMin || d.diaMax) n += 1;
  return n;
}

/** Filters apply as soon as they change; text/number boxes wait until typing pauses. State lives in the URL. */
export function FilterBar({ basePath, filters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const serverQuery = serializeFilters(filters);
  const [draft, setDraft] = useState(() => toDraft(filters));
  const [syncedQuery, setSyncedQuery] = useState(serverQuery);
  const [showMore, setShowMore] = useState(() => countAdvanced(toDraft(filters)) > 0);
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

  function updateText(key: TextKey, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => navigate(next), TYPING_DELAY_MS);
  }

  function toggle(key: "period" | "category", value: string) {
    const list = draft[key];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  }

  const advancedCount = countAdvanced(draft);
  const active = hasActiveFilters(filters);

  return (
    <div className="no-print grid gap-3 rounded-xl border bg-card p-3 sm:p-4" role="search" aria-label="Filter readings">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex flex-wrap rounded-lg border bg-background/60 p-0.5"
          role="radiogroup"
          aria-label="Date range"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={draft.range === r}
              onClick={() => update({ range: r })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                draft.range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {SHORT_RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        <div className="relative min-w-44 flex-1 sm:max-w-60">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={draft.q}
            onChange={(e) => updateText("q", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(draft);
            }}
            placeholder="Search notes…"
            aria-label="Search notes"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Button
          type="button"
          variant={showMore || advancedCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
        >
          <SlidersHorizontalIcon aria-hidden />
          Filters
          {advancedCount > 0 ? (
            <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {advancedCount}
            </span>
          ) : null}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isPending ? (
              <>
                <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
                Updating…
              </>
            ) : null}
          </span>
          {active ? (
            <Link href={basePath} replace scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <XIcon aria-hidden />
              Reset
            </Link>
          ) : null}
        </div>
      </div>

      {draft.range === "custom" ? (
        <div className="flex flex-wrap items-end gap-3 border-t pt-3">
          <div className="grid gap-1">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => update({ from: e.target.value })}
              className="w-fit"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => update({ to: e.target.value })}
              className="w-fit"
            />
          </div>
        </div>
      ) : null}

      {showMore ? (
        <div className="grid gap-3 border-t pt-3">
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
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <BoundInputs
              label="Systolic"
              minKey="sysMin"
              maxKey="sysMax"
              draft={draft}
              onChange={updateText}
              onCommit={() => navigate(draft)}
            />
            <BoundInputs
              label="Diastolic"
              minKey="diaMin"
              maxKey="diaMax"
              draft={draft}
              onChange={updateText}
              onCommit={() => navigate(draft)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BoundInputs(props: {
  label: string;
  minKey: "sysMin" | "sysMax" | "diaMin" | "diaMax";
  maxKey: "sysMin" | "sysMax" | "diaMin" | "diaMax";
  draft: Draft;
  onChange: (key: TextKey, value: string) => void;
  onCommit: () => void;
}) {
  const field = (key: "sysMin" | "sysMax" | "diaMin" | "diaMax", placeholder: string) => (
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
      className="h-8 w-20 text-xs"
    />
  );
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 text-xs font-medium text-muted-foreground">{props.label} (mmHg)</legend>
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
      <span aria-hidden className="mr-1 text-xs font-medium text-muted-foreground">
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
