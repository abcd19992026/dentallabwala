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
      {/* 1. Total Expenses Card (Vibrant Amber / Gold Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/60 via-[#151722]/95 to-[#070b14] border-2 border-amber-400/80 p-5 shadow-[0_0_25px_rgba(245,158,11,0.35),inset_0_0_30px_rgba(245,158,11,0.18)] transition-all duration-300 hover:border-amber-300 hover:shadow-[0_0_35px_rgba(245,158,11,0.5),inset_0_0_35px_rgba(245,158,11,0.25)] group">
        {/* Luminous atmospheric lighting */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_60%,rgba(245,158,11,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform">
            <Wallet size={20} />
          </div>

          {percentageChange !== null ? (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm ${
                percentageChange < 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : percentageChange > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                  : 'bg-slate-500/20 text-slate-300 border-slate-400/60'
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
            <span className="text-[11px] text-amber-200/80 font-medium">vs last month</span>
          )}
        </div>

        <div className="relative z-10">
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            {formatIndianCurrency(currentTotal)}
          </p>
          <p className="text-amber-100/90 font-medium text-sm mt-1">Total Expenses</p>
          <p className="text-slate-300 text-xs mt-0.5">
            {percentageChange !== null ? (
              percentageChange < 0 ? (
                <span className="text-emerald-400 font-medium">
                  {Math.abs(percentageChange).toFixed(1)}% lower than {formatShortMonth(prevMonthStr)}
                </span>
              ) : percentageChange > 0 ? (
                <span className="text-rose-400 font-medium">
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
      </div>

      {/* 2. Top Category #1 (Vibrant Cyan / Sky Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/60 via-[#0c1a29]/95 to-[#070b14] border-2 border-cyan-400/80 p-5 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_0_30px_rgba(6,182,212,0.18)] transition-all duration-300 hover:border-cyan-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.5),inset_0_0_35px_rgba(6,182,212,0.25)] group">
        {/* Luminous atmospheric lighting */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_60%,rgba(6,182,212,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform">
            <Award size={20} />
          </div>
          {topCategory1 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              {topCategory1.percentage.toFixed(1)}% of total
            </span>
          )}
        </div>

        <div className="relative z-10">
          {topCategory1 ? (
            <>
              <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate drop-shadow-sm">
                {topCategory1.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-cyan-100 font-semibold text-sm">
                  {formatIndianCurrency(topCategory1.amount)}
                </span>
                <span className="w-2 h-2 rounded-full ring-2 ring-cyan-400/40" style={{ backgroundColor: topCategory1.color }} />
              </div>
              <p className="text-slate-300 text-xs mt-1">Primary expense category</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-400">—</p>
              <p className="text-cyan-100/90 text-sm mt-1">Top Category #1</p>
              <p className="text-slate-400 text-xs mt-0.5">No expenses recorded yet</p>
            </>
          )}
        </div>
      </div>

      {/* 3. Top Category #2 (Vibrant Purple / Violet Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950/60 via-[#19112a]/95 to-[#070b14] border-2 border-purple-400/80 p-5 shadow-[0_0_25px_rgba(168,85,247,0.35),inset_0_0_30px_rgba(168,85,247,0.18)] transition-all duration-300 hover:border-purple-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.5),inset_0_0_35px_rgba(168,85,247,0.25)] group">
        {/* Luminous atmospheric lighting */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_60%,rgba(168,85,247,0.22),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.35)] group-hover:scale-105 transition-transform">
            <PieChart size={20} />
          </div>
          {topCategory2 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/25 text-purple-200 border border-purple-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              {topCategory2.percentage.toFixed(1)}% of total
            </span>
          )}
        </div>

        <div className="relative z-10">
          {topCategory2 ? (
            <>
              <p className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate drop-shadow-sm">
                {topCategory2.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-100 font-semibold text-sm">
                  {formatIndianCurrency(topCategory2.amount)}
                </span>
                <span className="w-2 h-2 rounded-full ring-2 ring-purple-400/40" style={{ backgroundColor: topCategory2.color }} />
              </div>
              <p className="text-slate-300 text-xs mt-1">Secondary expense category</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-400">—</p>
              <p className="text-purple-100/90 text-sm mt-1">Top Category #2</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {topCategory1 ? 'Only 1 category recorded' : 'No expenses recorded'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* 4. Daily Average (Vibrant Emerald / Green Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#0a201b]/95 to-[#070b14] border-2 border-emerald-400/80 p-5 shadow-[0_0_25px_rgba(16,185,129,0.35),inset_0_0_30px_rgba(16,185,129,0.18)] transition-all duration-300 hover:border-emerald-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.5),inset_0_0_35px_rgba(16,185,129,0.25)] group">
        {/* Luminous atmospheric lighting */}
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


