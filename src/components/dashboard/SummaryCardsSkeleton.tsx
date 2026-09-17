export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
          <div className="mt-4 h-8 w-32 animate-pulse rounded bg-secondary" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}
