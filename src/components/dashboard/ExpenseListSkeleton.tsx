export function ExpenseListSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 sm:px-6">
        <div className="h-5 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="h-8 w-28 animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-neutral-100 px-4 py-3 sm:px-6"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  )
}