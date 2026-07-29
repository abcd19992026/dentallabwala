import { Outlet } from 'react-router-dom'
import { useAuthInitializer } from '@/features/auth/hooks/useAuthInitializer'

/**
 * AppRoot — the top-level route element rendered by all routes.
 * Calls useAuthInitializer, which must live inside RouterProvider
 * to have access to React Router's context (useNavigate, etc.).
 *
 * This component renders as the root layout for the entire app.
 */
export function AppRoot() {
  useAuthInitializer()
  return <Outlet />
}
