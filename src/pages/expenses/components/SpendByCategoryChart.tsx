import React, { useMemo, useState } from 'react'
import { PieChart as PieIcon, Layers, Info } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ExpenseEntry, Category } from '../types'
import { formatIndianCurrency } from '../utils/currencyFormatter'
import { getCategoryColor } from '../utils/categoryColors'
import { filterByMonth, sumAmounts, getCategoryBreakdown } from '../utils/calculations'

interface SpendByCategoryChartProps {
  selectedMonth: string // YYYY-MM
  expenses: ExpenseEntry[]
  categories: Category[]
}

interface ChartItem {
  id: string
  name: string
  amount: number
  percentage: number
  color: string
}

export const SpendByCategoryChart: React.FC<SpendByCategoryChartProps> = ({
  selectedMonth,
  expenses,
  categories,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const currentMonthExpenses = useMemo(
    () => filterByMonth(expenses, selectedMonth),
    [expenses, selectedMonth]
  )

  const totalSpend = useMemo(() => sumAmounts(currentMonthExpenses), [currentMonthExpenses])

  // Deterministic sort (amount desc, tie-broken by name/id); categories
  // with zero spend never appear since there's nothing to sum for them.
  const chartData: ChartItem[] = useMemo(() => {
    if (totalSpend === 0) return []
    return getCategoryBreakdown(currentMonthExpenses, categories).map((item) => ({
      ...item,
      color: getCategoryColor(item),
    }))
  }, [currentMonthExpenses, categories, totalSpend])

  // Custom tooltip
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartItem = payload[0].payload
      return (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-xs font-bold text-white">{data.name}</span>
          </div>
          <p className="text-sm font-extrabold text-blue-400">
            {formatIndianCurrency(data.amount)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {data.percentage.toFixed(1)}% of month total
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <PieIcon size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Spend by Category
              </h3>
              <p className="text-xs text-slate-400">
                Categorical expense distribution
              </p>
            </div>
          </div>
          {chartData.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {chartData.length} {chartData.length === 1 ? 'category' : 'categories'}
            </span>
          )}
        </div>
      </div>

      {/* Donut Chart with Center Total & Legend */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-auto py-2">
          {/* Donut graphic */}
          <div className="sm:col-span-6 relative flex items-center justify-center h-48 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={renderCustomTooltip} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="amount"
                  stroke="none"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: activeIndex === index ? 'drop-shadow(0px 0px 8px rgba(255,255,255,0.4))' : 'none',
                        transform: activeIndex === index ? 'scale(1.04)' : 'scale(1)',
                        transformOrigin: 'center center',
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Total In Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Spend
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight">
                {formatIndianCurrency(totalSpend)}
              </span>
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="sm:col-span-6 max-h-52 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {chartData.map((item, index) => (
              <div
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all text-xs cursor-pointer border ${
                  activeIndex === index
                    ? 'bg-slate-800/90 border-slate-700 shadow-md'
                    : 'bg-slate-950/40 border-transparent hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300 font-medium truncate">
                    {item.name}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-white font-bold block">
                    {formatIndianCurrency(item.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-dashed border-slate-800 flex items-center justify-center text-slate-500 mb-3">
            <Info size={20} />
          </div>
          <p className="text-slate-400 font-medium text-sm">No expenses in this month</p>
          <p className="text-slate-500 text-xs mt-1">Add expenses to see category distribution</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <Layers size={13} className="text-slate-500 flex-shrink-0" />
          <span>Category Share Breakdown</span>
        </div>
        <span className="text-[10px] text-slate-500">
          {chartData.length} active segments
        </span>
      </div>
    </div>
  )
}
