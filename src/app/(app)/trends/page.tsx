import type { Metadata } from "next";
import { Suspense } from "react";
import { CollapsibleBpCategories } from "@/components/bp-category-chart";
import { BloodPressureChart, PeriodChart, PulseChart } from "@/components/charts/lazy";
import { FilterBar } from "@/components/filter-bar";
import { SavedSearches } from "@/components/saved-searches";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSavedSearches, getTrends } from "@/lib/data";
import { parseFilters, serializeFilters } from "@/lib/filters";
import { PageTransition, Reveal } from "@/components/transitions";
import { TrendsSkeleton } from "@/components/skeletons";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage({ searchParams }: PageProps<"/trends">) {
  return (
    <PageTransition>
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Trends</h1>
        <Suspense fallback={<TrendsSkeleton />}>
          <Reveal>
            <div className="grid gap-4">
              <TrendsContent searchParams={searchParams} />
            </div>
          </Reveal>
        </Suspense>
        <CollapsibleBpCategories description="American Heart Association guideline" />
      </div>
    </PageTransition>
  );
}

async function TrendsContent({ searchParams }: { searchParams: PageProps<"/trends">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const query = serializeFilters(filters);
  const [{ daily, byPeriod }, saved] = await Promise.all([getTrends(filters), getSavedSearches()]);

  return (
    <>
      <FilterBar basePath="/trends" filters={filters} />
      <SavedSearches basePath="/trends" saved={saved} currentQuery={query} />
      {daily.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          No readings match these filters.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Blood pressure over time</CardTitle>
              <CardDescription>Daily average, mmHg</CardDescription>
            </CardHeader>
            <CardContent>
              <BloodPressureChart data={daily} />
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Morning vs noon vs night</CardTitle>
                <CardDescription>Average by time of day, mmHg</CardDescription>
              </CardHeader>
              <CardContent>
                <PeriodChart data={byPeriod} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pulse</CardTitle>
                <CardDescription>Daily average, bpm</CardDescription>
              </CardHeader>
              <CardContent>
                <PulseChart data={daily} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
