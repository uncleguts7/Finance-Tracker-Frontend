export function ExpenseListSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-5">
        <div className="h-5 w-24 animate-pulse rounded bg-secondary" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-secondary" />
      </div>
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-border/60 px-5 py-3"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}
