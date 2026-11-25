"use client";

import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { ReadingFormState } from "@/app/actions/readings";
import { CategoryBadge } from "@/components/category-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { classify, PERIOD_LABELS, PERIODS, periodForHour, type Period } from "@/lib/bp";
import { cn } from "@/lib/utils";

export type ReadingFormValues = {
  systolic?: number;
  diastolic?: number;
  pulse?: number | null;
  period?: Period;
  /** datetime-local value in the user's zone, e.g. "2026-11-24T08:30" */
  measuredAt: string;
  notes?: string | null;
};

type Props = {
  action: (state: ReadingFormState, formData: FormData) => Promise<ReadingFormState>;
  initial: ReadingFormValues;
  submitLabel: string;
  noRedirect?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const QUICK_TAGS = ["Left arm", "Right arm", "Resting 5m", "After coffee", "Post-exercise", "Medication"] as const;

const hourOf = (localDateTime: string) => Number(localDateTime.slice(11, 13));

function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

export function ReadingForm({ action, initial, submitLabel, noRedirect = false, onSuccess, onCancel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [systolic, setSystolic] = useState(initial.systolic !== undefined ? String(initial.systolic) : "");
  const [diastolic, setDiastolic] = useState(initial.diastolic !== undefined ? String(initial.diastolic) : "");
  const [pulse, setPulse] = useState(initial.pulse !== undefined && initial.pulse !== null ? String(initial.pulse) : "");
  const [measuredAt, setMeasuredAt] = useState(initial.measuredAt);
  const [notes, setNotes] = useState(initial.notes ?? "");
  // null = follow the time of day; set once the user picks a period explicitly.
  const [chosenPeriod, setChosenPeriod] = useState<Period | null>(initial.period ?? null);
  const period = chosenPeriod ?? periodForHour(hourOf(measuredAt));
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && onSuccess) onSuccess();
  }, [state.ok, onSuccess]);

  const sysNum = parsePositiveInt(systolic);
  const diaNum = parsePositiveInt(diastolic);
  const canPreview =
    sysNum !== null &&
    diaNum !== null &&
    sysNum >= 50 &&
    sysNum <= 300 &&
    diaNum >= 30 &&
    diaNum <= 200 &&
    sysNum > diaNum;
  const previewCategory = canPreview ? classify(sysNum, diaNum) : null;

  function appendTag(tag: string) {
    const trimmed = notes.trim();
    if (trimmed.toLowerCase().includes(tag.toLowerCase())) return;
    const next = trimmed ? `${trimmed}, ${tag}` : tag;
    if (next.length <= 500) setNotes(next);
  }

  return (
    <form action={formAction} className="grid gap-5">
      {noRedirect ? <input type="hidden" name="noRedirect" value="1" /> : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberField
          name="systolic"
          label="Systolic"
          unit="mmHg"
          value={systolic}
          onChange={(e) => setSystolic(e.target.value)}
          errors={errors.systolic}
          required
          autoFocus
        />
        <NumberField
          name="diastolic"
          label="Diastolic"
          unit="mmHg"
          value={diastolic}
          onChange={(e) => setDiastolic(e.target.value)}
          errors={errors.diastolic}
          required
        />
        <NumberField
          name="pulse"
          label="Pulse"
          unit="bpm"
          value={pulse}
          onChange={(e) => setPulse(e.target.value)}
          errors={errors.pulse}
        />
      </div>

      {canPreview ? (
        <div
          aria-live="polite"
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            previewCategory === "crisis"
              ? "border-destructive/40 bg-destructive/10 text-foreground"
              : "bg-muted/50 text-muted-foreground",
          )}
        >
          <span className="font-medium text-foreground">AHA category:</span>
          <CategoryBadge systolic={sysNum} diastolic={diaNum} />
          {previewCategory === "crisis" ? (
            <span className="flex items-center gap-1 font-medium text-destructive">
              <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
              Hypertensive crisis range — wait 5 minutes, retest, and seek medical care right away if it remains high.
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="measuredAt">Date &amp; time</Label>
          <Input
            id="measuredAt"
            name="measuredAt"
            type="datetime-local"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            required
            aria-invalid={errors.measuredAt ? true : undefined}
            className="w-fit"
          />
          <FieldError errors={errors.measuredAt} />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Time of day</legend>
          <input type="hidden" name="period" value={period} />
          <div className="inline-flex w-fit rounded-lg border p-0.5" role="radiogroup">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setChosenPeriod(p)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <FieldError errors={errors.period} />
        </fieldset>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Optional — e.g. after coffee, left arm"
        />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TAGS.map((tag) => {
            const added = notes.toLowerCase().includes(tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                onClick={() => appendTag(tag)}
                disabled={added}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  added
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                + {tag}
              </button>
            );
          })}
        </div>
        <FieldError errors={errors.notes} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : (
          <Link href="/readings" className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}

function NumberField({
  name,
  label,
  unit,
  errors,
  ...props
}: {
  name: string;
  label: string;
  unit: string;
  errors?: string[];
} & React.ComponentProps<"input">) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label} <span className="font-normal text-muted-foreground">({unit})</span>
      </Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={400}
        aria-invalid={errors ? true : undefined}
        {...props}
      />
      <FieldError errors={errors} />
    </div>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null;
}
