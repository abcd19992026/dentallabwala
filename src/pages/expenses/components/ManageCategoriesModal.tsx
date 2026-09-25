import React, { useState } from 'react'
import {
  X,
  Plus,
  Tag,
  Pencil,
  Check,
  Power,
  Info,
  AlertCircle,
} from 'lucide-react'
import type { Category } from '../types'
import { getCategoryColor } from '../utils/categoryColors'

interface ManageCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  onAddCategory: (name: string) => Promise<void>
  onRenameCategory: (categoryId: string, newName: string) => Promise<void>
  onToggleCategoryStatus: (category: Category) => Promise<void>
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onRenameCategory,
  onToggleCategoryStatus,
}) => {
  const [newCatName, setNewCatName] = useState('')
  const [addError, setAddError] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Inline editing state
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editError, setEditError] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCatName.trim()
    if (!trimmed) {
      setAddError('Category name cannot be empty')
      return
    }

    const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setAddError('This category already exists.')
      return
    }

    setIsAdding(true)
    try {
      await onAddCategory(trimmed)
      setNewCatName('')
      setAddError('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const startEditing = (category: Category) => {
    setEditingCatId(category.id)
    setEditingCatName(category.name)
    setEditError('')
  }

  const handleSaveRename = async (categoryId: string) => {
    const trimmed = editingCatName.trim()
    if (!trimmed) {
      setEditError('Category name cannot be empty')
      return
    }

    const exists = categories.some(
      (c) => c.id !== categoryId && c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) {
      setEditError('Another category already uses this name')
      return
    }

    setIsRenaming(true)
    try {
      await onRenameCategory(categoryId, trimmed)
      setEditingCatId(null)
      setEditingCatName('')
      setEditError('')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleToggle = async (category: Category) => {
    setTogglingId(category.id)
    try {
      await onToggleCategoryStatus(category)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Manage Expense Categories
              </h3>
              <p className="text-xs text-slate-400">
                Add, rename, or deactivate categories without losing historical logs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Category Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Add New Category
            </h4>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value)
                    if (addError) setAddError('')
                  }}
                  placeholder="e.g. Courier & Dispatch, Electricity, Equipment Repair..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all flex-shrink-0"
                >
                  <Plus size={14} />
                  <span>{isAdding ? 'Adding…' : 'Add'}</span>
                </button>
              </div>

              {addError && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle size={12} /> {addError}
                </p>
              )}
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                All Categories ({categories.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Deactivated categories hide from new entries
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {categories.map((category) => {
                const isEditing = editingCatId === category.id

                return (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      category.is_active
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/20 border-slate-900 opacity-60'
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Rename Mode */
                      <div className="flex-1 flex flex-col gap-1 mr-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => {
                              setEditingCatName(e.target.value)
                              if (editError) setEditError('')
                            }}
                            autoFocus
                            className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-blue-500 text-white text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(category.id)}
                            disabled={isRenaming}
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(null)
                              setEditingCatName('')
                              setEditError('')
                            }}
                            disabled={isRenaming}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-slate-400"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {editError && (
                          <p className="text-[11px] text-rose-400">{editError}</p>
                        )}
                      </div>
                    ) : (
                      /* Normal Display */
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCategoryColor(category) }}
                        />
                        <div className="truncate">
                          <span
                            className={`text-sm font-semibold truncate ${
                              category.is_active ? 'text-white' : 'text-slate-500 line-through'
                            }`}
                          >
                            {category.name}
                          </span>
                          {!category.is_active && (
                            <span className="ml-2 text-[10px] uppercase font-bold text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Rename Button */}
                        <button
                          type="button"
                          onClick={() => startEditing(category)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          title="Rename Category"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Toggle Active/Inactive Button */}
                        <button
                          type="button"
                          onClick={() => handleToggle(category)}
                          disabled={togglingId === category.id}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
                            category.is_active
                              ? 'text-slate-400 hover:text-rose-400 bg-slate-800/60 border-slate-700 hover:border-rose-500/30'
                              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={category.is_active ? 'Deactivate Category' : 'Reactivate Category'}
                        >
                          <Power size={12} />
                          <span>
                            {togglingId === category.id
                              ? '…'
                              : category.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-slate-400 text-xs">
            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p>
              Categories are never permanently deleted to preserve the accuracy of previous financial records and reports. Deactivated categories simply won&apos;t appear in entry creation or active filters.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
