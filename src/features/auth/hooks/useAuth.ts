import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { signIn, signOut, fetchUserProfile } from '@/features/auth/services/auth.service'
import { USER_ROLES } from '@/types/roles'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * useAuth — the primary hook for authentication actions in components.
 */
export function useAuth() {
  const {
    user,
    role,
    labId,
    isLoading,
    isInitialized,
    clearAuth,
    sessionError,
    setSessionError,
    setSignInInProgress,
  } = useAuthStore()
  const navigate = useNavigate()
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // The message the login form shows: an error from this hook's own
  // login() call takes precedence; otherwise fall back to a reason the
  // auth initializer captured while rejecting a restored/changed session.
  const error = localError ?? sessionError

  const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN
  const isLabUser = role === USER_ROLES.LAB_USER
  const isAuthenticated = !!user

  /**
   * Login handler — performs Supabase Authentication, reads `profiles` table,
   * verifies user role, and redirects. Handles database & 404 errors cleanly without resetting forms.
   */
  const login = useCallback(
    async (email: string, password: string, expectedRole?: string) => {
      setLocalError(null)
      setSessionError(null)
      // Claim this sign-in: signIn() below fires SIGNED_IN synchronously
      // within supabase-js, and useAuthInitializer's handler checks this
      // flag to avoid issuing a second /profiles request.
      setSignInInProgress(true)
      setIsSubmitting(true)

      try {
        if (isSupabaseConfigured) {
          // 1. Supabase Authentication
          const authData = await signIn(email, password)
          const authUser = authData.user

          if (!authUser) {
            throw new Error('Authentication succeeded but user session could not be established.')
          }

          // 2. Read profiles table — the only profile fetch for this sign-in
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
          // Supabase is not configured — refuse login instead of granting fake access.
          throw new Error(
            'Login is unavailable: the server is not configured correctly. Please contact support.'
          )
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'An unexpected authentication error occurred.'
        // This is the message the user acted on — keep it as the local
        // error so the initializer's cleanup path can't replace it.
        setLocalError(message)
        // signIn() may have minted a session before the profile/role check
        // failed (e.g. a deactivated lab). The initializer no longer signs
        // out for a login-driven sign-in, so revoke it here.
        if (isSupabaseConfigured) {
          await signOut().catch(() => undefined)
        }
      } finally {
        setSignInInProgress(false)
        setIsSubmitting(false)
      }
    },
    [navigate, setSessionError, setSignInInProgress]
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
    clearError: () => {
      setLocalError(null)
      setSessionError(null)
    },
  }
}
