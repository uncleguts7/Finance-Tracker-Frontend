import { useMemo, useState } from 'react'
import { BadgeCheck, Pencil, Search, SearchX, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Category, ExpenseType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { categoryIcon } from './categoryIcon'

type Filter = 'all' | ExpenseType | 'defaults'

interface CategoryTableProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onCreate: () => void
}

function TypeBadge({ type }: { type: ExpenseType }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        type === 'fixed'
          ? 'bg-muted text-foreground'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          type === 'fixed' ? 'bg-muted-foreground' : 'bg-amber-500',
        )}
      />
      {type}
    </span>
  )
}

function DefaultBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
      <BadgeCheck className="h-3.5 w-3.5" />
      Default
    </span>
  )
}

function CustomRule() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-border" />
      Custom Rule
    </span>
  )
}

function ActionButtons({
  category,
  onEdit,
  onDelete,
}: {
  category: Category
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        title={`Edit ${category.name}`}
        aria-label={`Edit ${category.name}`}
        onClick={() => onEdit(category)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={`Delete ${category.name}`}
        aria-label={`Delete ${category.name}`}
        onClick={() => onDelete(category)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CategoryTable({ categories, onEdit, onDelete, onCreate }: CategoryTableProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(
    () => ({
      all: categories.length,
      fixed: categories.filter((c) => c.default_type === 'fixed').length,
      variable: categories.filter((c) => c.default_type === 'variable').length,
      defaults: categories.filter((c) => c.is_default).length,
    }),
    [categories],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories.filter((c) => {
      if (filter === 'fixed' && c.default_type !== 'fixed') return false
      if (filter === 'variable' && c.default_type !== 'variable') return false
      if (filter === 'defaults' && !c.is_default) return false
      return q === '' || c.name.toLowerCase().includes(q)
    })
  }, [categories, search, filter])

  const filters: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'fixed', label: 'Fixed' },
    { key: 'variable', label: 'Variable' },
    { key: 'defaults', label: 'Defaults Only' },
  ]

  const resetFilters = () => {
    setSearch('')
    setFilter('all')
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No categories yet.</p>
        <Button className="mt-4" size="sm" onClick={onCreate}>
          Create your first category
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Controls toolbar */}
      <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by label or type..."
            aria-label="Search categories"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 self-start overflow-x-auto md:self-auto">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                'h-8 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors',
                filter === key
                  ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {label} <span className="ml-1 tabular-nums opacity-70">({counts[key]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground">
              <th className="w-12 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" scope="col">
                #
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" scope="col">
                Name
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" scope="col">
                Default Type
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" scope="col">
                Rule Status
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" scope="col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((category, index) => {
              const Icon = categoryIcon(category.name)
              return (
                <tr
                  key={category.id}
                  className="group h-14 border-b border-border/60 transition-colors duration-100 last:border-0 hover:bg-muted/50"
                >
                  <td className="px-5 py-2 text-sm font-medium tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2">
                    <TypeBadge type={category.default_type} />
                  </td>
                  <td className="px-5 py-2">
                    {category.is_default ? <DefaultBadge /> : <CustomRule />}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <ActionButtons category={category} onEdit={onEdit} onDelete={onDelete} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {visible.map((category) => {
          const Icon = categoryIcon(category.name)
          return (
            <div
              key={category.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{category.name}</span>
                </div>
                {category.is_default ? (
                  <DefaultBadge />
                ) : (
                  <span className="text-xs text-muted-foreground">Custom</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                <TypeBadge type={category.default_type} />
                <ActionButtons category={category} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty filter state */}
      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <SearchX className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No categories match your criteria</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try relaxing the search filter or resetting query tags.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 h-8 rounded-lg bg-muted px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Footer meta */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Changes apply to future expenses; historical totals are never affected.
        </p>
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          Showing {visible.length} of {categories.length} categories
        </p>
      </div>
    </div>
  )
}
