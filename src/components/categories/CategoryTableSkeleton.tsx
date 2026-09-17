export function CategoryTableSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
          <div className="h-9 w-full max-w-md animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="hidden md:block">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex h-14 items-center gap-4 border-b border-border/60 px-5 last:border-0"
            >
              <div className="h-4 w-6 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-8 w-16 animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
