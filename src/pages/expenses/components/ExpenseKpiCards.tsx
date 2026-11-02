import React from 'react'
import {
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
} from 'lucide-react'
import type { ExpenseEntry, Category } from '../types'
import { formatIndianCurrency } from '../utils/currencyFormatter'
import {
  filterByMonth,
  sumAmounts,
  getDaysElapsedInMonth,
  getDailyAverage,
  getTopCategories,
} from '../utils/calculations'

interface ExpenseKpiCardsProps {
  selectedMonth: string // YYYY-MM
  startDate?: string
  endDate?: string
  expenses: ExpenseEntry[]
  categories: Category[]
  cashInCategoryId?: string
  referenceDate?: Date
}

export const ExpenseKpiCards: React.FC<ExpenseKpiCardsProps> = ({
  selectedMonth,
  startDate,
  endDate,
  expenses,
  categories,
  cashInCategoryId,
  referenceDate = new Date(),
}) => {

  // Filter current selected month or date range entries
  const currentEntries = React.useMemo(() => {
    if (startDate || endDate) {
      return expenses.filter((e) => {
        if (startDate && e.expense_date < startDate) return false
        if (endDate && e.expense_date > endDate) return false
        return true
      })
    }
    return filterByMonth(expenses, selectedMonth)
  }, [expenses, selectedMonth, startDate, endDate])

  // Helper to test if entry is Cash In
  const isCashIn = React.useCallback(
    (e: ExpenseEntry) => {
      if (e.title === 'Cash In' || e.title?.startsWith('Cash In')) return true
      if (cashInCategoryId && e.category_id === cashInCategoryId) return true
      const cat = categories.find((c) => c.id === e.category_id)
      return cat?.name.toLowerCase() === 'cash in'
    },
    [cashInCategoryId, categories]
  )

  // Separate Cash In vs Expense entries
  const cashInEntries = React.useMemo(() => currentEntries.filter(isCashIn), [currentEntries, isCashIn])
  const expenseEntries = React.useMemo(() => currentEntries.filter((e) => !isCashIn(e)), [currentEntries, isCashIn])

  // Totals
  const totalCashIn = React.useMemo(() => sumAmounts(cashInEntries), [cashInEntries])
  const totalExpense = React.useMemo(() => sumAmounts(expenseEntries), [expenseEntries])
  const netBalance = totalCashIn - totalExpense

  // Daily Average calculation (based on expenses only)
  const daysElapsed = getDaysElapsedInMonth(selectedMonth, referenceDate)
  const dailyAverage = getDailyAverage(totalExpense, daysElapsed)

  // Top Category for expenses
  const topCategories = React.useMemo(
    () => getTopCategories(expenseEntries, categories, 1),
    [expenseEntries, categories]
  )
  const topCategory1 = topCategories[0] || null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Cash In Card (Vibrant Emerald / Green Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#0a201b]/95 to-[#070b14] border-2 border-emerald-400/80 p-5 shadow-[0_0_25px_rgba(16,185,129,0.35),inset_0_0_30px_rgba(16,185,129,0.18)] transition-all duration-300 hover:border-emerald-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.5),inset_0_0_35px_rgba(16,185,129,0.25)] group">
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_60%,rgba(16,185,129,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform">
            <ArrowDownLeft size={22} className="stroke-[2.5]" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            Funds In
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            {formatIndianCurrency(totalCashIn)}
          </p>
          <p className="text-emerald-100/90 font-medium text-sm mt-1">Total Cash In</p>
          <p className="text-slate-300 text-xs mt-0.5">
            {cashInEntries.length > 0
              ? `${cashInEntries.length} ${cashInEntries.length === 1 ? 'inflow record' : 'inflow records'}`
              : 'No funds added yet'}
          </p>
        </div>
      </div>

      {/* 2. Total Expenses Card (Vibrant Amber / Gold Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/60 via-[#151722]/95 to-[#070b14] border-2 border-amber-400/80 p-5 shadow-[0_0_25px_rgba(245,158,11,0.35),inset_0_0_30px_rgba(245,158,11,0.18)] transition-all duration-300 hover:border-amber-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.5),inset_0_0_35px_rgba(245,158,11,0.25)] group">
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_60%,rgba(245,158,11,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform">
            <ArrowUpRight size={22} className="stroke-[2.5]" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            Payouts
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            {formatIndianCurrency(totalExpense)}
          </p>
          <p className="text-amber-100/90 font-medium text-sm mt-1">Total Expenses</p>
          <p className="text-slate-300 text-xs mt-0.5 truncate" title={topCategory1 ? `Top: ${topCategory1.name} (${topCategory1.percentage.toFixed(0)}%)` : ''}>
            {topCategory1 ? (
              <span className="text-amber-200/90 font-medium">
                Top: {topCategory1.name} ({topCategory1.percentage.toFixed(0)}%)
              </span>
            ) : (
              'All operational payouts'
            )}
          </p>
        </div>
      </div>

      {/* 3. Net In Hand Balance Card (Vibrant Cyan / Blue Theme, or Rose if Negative) */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300 group ${
          netBalance >= 0
            ? 'bg-gradient-to-br from-cyan-950/60 via-[#0c1a29]/95 to-[#070b14] border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_0_30px_rgba(6,182,212,0.18)] hover:border-cyan-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.5),inset_0_0_35px_rgba(6,182,212,0.25)]'
            : 'bg-gradient-to-br from-rose-950/60 via-[#1f1015]/95 to-[#070b14] border-rose-400/80 shadow-[0_0_25px_rgba(244,63,94,0.35),inset_0_0_30px_rgba(244,63,94,0.18)] hover:border-rose-300 hover:shadow-[0_0_35px_rgba(244,63,94,0.5),inset_0_0_35px_rgba(244,63,94,0.25)]'
        }`}
      >
        <div
          className={`absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            netBalance >= 0 ? 'bg-cyan-500/30' : 'bg-rose-500/30'
          }`}
        />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${
              netBalance >= 0
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                : 'bg-rose-500/20 border-rose-400/60 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
            }`}
          >
            <Coins size={20} />
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-md ${
              netBalance >= 0
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            }`}
          >
            {netBalance >= 0 ? 'In Hand' : 'Overspent'}
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            {formatIndianCurrency(netBalance)}
          </p>
          <p
            className={`font-medium text-sm mt-1 ${
              netBalance >= 0 ? 'text-cyan-100/90' : 'text-rose-200/90'
            }`}
          >
            Balance in Hand
          </p>
          <p className="text-slate-300 text-xs mt-0.5">
            {netBalance >= 0 ? 'Surplus cash remaining' : 'Expenses exceed funds added'}
          </p>
        </div>
      </div>

      {/* 4. Daily Average Card (Green Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#0a201b]/95 to-[#070b14] border-2 border-emerald-400/80 p-5 shadow-[0_0_25px_rgba(16,185,129,0.35),inset_0_0_30px_rgba(16,185,129,0.18)] transition-all duration-300 hover:border-emerald-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.5),inset_0_0_35px_rgba(16,185,129,0.25)] group">
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_60%,rgba(16,185,129,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform">
            <Calendar size={20} />
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            {daysElapsed} {daysElapsed === 1 ? 'day' : 'days'}
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            {formatIndianCurrency(dailyAverage)}
            <span className="text-sm font-normal text-emerald-200/80 ml-1">/day</span>
          </p>
          <p className="text-emerald-100/90 font-medium text-sm mt-1">Daily Average</p>
          <p className="text-slate-300 text-xs mt-0.5">
            Based on {daysElapsed} days elapsed in month
          </p>
        </div>
      </div>
    </div>
  )
}
