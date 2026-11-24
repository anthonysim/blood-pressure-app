import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BpCategoryChart } from "@/components/bp-category-chart";
import { CategoryBadge } from "@/components/category-badge";
import { BloodPressureChart } from "@/components/charts/lazy";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classify, PERIOD_LABELS } from "@/lib/bp";
import type { PeriodAverage } from "@/lib/chart-types";
import { getDashboard } from "@/lib/data";
import { formatInZone } from "@/lib/dates";
import { PageTransition, Reveal } from "@/components/transitions";

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

async function Dashboard() {
  const { latest, last7, last30, daily30, tz, name } = await getDashboard();
  const firstName = name.split(" ")[0];

  if (!latest) {
    return (
      <div className="grid place-items-center gap-4 rounded-xl border border-dashed bg-card p-12 text-center">
        <h1 className="text-2xl font-semibold">Welcome, {firstName}</h1>
        <p className="max-w-md text-muted-foreground">
          Log your blood pressure in the morning, at noon and at night to start seeing trends.
        </p>
        <Link href="/readings/new" className={buttonVariants()}>
          Add your first reading
        </Link>
        <div className="mt-4 w-full max-w-2xl text-left">
          <BpCategoryChart />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Hi, {firstName}</h1>
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
        <AveragesCard title="Last 7 days" data={last7} />
        <AveragesCard title="Last 30 days" data={last30} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="grid gap-1">
            <CardTitle>Last 30 days</CardTitle>
            <CardDescription>Daily average, mmHg</CardDescription>
          </div>
          <Link href="/trends" className={buttonVariants({ variant: "outline", size: "sm" })}>
            All trends
          </Link>
        </CardHeader>
        <CardContent>
          <BloodPressureChart data={daily30} height={240} compact />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Blood pressure categories</CardTitle>
          <CardDescription>Where your latest reading falls</CardDescription>
        </CardHeader>
        <CardContent>
          <BpCategoryChart highlight={classify(latest.systolic, latest.diastolic)} />
        </CardContent>
      </Card>
    </div>
  );
}

function AveragesCard({ title, data }: { title: string; data: PeriodAverage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Averages · {title}</CardDescription>
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
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
