import { PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryBadge } from "@/components/category-badge";
import { DeleteReadingButton } from "@/components/delete-reading-button";
import { FilterBar } from "@/components/filter-bar";
import { SavedSearches } from "@/components/saved-searches";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_LABELS } from "@/lib/bp";
import { getReadings, getSavedSearches } from "@/lib/data";
import { formatInZone } from "@/lib/dates";
import { hasActiveFilters, parseFilters, serializeFilters } from "@/lib/filters";
import { PageTransition, Reveal } from "@/components/transitions";
import { ListPageSkeleton } from "@/components/skeletons";

export const metadata: Metadata = { title: "Readings" };

export default function ReadingsPage({ searchParams }: PageProps<"/readings">) {
  return (
    <PageTransition>
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Readings</h1>
        <Suspense fallback={<ListPageSkeleton />}>
          <Reveal>
            <div className="grid gap-4">
              <ReadingsContent searchParams={searchParams} />
            </div>
          </Reveal>
        </Suspense>
      </div>
    </PageTransition>
  );
}

async function ReadingsContent({ searchParams }: { searchParams: PageProps<"/readings">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const query = serializeFilters(filters);
  const [{ rows, truncated, tz }, saved] = await Promise.all([getReadings(filters), getSavedSearches()]);

  return (
    <>
      <FilterBar basePath="/readings" filters={filters} />
      <SavedSearches basePath="/readings" saved={saved} currentQuery={query} />
      <p className="text-sm text-muted-foreground">
        {rows.length} reading{rows.length === 1 ? "" : "s"}
        {truncated ? " (showing most recent 1,000 — narrow the date range to see older ones)" : ""}
      </p>
      {rows.length === 0 ? (
        <EmptyState filtered={hasActiveFilters(filters)} />
      ) : (
        <ReadingsTable rows={rows} tz={tz} />
      )}
    </>
  );
}

type Row = Awaited<ReturnType<typeof getReadings>>["rows"][number];

function ReadingsTable({ rows, tz }: { rows: Row[]; tz: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">BP (mmHg)</TableHead>
            <TableHead className="text-right">Pulse</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
            <TableHead className="w-20">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatInZone(r.measuredAt, "EEE, MMM d, yyyy", tz)}</TableCell>
              <TableCell className="tabular-nums">{formatInZone(r.measuredAt, "h:mm a", tz)}</TableCell>
              <TableCell>{PERIOD_LABELS[r.period]}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {r.systolic}/{r.diastolic}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.pulse ?? "—"}</TableCell>
              <TableCell>
                <CategoryBadge systolic={r.systolic} diastolic={r.diastolic} />
              </TableCell>
              <TableCell className="hidden max-w-60 truncate text-muted-foreground md:table-cell" title={r.notes ?? undefined}>
                {r.notes}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Link
                    href={`/readings/${r.id}/edit`}
                    aria-label="Edit reading"
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                  >
                    <PencilIcon />
                  </Link>
                  <DeleteReadingButton id={r.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="text-muted-foreground">
        {filtered ? "No readings match these filters." : "No readings yet."}
      </p>
      <Link href="/readings/new" className={buttonVariants()}>
        Add a reading
      </Link>
    </div>
  );
}

