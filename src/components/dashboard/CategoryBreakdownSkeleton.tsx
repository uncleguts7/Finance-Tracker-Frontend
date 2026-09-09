export function CategoryBreakdownSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="h-5 w-44 animate-pulse rounded bg-neutral-200" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
            <div className="mt-1.5 h-2 w-full animate-pulse rounded-full bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  )
}