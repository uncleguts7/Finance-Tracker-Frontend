export function CategoryBreakdownSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="h-5 w-44 animate-pulse rounded bg-secondary" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
            <div className="mt-1.5 h-1.5 w-full animate-pulse rounded-full bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}
