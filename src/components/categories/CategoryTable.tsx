import type { Category } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CategoryTableProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onCreate: () => void
}

export function CategoryTable({ categories, onEdit, onDelete, onCreate }: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">No categories yet.</p>
        <Button className="mt-4" size="sm" onClick={onCreate}>
          Create your first category
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Default Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Default
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3 text-sm text-neutral-900">{category.name}</td>
              <td className="px-4 py-3">
                <Badge variant={category.default_type}>
                  {category.default_type.charAt(0).toUpperCase() + category.default_type.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {category.is_default && (
                  <Badge variant="default">Default</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(category)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}