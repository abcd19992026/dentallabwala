import { Link } from 'react-router-dom'
import {
  Receipt,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  FileSpreadsheet,
  Layers,
} from 'lucide-react'

/**
 * ExpensesPage — route: /app/expenses
 * Placeholder / Under Process page for the upcoming Expenses module.
 */
export default function ExpensesPage() {
  const upcomingFeatures = [
    {
      icon: TrendingDown,
      title: 'Daily Lab Expenses',
      description: 'Record petty cash, utility bills, courier charges, and day-to-day lab operating costs.',
    },
    {
      icon: ShoppingBag,
      title: 'Material & Vendor Payments',
      description: 'Track raw material purchases, dental consumable suppliers, and payment dues.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Detailed Expense Reports',
      description: 'Generate monthly expense breakdowns, category analytics, and exportable financial summaries.',
    },
    {
      icon: Layers,
      title: 'Category & Budget Management',
      description: 'Organize expenses by customized categories and stay on top of lab budgets.',
    },
  ]

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Expenses</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock size={12} className="animate-pulse" />
              Under Process
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Track, categorize, and manage your dental laboratory expenses.
          </p>
        </div>

        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700/60 w-fit"
        >
          <span>Back to Dashboard</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Hero Notice Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border border-slate-800 p-8 sm:p-10 shadow-xl">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 border border-amber-500/30 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/5">
            <Receipt className="w-8 h-8 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Sparkles size={13} />
            <span>Feature in Progress</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Expenses Module is Currently Under Development
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3">
            We are actively building the Expenses Management system for Dentivo. This feature will enable you to effortlessly monitor operational spending, log supplier invoices, track staff payouts, and maintain accurate financial health for your laboratory.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 text-xs font-medium">
              🚀 Launching Soon in an Upcoming Update
            </div>
          </div>
        </div>
      </div>

      {/* Planned Capabilities Preview */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">What to Expect in This Module</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Here is a preview of the capabilities that will be available once the Expenses module goes live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/60 text-blue-400 flex-shrink-0">
                <feature.icon size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
