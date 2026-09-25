import React, { useState, useMemo } from 'react'
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Layers,
  ArrowRightLeft,
  Info,
} from 'lucide-react'
import type { ExpenseEntry, Category } from '../types'
import { formatIndianCurrency, getPreviousMonth, formatShortMonth } from '../utils/currencyFormatter'
import { getCategoryColor } from '../utils/categoryColors'
import {
  filterByMonth,
  sumAmounts,
  getDaysElapsedInMonth,
  getClampedSamePeriodDay,
  getPercentageChange,
  getTopCategories,
  isCurrentMonth,
} from '../utils/calculations'

interface ComparisonChartProps {
  selectedMonth: string // YYYY-MM
  expenses: ExpenseEntry[]
  categories: Category[]
  referenceDate?: Date
}

type ComparisonMode = 'same_period' | 'full_month'

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  selectedMonth,
  expenses,
  categories,
  referenceDate = new Date(),
}) => {
  const [mode, setMode] = useState<ComparisonMode>('same_period')
  const [hoveredBar, setHoveredBar] = useState<'prev' | 'curr' | null>(null)

  const prevMonthStr = getPreviousMonth(selectedMonth)
  const currentDaysElapsed = getDaysElapsedInMonth(selectedMonth, referenceDate)

  // "Same period" only makes sense for the month that's still in progress —
  // for any past month we always compare the full month vs the full
  // previous month, and the toggle is hidden rather than left showing a
  // choice that isn't really available.
  const viewingCurrentMonth = isCurrentMonth(selectedMonth, referenceDate)
  const effectiveMode: ComparisonMode = viewingCurrentMonth ? mode : 'full_month'

  // The previous month may have fewer days than the current one (e.g.
  // comparing 30 Mar against Feb) — clamp so we never reference a day
  // that doesn't exist.
  const prevSamePeriodDay = getClampedSamePeriodDay(currentDaysElapsed, prevMonthStr)

  const currentMonthEntries = useMemo(
    () => filterByMonth(expenses, selectedMonth),
    [expenses, selectedMonth]
  )

  const currentSamePeriodEntries = useMemo(() => {
    return currentMonthEntries.filter((e) => {
      const day = parseInt(e.expense_date.split('-')[2], 10)
      return day <= currentDaysElapsed
    })
  }, [currentMonthEntries, currentDaysElapsed])

  const prevMonthEntries = useMemo(
    () => filterByMonth(expenses, prevMonthStr),
    [expenses, prevMonthStr]
  )

  const prevSamePeriodEntries = useMemo(() => {
    return prevMonthEntries.filter((e) => {
      const day = parseInt(e.expense_date.split('-')[2], 10)
      return day <= prevSamePeriodDay
    })
  }, [prevMonthEntries, prevSamePeriodDay])

  // Active entries based on the effective mode
  const activeCurrEntries = effectiveMode === 'same_period' ? currentSamePeriodEntries : currentMonthEntries
  const activePrevEntries = effectiveMode === 'same_period' ? prevSamePeriodEntries : prevMonthEntries

  const currTotal = useMemo(() => sumAmounts(activeCurrEntries), [activeCurrEntries])
  const prevTotal = useMemo(() => sumAmounts(activePrevEntries), [activePrevEntries])

  // Percentage change: a decrease is good (green), an increase is bad (red).
  // null (never Infinity/NaN) when there's no previous-period baseline.
  const percentChange = useMemo(() => getPercentageChange(currTotal, prevTotal), [currTotal, prevTotal])

  const currTopCategories = useMemo(
    () => getTopCategories(activeCurrEntries, categories, 3).map((item) => ({ ...item, color: getCategoryColor(item) })),
    [activeCurrEntries, categories]
  )
  const prevTopCategories = useMemo(
    () => getTopCategories(activePrevEntries, categories, 3).map((item) => ({ ...item, color: getCategoryColor(item) })),
    [activePrevEntries, categories]
  )

  // Max value for bar heights scaling
  const maxVal = Math.max(currTotal, prevTotal, 1000)
  const prevBarHeightPct = prevTotal > 0 ? Math.max((prevTotal / maxVal) * 100, 8) : 0
  const currBarHeightPct = currTotal > 0 ? Math.max((currTotal / maxVal) * 100, 8) : 0

  // Date range caption
  const currMonthLabel = formatShortMonth(selectedMonth)
  const prevMonthLabel = formatShortMonth(prevMonthStr)

  const captionText = useMemo(() => {
    if (effectiveMode === 'same_period') {
      return `Comparing 1 ${currMonthLabel} – ${currentDaysElapsed} ${currMonthLabel} vs 1 ${prevMonthLabel} – ${prevSamePeriodDay} ${prevMonthLabel}`
    }
    return `Comparing full month of ${currMonthLabel} vs ${prevMonthLabel}`
  }, [effectiveMode, currMonthLabel, prevMonthLabel, currentDaysElapsed, prevSamePeriodDay])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ArrowRightLeft size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                This Month vs Last Month
              </h3>
              <p className="text-xs text-slate-400">
                Compare expenditure trends over time
              </p>
            </div>
          </div>

          {/* Same period vs Full month Toggle — only meaningful for the
              month that's still in progress; hidden for past months, which
              always compare full month vs full previous month. */}
          {viewingCurrentMonth && (
            <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMode('same_period')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === 'same_period'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Same period
              </button>
              <button
                type="button"
                onClick={() => setMode('full_month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === 'full_month'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full month
              </button>
            </div>
          )}
        </div>

        {/* Change badge */}
        {percentChange !== null && prevTotal > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                percentChange < 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : percentChange > 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}
            >
              {percentChange < 0 ? (
                <>
                  <TrendingDown size={14} className="stroke-[2.5]" />
                  <span>▼ {Math.abs(percentChange).toFixed(1)}% lower</span>
                </>
              ) : percentChange > 0 ? (
                <>
                  <TrendingUp size={14} className="stroke-[2.5]" />
                  <span>▲ {percentChange.toFixed(1)}% higher</span>
                </>
              ) : (
                <>
                  <Minus size={14} />
                  <span>0.0% unchanged</span>
                </>
              )}
            </span>
            <span className="text-xs text-slate-400">
              {percentChange < 0 ? 'Cost savings vs previous month' : 'Higher spending vs previous month'}
            </span>
          </div>
        )}
      </div>

      {/* Visual Bar Comparison Area */}
      <div className="my-auto py-6">
        <div className="relative h-56 w-full flex items-end justify-center gap-8 sm:gap-16 px-4 pb-2 pt-8 border-b border-slate-800/80">
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-15">
            <div className="border-b border-slate-700 w-full" />
            <div className="border-b border-slate-700 w-full" />
            <div className="border-b border-slate-700 w-full" />
          </div>

          {/* 1. Previous Month Bar */}
          {prevTotal > 0 ? (
            <div
              className="relative flex flex-col items-center h-full justify-end group cursor-pointer w-24 sm:w-32"
              onMouseEnter={() => setHoveredBar('prev')}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Amount Label Above Bar */}
              <div className="mb-2 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-slate-300 font-bold text-xs shadow-md whitespace-nowrap group-hover:border-slate-600 transition-colors">
                {formatIndianCurrency(prevTotal)}
              </div>

              {/* Vertical Bar */}
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-slate-700 to-slate-500 transition-all duration-500 ease-out shadow-lg group-hover:brightness-110 relative"
                style={{ height: `${prevBarHeightPct}%` }}
              >
                <div className="absolute inset-0 bg-white/5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Month Label */}
              <span className="mt-3 text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                {prevMonthLabel} (Prev)
              </span>

              {/* Hover Tooltip: Top 3 Categories */}
              {hoveredBar === 'prev' && (
                <div className="absolute -top-24 sm:-top-28 z-30 w-52 sm:w-60 p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                    <span>{prevMonthLabel} Breakdown</span>
                    <span className="text-slate-400 font-normal">{formatIndianCurrency(prevTotal)}</span>
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                    Top Categories:
                  </p>
                  <div className="space-y-1">
                    {prevTopCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-300 truncate">{cat.name}</span>
                        </div>
                        <span className="text-slate-200 font-medium">
                          {formatIndianCurrency(cat.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-end h-full w-24 sm:w-32 pb-4 text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-500 mb-2">
                <Info size={16} className="mx-auto" />
              </div>
              <span className="text-[11px] text-slate-500 leading-tight">
                No data for previous month yet
              </span>
            </div>
          )}

          {/* 2. Current Month Bar */}
          <div
            className="relative flex flex-col items-center h-full justify-end group cursor-pointer w-24 sm:w-32"
            onMouseEnter={() => setHoveredBar('curr')}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {/* Amount Label Above Bar */}
            <div className="mb-2 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold text-xs shadow-lg shadow-blue-500/10 whitespace-nowrap group-hover:border-blue-400 transition-colors">
              {formatIndianCurrency(currTotal)}
            </div>

            {/* Vertical Bar with Brand Gradient */}
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400 transition-all duration-500 ease-out shadow-lg shadow-blue-600/20 group-hover:brightness-110 relative"
              style={{ height: `${currBarHeightPct}%` }}
            >
              <div className="absolute inset-0 bg-white/10 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Month Label */}
            <span className="mt-3 text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
              {currMonthLabel} (Selected)
            </span>

            {/* Hover Tooltip: Top 3 Categories */}
            {hoveredBar === 'curr' && (
              <div className="absolute -top-24 sm:-top-28 z-30 w-52 sm:w-60 p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                <p className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                  <span>{currMonthLabel} Breakdown</span>
                  <span className="text-blue-400 font-bold">{formatIndianCurrency(currTotal)}</span>
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Top Categories:
                </p>
                <div className="space-y-1">
                  {currTopCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-300 truncate">{cat.name}</span>
                      </div>
                      <span className="text-slate-200 font-medium">
                        {formatIndianCurrency(cat.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <Layers size={13} className="text-slate-500 flex-shrink-0" />
          <span className="truncate">{captionText}</span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline-block">
          Hover over bars for details
        </span>
      </div>
    </div>
  )
}
