export function CategoryTableSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3" />
            <th className="px-4 py-3" />
            <th className="px-4 py-3" />
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="divide-y divide-neutral-200">
              <td className="px-4 py-3">
                <div className="h-4 w-3/4 bg-neutral-200 animate-pulse rounded" />
              </td>
              <td className="px-4 py-3">
                <div className="h-5 w-20 bg-neutral-200 animate-pulse rounded-md" />
              </td>
              <td className="px-4 py-3">
                <div className="h-5 w-20 bg-neutral-200 animate-pulse rounded-md" />
              </td>
              <td className="px-4 py-3">
                <div className="h-8 w-24 bg-neutral-200 animate-pulse rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}