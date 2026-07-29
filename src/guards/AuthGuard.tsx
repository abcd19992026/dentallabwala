import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * AuthGuard — protects all /app/* routes.
 * If user is not authenticated, redirect to /login.
 * Shows a loading screen while the session is being initialized.
 */
export function AuthGuard() {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // While session is being resolved, show a loading screen
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Preserve the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
