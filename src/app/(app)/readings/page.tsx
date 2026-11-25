import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryBadge } from "@/components/category-badge";
import { DeleteReadingButton } from "@/components/delete-reading-button";
import { FilterBar } from "@/components/filter-bar";
import { QuickAddReadingDialog } from "@/components/quick-add-reading-dialog";
import { ReadingsActions } from "@/components/readings-actions";
import { SavedSearches } from "@/components/saved-searches";
import { ListPageSkeleton } from "@/components/skeletons";
import { PageTransition, Reveal } from "@/components/transitions";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_LABELS } from "@/lib/bp";
import { getReadings, getSavedSearches, PAGE_SIZE } from "@/lib/data";
import { formatInZone } from "@/lib/dates";
import { hasActiveFilters, parseFilters, serializeFilters } from "@/lib/filters";

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

function parsePage(raw: string | string[] | undefined): number {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(val);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function pageHref(query: string, page: number): string {
  const sp = new URLSearchParams(query);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/readings?${qs}` : "/readings";
}

async function ReadingsContent({ searchParams }: { searchParams: PageProps<"/readings">["searchParams"] }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const requestedPage = parsePage(sp.page);
  const query = serializeFilters(filters);
  const [{ rows, totalCount, page, totalPages, tz }, saved] = await Promise.all([
    getReadings(filters, requestedPage),
    getSavedSearches(),
  ]);

  const startIdx = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <>
      <FilterBar basePath="/readings" filters={filters} />
      <SavedSearches basePath="/readings" saved={saved} currentQuery={query} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "0 readings"
            : totalPages > 1
              ? `Showing ${startIdx}–${endIdx} of ${totalCount} readings`
              : `${totalCount} reading${totalCount === 1 ? "" : "s"}`}
        </p>
        {totalCount > 0 ? <ReadingsActions query={query} /> : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState filtered={hasActiveFilters(filters)} />
      ) : (
        <>
          <ReadingsMobileList rows={rows} tz={tz} />
          <ReadingsTable rows={rows} tz={tz} />
          {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} query={query} /> : null}
        </>
      )}
    </>
  );
}

type Row = Awaited<ReturnType<typeof getReadings>>["rows"][number];

function ReadingsMobileList({ rows, tz }: { rows: Row[]; tz: string }) {
  return (
    <div className="grid gap-2.5 md:hidden">
      {rows.map((r) => {
        const dateLabel = formatInZone(r.measuredAt, "EEE, MMM d, yyyy", tz);
        const timeLabel = formatInZone(r.measuredAt, "h:mm a", tz);
        return (
          <div key={r.id} className="grid gap-2 rounded-xl border bg-card p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {r.systolic}/{r.diastolic}
                </span>
                <span className="text-xs text-muted-foreground">mmHg</span>
                <CategoryBadge systolic={r.systolic} diastolic={r.diastolic} />
              </div>
              <div className="no-print flex items-center">
                <Link
                  href={`/readings/${r.id}/edit`}
                  aria-label="Edit reading"
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <PencilIcon />
                </Link>
                <DeleteReadingButton id={r.id} summary={`${r.systolic}/${r.diastolic} (${dateLabel})`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{dateLabel}</span>
              <span>·</span>
              <span className="tabular-nums">{timeLabel}</span>
              <span>·</span>
              <span>{PERIOD_LABELS[r.period]}</span>
              {r.pulse !== null ? (
                <>
                  <span>·</span>
                  <span className="tabular-nums">{r.pulse} bpm</span>
                </>
              ) : null}
            </div>
            {r.notes ? <p className="text-xs text-muted-foreground">{r.notes}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function ReadingsTable({ rows, tz }: { rows: Row[]; tz: string }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">BP (mmHg)</TableHead>
            <TableHead className="text-right">Pulse</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="no-print w-20">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const dateLabel = formatInZone(r.measuredAt, "EEE, MMM d, yyyy", tz);
            return (
              <TableRow key={r.id}>
                <TableCell>{dateLabel}</TableCell>
                <TableCell className="tabular-nums">{formatInZone(r.measuredAt, "h:mm a", tz)}</TableCell>
                <TableCell>{PERIOD_LABELS[r.period]}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {r.systolic}/{r.diastolic}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.pulse ?? "—"}</TableCell>
                <TableCell>
                  <CategoryBadge systolic={r.systolic} diastolic={r.diastolic} />
                </TableCell>
                <TableCell className="max-w-60 truncate text-muted-foreground" title={r.notes ?? undefined}>
                  {r.notes}
                </TableCell>
                <TableCell className="no-print">
                  <div className="flex justify-end">
                    <Link
                      href={`/readings/${r.id}/edit`}
                      aria-label="Edit reading"
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    >
                      <PencilIcon />
                    </Link>
                    <DeleteReadingButton id={r.id} summary={`${r.systolic}/${r.diastolic} (${dateLabel})`} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Pagination({ page, totalPages, query }: { page: number; totalPages: number; query: string }) {
  return (
    <nav aria-label="Pagination" className="no-print flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={pageHref(query, page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ChevronLeftIcon aria-hidden />
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}
          >
            <ChevronLeftIcon aria-hidden />
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link href={pageHref(query, page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Next
            <ChevronRightIcon aria-hidden />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={buttonVariants({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}
          >
            Next
            <ChevronRightIcon aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed bg-card p-10 text-center">
      <p className="text-muted-foreground">
        {filtered ? "No readings match these filters." : "No readings yet."}
      </p>
      <QuickAddReadingDialog triggerLabel="Add a reading" size="default" />
    </div>
  );
}
