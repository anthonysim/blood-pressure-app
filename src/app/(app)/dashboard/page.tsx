import { CheckCircle2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BpCategoryChart, CollapsibleBpCategories } from "@/components/bp-category-chart";
import { CategoryBadge } from "@/components/category-badge";
import { BloodPressureChart } from "@/components/charts/lazy";
import { QuickAddReadingDialog } from "@/components/quick-add-reading-dialog";
import { PageTransition, Reveal } from "@/components/transitions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classify, PERIOD_LABELS, PERIODS, type Period } from "@/lib/bp";
import type { PeriodAverage } from "@/lib/chart-types";
import { getDashboard, type TodayReading } from "@/lib/data";
import { formatInZone } from "@/lib/dates";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageTransition>
      <Suspense fallback={<DashboardSkeleton />}>
        <Reveal>
          <Dashboard />
        </Reveal>
      </Suspense>
    </PageTransition>
  );
}

function overallAverage(data: PeriodAverage[]): { systolic: number; diastolic: number; count: number } | null {
  let sys = 0;
  let dia = 0;
  let n = 0;
  for (const d of data) {
    if (d.systolic !== null && d.diastolic !== null && d.count > 0) {
      sys += d.systolic * d.count;
      dia += d.diastolic * d.count;
      n += d.count;
    }
  }
  if (n === 0) return null;
  return { systolic: Math.round(sys / n), diastolic: Math.round(dia / n), count: n };
}

async function Dashboard() {
  const { latest, todayByPeriod, last7, last30, daily30, tz, name } = await getDashboard();
  const firstName = name.split(" ")[0];

  if (!latest) {
    return (
      <div className="grid place-items-center gap-4 rounded-xl border border-dashed bg-card p-12 text-center">
        <h1 className="text-2xl font-semibold">Welcome, {firstName}</h1>
        <p className="max-w-md text-muted-foreground">
          Log your blood pressure in the morning, at noon and at night to start seeing trends.
        </p>
        <QuickAddReadingDialog triggerLabel="Add your first reading" size="default" />
        <div className="mt-4 w-full max-w-2xl text-left">
          <BpCategoryChart />
        </div>
      </div>
    );
  }

  const overall7 = overallAverage(last7);
  const overall30 = overallAverage(last30);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Hi, {firstName}</h1>

      <TodayCheckIns todayByPeriod={todayByPeriod} tz={tz} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Latest reading</CardDescription>
            <CardTitle className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums">
                {latest.systolic}/{latest.diastolic}
              </span>
              <span className="text-sm font-normal text-muted-foreground">mmHg</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <CategoryBadge systolic={latest.systolic} diastolic={latest.diastolic} />
            <span>
              {PERIOD_LABELS[latest.period]} · {formatInZone(latest.measuredAt, "MMM d, h:mm a", tz)}
              {latest.pulse ? ` · ${latest.pulse} bpm` : ""}
            </span>
          </CardContent>
        </Card>
        <AveragesCard title="Last 7 days" data={last7} overall={overall7} compareTo={overall30} />
        <AveragesCard title="Last 30 days" data={last30} overall={overall30} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="grid gap-1">
            <CardTitle>Last 30 days</CardTitle>
            <CardDescription>Daily average &amp; range, mmHg</CardDescription>
          </div>
          <Link href="/trends" className={buttonVariants({ variant: "outline", size: "sm" })}>
            All trends
          </Link>
        </CardHeader>
        <CardContent>
          <BloodPressureChart data={daily30} height={240} compact />
        </CardContent>
      </Card>

      <CollapsibleBpCategories
        highlight={classify(latest.systolic, latest.diastolic)}
        description="Where your latest reading falls (AHA guideline)"
      />
    </div>
  );
}

function TodayCheckIns({
  todayByPeriod,
  tz,
}: {
  todayByPeriod: Partial<Record<Period, TodayReading>>;
  tz: string;
}) {
  const loggedCount = PERIODS.filter((p) => Boolean(todayByPeriod[p])).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="grid gap-0.5">
          <CardTitle className="text-base">Today&apos;s check-ins</CardTitle>
          <CardDescription>
            {loggedCount} of {PERIODS.length} logged today
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {PERIODS.map((period) => {
          const entry = todayByPeriod[period];
          return (
            <div
              key={period}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background/60 px-3 py-2.5"
            >
              <div className="grid gap-0.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {entry ? <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden /> : null}
                  {PERIOD_LABELS[period]}
                </span>
                {entry ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {entry.systolic}/{entry.diastolic}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatInZone(entry.measuredAt, "h:mm a", tz)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not logged yet</span>
                )}
              </div>
              {entry ? (
                <CategoryBadge systolic={entry.systolic} diastolic={entry.diastolic} />
              ) : (
                <QuickAddReadingDialog
                  defaultPeriod={period}
                  triggerLabel="Log"
                  variant="outline"
                  size="xs"
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AveragesCard({
  title,
  data,
  overall,
  compareTo,
}: {
  title: string;
  data: PeriodAverage[];
  overall: { systolic: number; diastolic: number; count: number } | null;
  compareTo?: { systolic: number; diastolic: number; count: number } | null;
}) {
  const sysDelta = overall && compareTo ? overall.systolic - compareTo.systolic : null;
  const diaDelta = overall && compareTo ? overall.diastolic - compareTo.diastolic : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>Averages · {title}</CardDescription>
          {overall ? <CategoryBadge systolic={overall.systolic} diastolic={overall.diastolic} /> : null}
        </div>
        {overall ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
            <span className="text-xl font-semibold tabular-nums">
              {overall.systolic}/{overall.diastolic}
            </span>
            <span className="text-xs text-muted-foreground">overall ({overall.count})</span>
            {sysDelta !== null && diaDelta !== null && (sysDelta !== 0 || diaDelta !== 0) ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                · {sysDelta > 0 ? `+${sysDelta}` : sysDelta}/{diaDelta > 0 ? `+${diaDelta}` : diaDelta} vs 30d
              </span>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-7">Period</TableHead>
              <TableHead className="h-7 text-right">BP</TableHead>
              <TableHead className="h-7 text-right">n</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.period}>
                <TableCell className="py-1.5">{PERIOD_LABELS[d.period]}</TableCell>
                <TableCell className="py-1.5 text-right font-medium tabular-nums">
                  {d.systolic === null ? "—" : `${d.systolic}/${d.diastolic}`}
                </TableCell>
                <TableCell className="py-1.5 text-right text-muted-foreground tabular-nums">{d.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
