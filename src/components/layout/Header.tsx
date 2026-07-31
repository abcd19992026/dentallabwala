import { LogOut, User, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'

interface HeaderProps {
  onMenuClick?: () => void
}

/**
 * Header — top navigation bar showing lab name, user avatar, and logout.
 */
export function Header({ onMenuClick }: HeaderProps) {
  const { logout } = useAuth()
  const { user } = useAuthStore()
  const { tenant } = useTenantStore()

  const userEmail = user?.email ?? ''
  const displayName = userEmail.split('@')[0] ?? 'User'

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: Menu button (mobile) + Page context / Lab name */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — visible only on mobile */}
        <button
          onClick={onMenuClick}
          className="md:hidden text-slate-300 hover:text-white transition-colors flex-shrink-0"
          title="Open Menu"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="text-white font-semibold text-base leading-tight truncate">
            {tenant?.name ?? 'Dental Lab Wala'}
          </h1>
          <p className="text-slate-500 text-xs">Management Portal</p>
        </div>
      </div>

      {/* Right: User info + Logout */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* User pill */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span className="text-slate-300 text-sm font-medium capitalize hidden sm:inline">
            {displayName}
          </span>
          <ChevronDown size={14} className="text-slate-500" />
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          <LogOut size={16} />
          <span className="text-sm hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
