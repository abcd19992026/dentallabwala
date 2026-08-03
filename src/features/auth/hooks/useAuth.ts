import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { signIn, signOut, fetchUserProfile } from '@/features/auth/services/auth.service'
import { USER_ROLES, type UserRole } from '@/types/roles'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * useAuth — the primary hook for authentication actions in components.
 */
export function useAuth() {
  const { user, role, labId, isLoading, isInitialized, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN
  const isLabUser = role === USER_ROLES.LAB_USER
  const isAuthenticated = !!user

  /**
   * Login handler — performs Supabase Authentication, reads `profiles` table,
   * verifies user role, and redirects. Handles database & 404 errors cleanly without resetting forms.
   */
  const login = useCallback(
    async (email: string, password: string, expectedRole?: string) => {
      setError(null)
      setIsSubmitting(true)

      try {
        if (isSupabaseConfigured) {
          // 1. Supabase Authentication
          const authData = await signIn(email, password)
          const authUser = authData.user

          if (!authUser) {
            throw new Error('Authentication succeeded but user session could not be established.')
          }

          // 2. Read profiles table
          const profile = await fetchUserProfile(authUser.id)

          // 3. Verify user role if expected (super_admin vs lab_user)
          if (expectedRole && profile.role !== expectedRole) {
            await signOut()
            if (expectedRole === USER_ROLES.SUPER_ADMIN) {
              throw new Error('Access Denied: This account is not authorized as a Super Admin.')
            } else {
              throw new Error('Access Denied: This account is not registered as a Dental Lab User.')
            }
          }

          // 4. Update auth store
          useAuthStore.getState().setUser(authUser)
          useAuthStore.getState().setRole(profile.role)
          useAuthStore.getState().setLabId(profile.labId)
          useAuthStore.getState().setIsInitialized(true)

          // 5. Redirect based on role
          if (profile.role === USER_ROLES.SUPER_ADMIN) {
            navigate('/super-admin/dashboard', { replace: true })
          } else {
            navigate('/app/dashboard', { replace: true })
          }
        } else {
          // Fallback for unconfigured / demo environment
          const targetRole = (expectedRole as UserRole) || USER_ROLES.LAB_USER
          useAuthStore.getState().setUser({
            id: targetRole === USER_ROLES.SUPER_ADMIN ? 'admin-mock-id' : 'lab-mock-id',
            email: email || (targetRole === USER_ROLES.SUPER_ADMIN ? 'admin@dentivo.com' : 'lab@example.com'),
          } as any)
          useAuthStore.getState().setRole(targetRole)
          useAuthStore.getState().setLabId(targetRole === USER_ROLES.SUPER_ADMIN ? null : 'lab-demo-123')
          useAuthStore.getState().setIsInitialized(true)

          if (targetRole === USER_ROLES.SUPER_ADMIN) {
            navigate('/super-admin/dashboard', { replace: true })
          } else {
            navigate('/app/dashboard', { replace: true })
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'An unexpected authentication error occurred.'
        setError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [navigate]
  )

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await signOut()
      }
      clearAuth()
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      console.error('Logout failed:', err)
      clearAuth()
      navigate('/login', { replace: true })
    }
  }, [clearAuth, navigate])

  return {
    user,
    role,
    labId,
    isLoading,
    isInitialized,
    isAuthenticated,
    isSuperAdmin,
    isLabUser,
    error,
    isSubmitting,
    login,
    logout,
    clearError: () => setError(null),
  }
}
