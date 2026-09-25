import React from 'react'
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  PieChart,
  Award,
  Calendar,
  Minus,
} from 'lucide-react'
import type { ExpenseEntry, Category } from '../types'
import { formatIndianCurrency, getPreviousMonth, formatShortMonth } from '../utils/currencyFormatter'
import { getCategoryColor } from '../utils/categoryColors'
import {
  filterByMonth,
  sumAmounts,
  getDaysElapsedInMonth,
  getPercentageChange,
  getDailyAverage,
  getTopCategories,
} from '../utils/calculations'

interface ExpenseKpiCardsProps {
  selectedMonth: string // YYYY-MM
  expenses: ExpenseEntry[]
  categories: Category[]
  referenceDate?: Date
}

export const ExpenseKpiCards: React.FC<ExpenseKpiCardsProps> = ({
  selectedMonth,
  expenses,
  categories,
  referenceDate = new Date(),
}) => {
  // Filter current selected month expenses
  const currentMonthExpenses = React.useMemo(
    () => filterByMonth(expenses, selectedMonth),
    [expenses, selectedMonth]
  )

  // Current month total
  const currentTotal = React.useMemo(() => sumAmounts(currentMonthExpenses), [currentMonthExpenses])

  // Previous month expenses & total
  const prevMonthStr = getPreviousMonth(selectedMonth)
  const prevMonthExpenses = React.useMemo(
    () => filterByMonth(expenses, prevMonthStr),
    [expenses, prevMonthStr]
  )
  const prevTotal = React.useMemo(() => sumAmounts(prevMonthExpenses), [prevMonthExpenses])

  // Percentage change vs previous month (null when there's no previous
  // baseline — a DECREASE is good/green, an INCREASE is bad/red)
  const percentageChange = React.useMemo(
    () => getPercentageChange(currentTotal, prevTotal),
    [currentTotal, prevTotal]
  )

  // Top categories for the selected month, with a deterministic tie-break
  const topCategories = React.useMemo(
    () =>
      getTopCategories(currentMonthExpenses, categories, 2).map((item) => ({
        ...item,
        color: getCategoryColor(item),
      })),
    [currentMonthExpenses, categories]
  )

  const topCategory1 = topCategories[0] || null
  const topCategory2 = topCategories[1] || null

  // Daily Average calculation
  const daysElapsed = getDaysElapsedInMonth(selectedMonth, referenceDate)
  const dailyAverage = getDailyAverage(currentTotal, daysElapsed)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Expenses Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-lg transition-all duration-200 hover:border-slate-700/80 hover:shadow-blue-500/5 group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Wallet size={20} />
          </div>

          {percentageChange !== null ? (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                percentageChange < 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : percentageChange > 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
              }`}
              title={`Previous month: ${formatIndianCurrency(prevTotal)}`}
            >
              {percentageChange < 0 ? (
                <>
                  <TrendingDown size={13} className="stroke-[2.5]" />
                  <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                </>
              ) : percentageChange > 0 ? (
                <>
                  <TrendingUp size={13} className="stroke-[2.5]" />
                  <span>+{percentageChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <Minus size={13} />
                  <span>0.0%</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">vs last month</span>
          )}
        </div>

        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {formatIndianCurrency(currentTotal)}
        </p>
        <p className="text-slate-300 font-medium text-sm mt-1">Total Expenses</p>
        <p className="text-slate-500 text-xs mt-0.5">
          {percentageChange !== null ? (
            percentageChange < 0 ? (
              <span className="text-emerald-400/90">
                {Math.abs(percentageChange).toFixed(1)}% lower than {formatShortMonth(prevMonthStr)}
              </span>
            ) : percentageChange > 0 ? (
              <span className="text-rose-400/90">
                {percentageChange.toFixed(1)}% higher than {formatShortMonth(prevMonthStr)}
              </span>
            ) : (
              `Equal to ${formatShortMonth(prevMonthStr)}`
            )
          ) : (
            `No data recorded for ${formatShortMonth(prevMonthStr)}`
          )}
        </p>
      </div>

      {/* 2. Top Category #1 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-lg transition-all duration-200 hover:border-slate-700/80 group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
            <Award size={20} />
          </div>
          {topCategory1 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {topCategory1.percentage.toFixed(1)}% of total
            </span>
          )}
        </div>

        {topCategory1 ? (
          <>
            <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {topCategory1.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-300 font-semibold text-sm">
                {formatIndianCurrency(topCategory1.amount)}
              </span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topCategory1.color }} />
            </div>
            <p className="text-slate-500 text-xs mt-1">Primary expense category</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-500">—</p>
            <p className="text-slate-400 text-sm mt-1">Top Category #1</p>
            <p className="text-slate-500 text-xs mt-0.5">No expenses recorded yet</p>
          </>
        )}
      </div>

      {/* 3. Top Category #2 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-lg transition-all duration-200 hover:border-slate-700/80 group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
            <PieChart size={20} />
          </div>
          {topCategory2 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {topCategory2.percentage.toFixed(1)}% of total
            </span>
          )}
        </div>

        {topCategory2 ? (
          <>
            <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {topCategory2.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-300 font-semibold text-sm">
                {formatIndianCurrency(topCategory2.amount)}
              </span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topCategory2.color }} />
            </div>
            <p className="text-slate-500 text-xs mt-1">Secondary expense category</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-500">—</p>
            <p className="text-slate-400 text-sm mt-1">Top Category #2</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {topCategory1 ? 'Only 1 category recorded' : 'No expenses recorded'}
            </p>
          </>
        )}
      </div>

      {/* 4. Daily Average */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-lg transition-all duration-200 hover:border-slate-700/80 group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Calendar size={20} />
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {daysElapsed} {daysElapsed === 1 ? 'day' : 'days'}
          </span>
        </div>

        <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {formatIndianCurrency(dailyAverage)}
          <span className="text-sm font-normal text-slate-400 ml-1">/day</span>
        </p>
        <p className="text-slate-300 font-medium text-sm mt-1">Daily Average</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Based on {daysElapsed} days elapsed in month
        </p>
      </div>
    </div>
  )
}
