import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useCategories } from '@/hooks/useCategories'
import { CategoryTable } from '@/components/categories/CategoryTable'
import { CategoryTableSkeleton } from '@/components/categories/CategoryTableSkeleton'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { EditCategoryModal } from '@/components/categories/EditCategoryModal'
import { DeleteConfirmDialog } from '@/components/categories/DeleteConfirmDialog'
import type { Category } from '@/lib/types'

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Categories</h1>
          <Button disabled>New Category</Button>
        </div>
        <CategoryTableSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Categories</h1>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm text-neutral-500">Failed to load categories.</p>
          <Button className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <Button onClick={() => setCreateModalOpen(true)}>New Category</Button>
      </div>

      <CategoryTable
        categories={categories ?? []}
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