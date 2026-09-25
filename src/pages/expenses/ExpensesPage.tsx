import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { expensesService, sortCategories } from './services/expenses.service'
import type { Category, ExpenseEntry, ExpenseFormInput } from './types'
import { ExpenseKpiCards } from './components/ExpenseKpiCards'
import { ComparisonChart } from './components/ComparisonChart'
import { SpendByCategoryChart } from './components/SpendByCategoryChart'
import { ExpenseLedgerTable } from './components/ExpenseLedgerTable'
import { AddEditExpenseModal } from './components/AddEditExpenseModal'
import { ManageCategoriesModal } from './components/ManageCategoriesModal'
import { DeleteExpenseModal } from './components/DeleteExpenseModal'
import {
  formatMonthName,
  getISTReferenceDate,
  getISTMonthString,
  getPreviousMonth,
} from './utils/currencyFormatter'
import { getFriendlyExpenseError } from './utils/errorMessages'
import { daysInMonth, monthKeyFromDate } from './utils/calculations'

export default function ExpensesPage() {
  const { labId } = useAuthStore()
  const { tenant } = useTenantStore()
  const effectiveLabId = labId || tenant?.id || ''

  // "Today" for the default form date, same-period comparison, the
  // future-date block, and the daily average — always IST, never the
  // browser's or the server's local timezone.
  const referenceDate = useMemo(() => getISTReferenceDate(), [])
  const defaultMonth = useMemo(() => getISTMonthString(), [])

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)

  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (!errorToast) return
    const timer = setTimeout(() => setErrorToast(null), 4000)
    return () => clearTimeout(timer)
  }, [errorToast])

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null)
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<ExpenseEntry | null>(null)
  const [isSavingExpense, setIsSavingExpense] = useState(false)
  const [isDeletingExpense, setIsDeletingExpense] = useState(false)

  const currentMonthKey = useMemo(() => monthKeyFromDate(referenceDate), [referenceDate])

  // Available months list for selector — 6 months back through the
  // current IST month. Never lists a future month.
  const availableMonths = useMemo(() => {
    const list: string[] = []
    for (let i = -6; i <= 0; i++) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + i, 1)
      const yr = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, '0')
      list.push(`${yr}-${mo}`)
    }
    return list
  }, [referenceDate])

  const isAtCurrentMonth = selectedMonth >= currentMonthKey

  // Fetch categories (all, active + inactive) and entries for the
  // selected month AND the previous month (needed for the comparison chart)
  const loadData = useCallback(
    async (month: string) => {
      if (!effectiveLabId) return
      setIsLoading(true)
      setLoadError(null)
      try {
        const prevMonth = getPreviousMonth(month)
        const fromDate = `${prevMonth}-01`
        const toDate = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`

        const [cats, entries] = await Promise.all([
          expensesService.getCategories(effectiveLabId),
          expensesService.getEntries(effectiveLabId, fromDate, toDate),
        ])
        setCategories(cats)
        setExpenses(entries)
      } catch (err) {
        console.error('Failed to load expenses data:', err)
        setLoadError('Could not load expenses data. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    },
    [effectiveLabId]
  )

  useEffect(() => {
    loadData(selectedMonth)
  }, [loadData, selectedMonth])

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const prev = new Date(year, month - 2, 1)
    const y = prev.getFullYear()
    const m = String(prev.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(`${y}-${m}`)
  }

  const handleNextMonth = () => {
    if (isAtCurrentMonth) return // never navigate past the current IST month
    const [year, month] = selectedMonth.split('-').map(Number)
    const next = new Date(year, month, 1)
    const y = next.getFullYear()
    const m = String(next.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(`${y}-${m}`)
  }

  // Expense CRUD Handlers
  const handleSaveExpense = async (formData: ExpenseFormInput, existingId?: string) => {
    setIsSavingExpense(true)
    try {
      if (existingId) {
        await expensesService.updateEntry(existingId, formData)
        setToastMessage('Expense record updated successfully')
      } else {
        await expensesService.createEntry(effectiveLabId, formData)
        setToastMessage('New expense logged successfully')
      }
      setIsAddExpenseOpen(false)
      setEditingExpense(null)
      await loadData(selectedMonth)
    } catch (err) {
      setErrorToast(getFriendlyExpenseError(err))
    } finally {
      setIsSavingExpense(false)
    }
  }

  const handleDeleteExpenseConfirm = async () => {
    if (!deletingExpense) return
    setIsDeletingExpense(true)
    try {
      await expensesService.deleteEntry(deletingExpense.id)
      setToastMessage('Expense deleted')
      setDeletingExpense(null)
      await loadData(selectedMonth)
    } catch (err) {
      setErrorToast(getFriendlyExpenseError(err))
    } finally {
      setIsDeletingExpense(false)
    }
  }

  // Category CRUD Handlers
  const handleAddNewCategory = async (categoryName: string): Promise<Category> => {
    try {
      const created = await expensesService.createCategory(effectiveLabId, categoryName)
      setCategories((prev) => sortCategories([...prev, created]))
      setToastMessage(`Category "${created.name}" added`)
      return created
    } catch (err) {
      // Thrown as a friendly Error so the calling form can show it inline.
      throw new Error(getFriendlyExpenseError(err))
    }
  }

  const handleRenameCategory = async (categoryId: string, newName: string): Promise<void> => {
    try {
      const updated = await expensesService.renameCategory(categoryId, newName)
      setCategories((prev) => sortCategories(prev.map((c) => (c.id === categoryId ? updated : c))))
      setToastMessage('Category renamed')
    } catch (err) {
      throw new Error(getFriendlyExpenseError(err))
    }
  }

  const handleToggleCategoryStatus = async (category: Category): Promise<void> => {
    try {
      const updated = await expensesService.setCategoryActive(category.id, !category.is_active)
      setCategories((prev) => sortCategories(prev.map((c) => (c.id === category.id ? updated : c))))
      setToastMessage(`Category "${updated.name}" ${updated.is_active ? 'activated' : 'deactivated'}`)
    } catch (err) {
      setErrorToast(getFriendlyExpenseError(err))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 text-sm font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-400 text-sm font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          <AlertCircle size={18} className="text-rose-400" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Expenses
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles size={12} />
              Financial Hub
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Track and manage your lab expenses
          </p>
        </div>

        {/* Right side: Month selector & + Add Expense Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar size={14} className="text-blue-400 flex-shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={isLoading}
                className="bg-transparent text-white font-semibold text-xs sm:text-sm focus:outline-none cursor-pointer py-1 disabled:opacity-50"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {formatMonthName(m)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isLoading || isAtCurrentMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={isAtCurrentMonth ? 'Already at the current month' : 'Next Month'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Primary + Add Expense Button */}
          <button
            type="button"
            onClick={() => {
              setEditingExpense(null)
              setIsAddExpenseOpen(true)
            }}
            disabled={!effectiveLabId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          <AlertCircle size={16} />
          <span>{loadError}</span>
        </div>
      )}

      {isLoading ? (
        <ExpensesLoadingSkeleton />
      ) : (
        <>
          {/* 2. Four KPI Cards */}
          <ExpenseKpiCards
            selectedMonth={selectedMonth}
            expenses={expenses}
            categories={categories}
            referenceDate={referenceDate}
          />

          {/* 3. Two Charts Side by Side (Stack vertically on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 h-full">
              <ComparisonChart
                selectedMonth={selectedMonth}
                expenses={expenses}
                categories={categories}
                referenceDate={referenceDate}
              />
            </div>
            <div className="lg:col-span-5 h-full">
              <SpendByCategoryChart
                selectedMonth={selectedMonth}
                expenses={expenses}
                categories={categories}
              />
            </div>
          </div>

          {/* 4. Expense Ledger Table */}
          <ExpenseLedgerTable
            selectedMonth={selectedMonth}
            expenses={expenses}
            categories={categories}
            onEditExpense={(expense) => {
              setEditingExpense(expense)
              setIsAddExpenseOpen(true)
            }}
            onDeleteExpense={(expense) => {
              setDeletingExpense(expense)
            }}
            onOpenAddExpense={() => {
              setEditingExpense(null)
              setIsAddExpenseOpen(true)
            }}
            onOpenManageCategories={() => {
              setIsManageCategoriesOpen(true)
            }}
          />
        </>
      )}

      {/* 5. Add / Edit Expense Modal */}
      <AddEditExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          if (isSavingExpense) return
          setIsAddExpenseOpen(false)
          setEditingExpense(null)
        }}
        onSaveExpense={handleSaveExpense}
        onAddNewCategory={handleAddNewCategory}
        editingExpense={editingExpense}
        categories={categories}
        isSaving={isSavingExpense}
      />

      {/* 6. Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        categories={categories}
        onAddCategory={async (name) => {
          await handleAddNewCategory(name)
        }}
        onRenameCategory={handleRenameCategory}
        onToggleCategoryStatus={handleToggleCategoryStatus}
      />

      {/* 7. Delete Confirmation Modal */}
      <DeleteExpenseModal
        isOpen={!!deletingExpense}
        onClose={() => {
          if (isDeletingExpense) return
          setDeletingExpense(null)
        }}
        onConfirmDelete={handleDeleteExpenseConfirm}
        expense={deletingExpense}
        isDeleting={isDeletingExpense}
      />
    </div>
  )
}

function ExpensesLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/60 border border-slate-800 h-80" />
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/60 border border-slate-800 h-80" />
      </div>
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 h-96" />
    </div>
  )
}
