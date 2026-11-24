"use client";

import { format, parseISO, subDays } from "date-fns";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PERIOD_LABELS } from "@/lib/bp";
import type { DailyPoint, PeriodAverage } from "@/lib/chart-types";
import { cn } from "@/lib/utils";

const SYS = "var(--series-systolic)";
const DIA = "var(--series-diastolic)";
const AXIS_TICK = { fontSize: 12, fill: "var(--muted-foreground)" };
const GRID = "var(--chart-grid)";

// AHA thresholds: elevated/stage-1/stage-2 systolic, stage-1/stage-2 diastolic.
const THRESHOLDS = [
  { y: 140, label: "140" },
  { y: 130, label: "130" },
  { y: 120, label: "120" },
  { y: 90, label: "90" },
  { y: 80, label: "80" },
];

/** Only the tooltip fields we read; avoids Recharts' value/name generics. */
type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };
const tip = (p: TipProps): TipProps => ({ active: p.active, payload: p.payload });

const fmtDay = (d: string) => format(parseISO(d), "MMM d");
const fmtDayLong = (d: string) => format(parseISO(d), "EEE, MMM d, yyyy");

/* ---------- Shared pieces ---------- */

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function TooltipCard({ title, rows, footer }: { title: string; rows: { label: string; value: string; color?: string }[]; footer?: string }) {
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-foreground">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color ? <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} /> : null}
            {r.label}
          </span>
          <span className="font-medium text-foreground tabular-nums">{r.value}</span>
        </div>
      ))}
      {footer ? <div className="mt-1 text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

/** Direct label at the last point of a line, so identity is never color-only. */
function endLabel(text: string, lastIndex: number) {
  function EndLabel(props: { index?: number; x?: number | string; y?: number | string }) {
    if (props.index !== lastIndex) return null;
    return (
      <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fontSize={12} fill="var(--muted-foreground)">
        {text}
      </text>
    );
  }
  return EndLabel;
}

/* ---------- Blood pressure over time ---------- */

/** Average each day with the 6 calendar days before it. Input sorted ascending by date. */
function rollingWeekly(data: DailyPoint[]): DailyPoint[] {
  return data.map((point, i) => {
    const windowStart = format(subDays(parseISO(point.date), 6), "yyyy-MM-dd");
    let sys = 0, dia = 0, pulse = 0, pulseN = 0, n = 0;
    for (let j = i; j >= 0 && data[j].date >= windowStart; j--) {
      const d = data[j];
      sys += d.systolic * d.count;
      dia += d.diastolic * d.count;
      n += d.count;
      if (d.pulse !== null) {
        pulse += d.pulse * d.count;
        pulseN += d.count;
      }
    }
    return {
      date: point.date,
      systolic: Math.round(sys / n),
      diastolic: Math.round(dia / n),
      pulse: pulseN ? Math.round(pulse / pulseN) : null,
      count: n,
    };
  });
}

function BpTooltip({ active, payload, smoothed }: TipProps & { smoothed: boolean }) {
  const p = payload?.[0]?.payload as DailyPoint | undefined;
  if (!active || !p) return null;
  return (
    <TooltipCard
      title={fmtDayLong(p.date)}
      rows={[
        { label: "Systolic", value: `${p.systolic} mmHg`, color: SYS },
        { label: "Diastolic", value: `${p.diastolic} mmHg`, color: DIA },
      ]}
      footer={smoothed ? `7-day average of ${p.count} readings` : `Average of ${p.count} reading${p.count === 1 ? "" : "s"}`}
    />
  );
}

export function BloodPressureChart({ data, height = 320, compact = false }: { data: DailyPoint[]; height?: number; compact?: boolean }) {
  const [smoothed, setSmoothed] = useState(false);
  const series = useMemo(() => (smoothed ? rollingWeekly(data) : data), [data, smoothed]);
  const last = series.length - 1;
  const showDots = series.length <= 45;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend items={[{ label: "Systolic", color: SYS }, { label: "Diastolic", color: DIA }]} />
        {compact ? null : (
          <div className="inline-flex rounded-lg border p-0.5 text-xs" role="radiogroup" aria-label="Smoothing">
            {([["Daily", false], ["7-day average", true]] as const).map(([label, value]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={smoothed === value}
                onClick={() => setSmoothed(value)}
                className={cn(
                  "rounded-md px-2 py-1 transition-colors",
                  smoothed === value ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={series} margin={{ top: 8, right: 64, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[50, (max: number) => Math.max(160, Math.ceil(max / 10) * 10)]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          {compact
            ? null
            : THRESHOLDS.map((t) => (
                <ReferenceLine
                  key={t.y}
                  y={t.y}
                  stroke="var(--chart-threshold)"
                  strokeDasharray="3 4"
                  label={{ value: t.label, position: "left", fontSize: 10, fill: "var(--muted-foreground)" }}
                />
              ))}
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={(props) => <BpTooltip {...tip(props)} smoothed={smoothed} />}
          />
          <Line
            type="monotone"
            dataKey="systolic"
            stroke={SYS}
            strokeWidth={2}
            dot={showDots ? { r: 3, strokeWidth: 2, fill: "var(--card)" } : false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            label={endLabel("Systolic", last)}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            stroke={DIA}
            strokeWidth={2}
            dot={showDots ? { r: 3, strokeWidth: 2, fill: "var(--card)" } : false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            label={endLabel("Diastolic", last)}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {compact ? null : (
        <p className="text-xs text-muted-foreground">Dashed lines mark AHA thresholds: 120 / 130 / 140 systolic, 80 / 90 diastolic.</p>
      )}
    </div>
  );
}

/* ---------- Morning vs noon vs night ---------- */

type PeriodRow = PeriodAverage & { label: string };

function PeriodTooltip({ active, payload }: TipProps) {
  const p = payload?.[0]?.payload as PeriodRow | undefined;
  if (!active || !p) return null;
  return (
    <TooltipCard
      title={p.label}
      rows={[
        { label: "Systolic", value: p.systolic === null ? "—" : `${p.systolic} mmHg`, color: SYS },
        { label: "Diastolic", value: p.diastolic === null ? "—" : `${p.diastolic} mmHg`, color: DIA },
        { label: "Pulse", value: p.pulse === null ? "—" : `${p.pulse} bpm` },
      ]}
      footer={`${p.count} reading${p.count === 1 ? "" : "s"}`}
    />
  );
}

export function PeriodChart({ data }: { data: PeriodAverage[] }) {
  const rows: PeriodRow[] = data.map((d) => ({ ...d, label: PERIOD_LABELS[d.period] }));
  return (
    <div className="grid gap-3">
      <Legend items={[{ label: "Systolic", color: SYS }, { label: "Diastolic", color: DIA }]} />
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} barGap={2} barCategoryGap="30%" margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis domain={[0, (max: number) => Math.max(160, Math.ceil(max / 20) * 20)]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(props) => <PeriodTooltip {...tip(props)} />} />
          <Bar dataKey="systolic" fill={SYS} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
          <Bar dataKey="diastolic" fill={DIA} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Pulse ---------- */

function PulseTooltip({ active, payload }: TipProps) {
  const p = payload?.[0]?.payload as DailyPoint | undefined;
  if (!active || !p || p.pulse === null) return null;
  return <TooltipCard title={fmtDayLong(p.date)} rows={[{ label: "Pulse", value: `${p.pulse} bpm` }]} />;
}

export function PulseChart({ data }: { data: DailyPoint[] }) {
  const points = data.filter((d) => d.pulse !== null);
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No pulse readings in this range.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={["dataMin - 10", "dataMax + 10"]} allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} content={(props) => <PulseTooltip {...tip(props)} />} />
        <Line
          type="monotone"
          dataKey="pulse"
          stroke={SYS}
          strokeWidth={2}
          dot={points.length <= 45 ? { r: 3, strokeWidth: 2, fill: "var(--card)" } : false}
          activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
