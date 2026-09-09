export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 h-7 w-32 animate-pulse rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  )
}