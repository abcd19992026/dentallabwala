import { NavLink } from 'react-router-dom'
import { FileText, BookOpen, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTenantStore } from '@/stores/tenantStore'

/**
 * Navigation item configuration.
 * Add new sidebar items here — no changes to JSX needed.
 */
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Warranty Card',
    path: '/app/warranty-card',
    icon: FileText,
  },
  {
    label: 'Doctor Ledger',
    path: '/app/doctor-ledger',
    icon: BookOpen,
  },
]

/**
 * Sidebar — left navigation panel with branding and nav items.
 */
export function Sidebar() {
  const { tenant } = useTenantStore()

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {tenant?.name ?? 'Dental Lab Wala'}
            </p>
            <p className="text-slate-500 text-xs leading-tight">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-slate-600 text-xs font-medium uppercase tracking-wider px-3 mb-2">
          Main Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <item.icon size={18} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        <p className="text-slate-600 text-xs text-center">
          Dental Lab Wala · v1.0
        </p>
      </div>
    </aside>
  )
}
