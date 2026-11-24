"use client";

import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, CATEGORY_INFO, PERIOD_LABELS, PERIODS } from "@/lib/bp";
import { RANGE_LABELS, RANGES, type Filters, type Range } from "@/lib/filters";
import { cn } from "@/lib/utils";

type Props = { basePath: "/readings" | "/trends"; filters: Filters };

/** GET form: submitting navigates to `basePath?...`, so filters live in the URL. */
export function FilterBar({ basePath, filters }: Props) {
  const [range, setRange] = useState<Range>(filters.range);

  return (
    <Form action={basePath} className="grid gap-4 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="range">Date range</Label>
          <select
            id="range"
            name="range"
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        {range === "custom" ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={filters.from} className="w-fit" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={filters.to} className="w-fit" />
            </div>
          </>
        ) : null}
        <RangeInputs label="Systolic" minName="sysMin" maxName="sysMax" min={filters.sysMin} max={filters.sysMax} />
        <RangeInputs label="Diastolic" minName="diaMin" maxName="diaMax" min={filters.diaMin} max={filters.diaMax} />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <CheckboxGroup
          legend="Time of day"
          name="period"
          options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
          selected={filters.period}
        />
        <CheckboxGroup
          legend="Category"
          name="category"
          options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_INFO[c].label }))}
          selected={filters.category}
        />
        <div className="ml-auto flex gap-2">
          <Link href={basePath} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Reset
          </Link>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </div>
      </div>
    </Form>
  );
}

function RangeInputs(props: { label: string; minName: string; maxName: string; min?: number; max?: number }) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{props.label}</legend>
      <div className="flex items-center gap-1.5">
        <Input name={props.minName} type="number" min={0} max={400} placeholder="min" defaultValue={props.min} aria-label={`${props.label} minimum`} className="w-20" />
        <span className="text-muted-foreground">–</span>
        <Input name={props.maxName} type="number" min={0} max={400} placeholder="max" defaultValue={props.max} aria-label={`${props.label} maximum`} className="w-20" />
      </div>
    </fieldset>
  );
}

function CheckboxGroup(props: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: readonly string[];
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">{props.legend}</legend>
      <span aria-hidden className="mr-1 text-sm font-medium">
        {props.legend}
      </span>
      {props.options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors select-none",
            "has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground",
            "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          )}
        >
          <input
            type="checkbox"
            name={props.name}
            value={o.value}
            defaultChecked={props.selected.includes(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
