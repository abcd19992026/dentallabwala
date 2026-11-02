import React, { useState, useMemo } from 'react'
import {
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  Banknote,
  QrCode,
  ArrowUpDown,
  FileText,
  Receipt,
  Plus,
  ArrowDownLeft,
  Printer,
} from 'lucide-react'
import type { ExpenseEntry, Category, PaymentMode } from '../types'
import {
  formatIndianCurrency,
  formatDisplayDate,
} from '../utils/currencyFormatter'
import { getCategoryColor } from '../utils/categoryColors'

interface ExpenseLedgerTableProps {
  selectedMonth: string // YYYY-MM
  startDate?: string
  endDate?: string
  expenses: ExpenseEntry[]
  categories: Category[]
  cashInCategoryId?: string
  onEditExpense: (entry: ExpenseEntry) => void
  onDeleteExpense: (entry: ExpenseEntry) => void
  onOpenAddExpense: () => void
  onOpenManageCategories: () => void
  onClearDateFilter?: () => void
  onOpenPrint?: () => void
}

type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc'
type TypeFilter = 'all' | 'expense' | 'cash_in'

export const ExpenseLedgerTable: React.FC<ExpenseLedgerTableProps> = ({
  selectedMonth,
  startDate,
  endDate,
  expenses,
  categories,
  cashInCategoryId,
  onEditExpense,
  onDeleteExpense,
  onOpenAddExpense,
  onOpenManageCategories,
  onClearDateFilter,
  onOpenPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('newest')

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((c) => map.set(c.id, c))
    return map
  }, [categories])

  // Active categories for filter chips (exclude Cash In so categories filter only expenses)
  const activeExpenseCategories = useMemo(() => {
    return categories.filter(
      (c) => c.is_active && c.id !== cashInCategoryId && c.name.toLowerCase() !== 'cash in'
    )
  }, [categories, cashInCategoryId])

  const isCashIn = (entry: ExpenseEntry) => {
    if (entry.title === 'Cash In' || entry.title?.startsWith('Cash In')) return true
    if (cashInCategoryId && entry.category_id === cashInCategoryId) return true
    return categoryMap.get(entry.category_id)?.name.toLowerCase() === 'cash in'
  }

  // Filter expenses for selected month or custom date range
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && endDate) {
        return e.expense_date >= startDate && e.expense_date <= endDate
      }
      if (startDate) {
        return e.expense_date >= startDate
      }
      if (endDate) {
        return e.expense_date <= endDate
      }
      return e.expense_date.startsWith(selectedMonth)
    })
  }, [expenses, selectedMonth, startDate, endDate])

  // Apply type filter, search query, category filter, and sorting
  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...monthExpenses]

    // 1. Transaction Type filter
    if (typeFilter === 'expense') {
      result = result.filter((e) => !isCashIn(e))
    } else if (typeFilter === 'cash_in') {
      result = result.filter((e) => isCashIn(e))
    }

    // 2. Search filter (paid_to, notes, category, title)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          (e.paid_to && e.paid_to.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          (categoryMap.get(e.category_id)?.name &&
            categoryMap.get(e.category_id)!.name.toLowerCase().includes(q)) ||
          (e.title && e.title.toLowerCase().includes(q))
      )
    }

    // 3. Category filter (applies when not viewing Cash In only)
    if (selectedCategoryFilter !== 'all') {
      result = result.filter((e) => e.category_id === selectedCategoryFilter)
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortOption === 'newest') {
        return b.expense_date.localeCompare(a.expense_date) || b.id.localeCompare(a.id)
      }
      if (sortOption === 'oldest') {
        return a.expense_date.localeCompare(b.expense_date) || a.id.localeCompare(b.id)
      }
      if (sortOption === 'amount_desc') {
        return b.amount - a.amount
      }
      if (sortOption === 'amount_asc') {
        return a.amount - b.amount
      }
      return 0
    })

    return result
  }, [monthExpenses, typeFilter, searchQuery, selectedCategoryFilter, sortOption, categoryMap])

  // Payment mode badge helper
  const renderPaymentModeBadge = (mode: PaymentMode) => {
    switch (mode) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote size={13} />
            <span>Cash</span>
          </span>
        )
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <QrCode size={13} />
            <span>UPI</span>
          </span>
        )
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Building2 size={13} />
            <span>Bank Transfer</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <CreditCard size={13} />
            <span className="capitalize">{mode}</span>
          </span>
        )
    }
  }

  // Category badge helper
  const renderCategoryBadge = (categoryId: string) => {
    const cat = categoryMap.get(categoryId)
    const isCatCashIn = cat?.name.toLowerCase() === 'cash in'

    if (isCatCashIn) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <ArrowDownLeft size={12} className="text-emerald-400 stroke-[2.5]" />
          <span>Cash In</span>
        </span>
      )
    }

    const name = cat?.name || 'Uncategorized'
    const color = getCategoryColor(cat)

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
        style={{
          backgroundColor: `${color}18`,
          borderColor: `${color}40`,
          color: color,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate max-w-[130px]">{name}</span>
      </span>
    )
  }

  const isCustomDateFiltered = Boolean(startDate || endDate)

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Entry Count */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Receipt size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Cash & Expense Ledger
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {filteredAndSortedExpenses.length} {filteredAndSortedExpenses.length === 1 ? 'entry' : 'entries'}
              </span>
              {isCustomDateFiltered && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span>
                    Range: {startDate || 'Start'} → {endDate || 'End'}
                  </span>
                  {onClearDateFilter && (
                    <button
                      type="button"
                      onClick={onClearDateFilter}
                      className="text-blue-300 hover:text-white transition-colors"
                      title="Clear date filter"
                    >
                      ✕
                    </button>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Detailed chronological record of all incoming funds and lab expenditures
            </p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search source, vendor, notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="appearance-none pl-8 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_desc">Amount: High to Low</option>
                <option value="amount_asc">Amount: Low to High</option>
              </select>
              <ArrowUpDown
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
            </div>

            {/* Print Statement Button */}
            {onOpenPrint && (
              <button
                type="button"
                onClick={onOpenPrint}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-center flex-shrink-0"
                title="Print Statement"
                aria-label="Print Statement"
              >
                <Printer size={16} className="text-blue-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: All Records | Expenses (Cash Out) | Cash In (Paisa Aaya) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 border-t border-slate-800/80">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              typeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Records
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              typeFilter === 'expense'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Expenses (Cash Out)</span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('cash_in')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              typeFilter === 'cash_in'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Cash In (Paisa Aaya)</span>
          </button>
        </div>

        {/* Manage Categories Link */}
        <button
          type="button"
          onClick={onOpenManageCategories}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline flex-shrink-0 self-start sm:self-auto py-1"
        >
          <SlidersHorizontal size={13} />
          <span>Manage Categories</span>
        </button>
      </div>

      {/* Category Chips (Only shown when not filtering Cash In only) */}
      {typeFilter !== 'cash_in' && activeExpenseCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategoryFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            All Expense Categories
          </button>

          {activeExpenseCategories.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-600 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Desktop / Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-950/40">
              <th className="py-3 px-4 rounded-l-xl">Date</th>
              <th className="py-3 px-4">Paid To / Received From</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Payment Mode</th>
              <th className="py-3 px-4">Notes</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center rounded-r-xl w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredAndSortedExpenses.length > 0 ? (
              filteredAndSortedExpenses.map((expense) => {
                const entryIsCashIn = isCashIn(expense)

                return (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* 1. Date */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-500" />
                        <span>{formatDisplayDate(expense.expense_date)}</span>
                      </div>
                    </td>

                    {/* 2. Paid To OR Received From */}
                    <td className="py-3.5 px-4 min-w-[170px] max-w-[230px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            entryIsCashIn ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <p
                          className={`font-semibold tracking-tight leading-snug truncate ${
                            entryIsCashIn ? 'text-emerald-300' : 'text-white'
                          }`}
                          title={expense.paid_to || (entryIsCashIn ? 'Cash In' : '—')}
                        >
                          {expense.paid_to || (entryIsCashIn ? 'Cash In' : '—')}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal pl-3">
                        {entryIsCashIn ? 'Received From' : 'Paid To'}
                      </span>
                    </td>

                    {/* 3. Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderCategoryBadge(expense.category_id)}
                    </td>

                    {/* 4. Payment Mode */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPaymentModeBadge(expense.payment_mode)}
                    </td>

                    {/* 5. Notes */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs min-w-[160px] max-w-[240px]">
                      {expense.notes ? (
                        <p className="line-clamp-2 leading-relaxed text-slate-300" title={expense.notes}>
                          {expense.notes}
                        </p>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 6. Amount (+ Green for Cash In, - Red for Expense) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap text-sm">
                      {entryIsCashIn ? (
                        <span className="font-extrabold text-emerald-400">
                          + {formatIndianCurrency(expense.amount)}
                        </span>
                      ) : (
                        <span className="font-extrabold text-rose-400">
                          - {formatIndianCurrency(expense.amount)}
                        </span>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onEditExpense(expense)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          title="Edit transaction"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(expense)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                      <FileText size={22} />
                    </div>
                    <p className="text-white font-semibold text-sm">No records found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {searchQuery || selectedCategoryFilter !== 'all' || typeFilter !== 'all' || isCustomDateFiltered
                        ? 'No records matched your search or filters. Try resetting filters.'
                        : 'No transactions recorded for this period yet.'}
                    </p>
                    {searchQuery || selectedCategoryFilter !== 'all' || typeFilter !== 'all' || isCustomDateFiltered ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedCategoryFilter('all')
                          setTypeFilter('all')
                          if (onClearDateFilter) onClearDateFilter()
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                      >
                        Reset all filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenAddExpense}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-md shadow-blue-600/30"
                      >
                        <Plus size={14} />
                        <span>Add First Record</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View */}
      <div className="block md:hidden space-y-3">
        {filteredAndSortedExpenses.length > 0 ? (
          filteredAndSortedExpenses.map((expense) => {
            const entryIsCashIn = isCashIn(expense)

            return (
              <div
                key={expense.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
              >
                {/* Top: Source/PaidTo, Date, Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          entryIsCashIn ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <h3
                        className={`font-semibold text-sm tracking-tight leading-snug ${
                          entryIsCashIn ? 'text-emerald-300' : 'text-white'
                        }`}
                      >
                        {expense.paid_to || (entryIsCashIn ? 'Cash In' : 'Expense')}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" />
                        <span>{formatDisplayDate(expense.expense_date)}</span>
                      </div>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500">
                        {entryIsCashIn ? 'Received From' : 'Paid To'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`font-extrabold text-base whitespace-nowrap ${
                      entryIsCashIn ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {entryIsCashIn ? '+ ' : '- '}
                    {formatIndianCurrency(expense.amount)}
                  </span>
                </div>

                {/* Notes if any */}
                {expense.notes && (
                  <p className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                    {expense.notes}
                  </p>
                )}

                {/* Badges & Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderCategoryBadge(expense.category_id)}
                    {renderPaymentModeBadge(expense.payment_mode)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => onEditExpense(expense)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <Pencil size={13} className="text-blue-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(expense)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-medium transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="py-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800 p-6">
            <p className="text-white font-semibold text-sm">No records found</p>
            <p className="text-slate-400 text-xs mt-1">
              {searchQuery || selectedCategoryFilter !== 'all' || typeFilter !== 'all' || isCustomDateFiltered
                ? 'Try clearing your search or filters.'
                : 'No transactions recorded for this period.'}
            </p>
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
            >
              <Plus size={14} />
              <span>Add Record</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
