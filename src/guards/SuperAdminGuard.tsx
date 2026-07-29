import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { USER_ROLES } from '@/types/roles'

/**
 * SuperAdminGuard — protects all /super-admin/* routes.
 * Only allows users with role === 'super_admin'.
 * Any other authenticated user is redirected to /app/dashboard.
 */
export function SuperAdminGuard() {
  const { user, role, isLoading, isInitialized } = useAuthStore()

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  if (role !== USER_ROLES.SUPER_ADMIN) {
    // Authenticated but wrong role — redirect to lab dashboard
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
