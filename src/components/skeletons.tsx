/** Placeholders sized like the real content so pages don't jump when data streams in. */

function Block({ className }: { className: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export function FilterBarSkeleton() {
  return <Block className="h-[118px]" />;
}

export function ListPageSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading">
      <FilterBarSkeleton />
      <Block className="h-7 w-full max-w-72" />
      <Block className="h-4 w-24" />
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse bg-card" />
        ))}
      </div>
    </div>
  );
}

export function TrendsSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading">
      <FilterBarSkeleton />
      <Block className="h-7 w-full max-w-72" />
      <Block className="h-[470px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Block className="h-[380px]" />
        <Block className="h-[380px]" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="grid gap-5" role="status" aria-label="Loading">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Block className="h-14" />
        <Block className="h-14" />
        <Block className="h-14" />
      </div>
      <Block className="h-14 w-56" />
      <Block className="h-14 w-64" />
      <Block className="h-20" />
      <Block className="h-8 w-40" />
    </div>
  );
}
