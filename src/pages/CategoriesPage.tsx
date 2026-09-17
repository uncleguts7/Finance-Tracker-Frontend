import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCategories } from '@/hooks/useCategories'
import { CategoryMetrics } from '@/components/categories/CategoryMetrics'
import { CategoryTable } from '@/components/categories/CategoryTable'
import { CategoryTableSkeleton } from '@/components/categories/CategoryTableSkeleton'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { EditCategoryModal } from '@/components/categories/EditCategoryModal'
import { DeleteConfirmDialog } from '@/components/categories/DeleteConfirmDialog'
import type { Category } from '@/lib/types'

function PageHeader({ onCreate, disabled = false }: { onCreate?: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ledger Configuration
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
          <span className="text-[11px] text-muted-foreground">Live Rules</span>
        </div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight md:text-4xl">
          Categories
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Manage default category rules and expense classifications. Automatic routing applies on
          all connected financial streams.
        </p>
      </div>
      {onCreate && (
        <Button onClick={onCreate} disabled={disabled} className="self-start md:self-auto">
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      )}
    </div>
  )
}

export function CategoriesPage() {
  const { data: categories, isLoading, isError, refetch } = useCategories()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)

  const handleEdit = (category: Category) => {
    setEditCategory(category)
    setEditModalOpen(true)
  }

  const handleDelete = (category: Category) => {
    setDeleteCategory(category)
    setDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <CategoryTableSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader onCreate={() => setCreateModalOpen(true)} />
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Failed to load categories.</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const list = categories ?? []

  return (
    <div className="space-y-6">
      <PageHeader onCreate={() => setCreateModalOpen(true)} />

      {list.length > 0 && <CategoryMetrics categories={list} />}

      <CategoryTable
        categories={list}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={() => setCreateModalOpen(true)}
      />

      <CreateCategoryModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <EditCategoryModal
        open={editModalOpen}
        category={editCategory}
        onClose={() => {
          setEditModalOpen(false)
          setEditCategory(null)
        }}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        category={deleteCategory}
        onClose={() => {
          setDeleteDialogOpen(false)
          setDeleteCategory(null)
        }}
      />
    </div>
  )
}
