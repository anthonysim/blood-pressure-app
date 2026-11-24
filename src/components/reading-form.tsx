"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ReadingFormState } from "@/app/actions/readings";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PERIOD_LABELS, PERIODS, periodForHour, type Period } from "@/lib/bp";
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
};

const hourOf = (localDateTime: string) => Number(localDateTime.slice(11, 13));

export function ReadingForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [measuredAt, setMeasuredAt] = useState(initial.measuredAt);
  // null = follow the time of day; set once the user picks a period explicitly.
  const [chosenPeriod, setChosenPeriod] = useState<Period | null>(initial.period ?? null);
  const period = chosenPeriod ?? periodForHour(hourOf(measuredAt));
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberField name="systolic" label="Systolic" unit="mmHg" defaultValue={initial.systolic} errors={errors.systolic} required autoFocus />
        <NumberField name="diastolic" label="Diastolic" unit="mmHg" defaultValue={initial.diastolic} errors={errors.diastolic} required />
        <NumberField name="pulse" label="Pulse" unit="bpm" defaultValue={initial.pulse ?? undefined} errors={errors.pulse} />
      </div>

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

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initial.notes ?? ""} maxLength={500} placeholder="Optional — e.g. after coffee, left arm" />
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
        <Link href="/readings" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
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
