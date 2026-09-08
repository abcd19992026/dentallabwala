import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { fetchUserProfileOnce } from '@/features/auth/services/authProfileGate'

/**
 * useAuthInitializer — rendered once at the app root.
 * Listens to Supabase's onAuthStateChange and hydrates the auth store.
 * Catches database / profile errors gracefully.
 */
export function useAuthInitializer() {
  const {
    setUser,
    setRole,
    setLabId,
    setIsLoading,
    setIsInitialized,
    setSessionError,
    clearAuth,
  } = useAuthStore()
  const { clearTenant } = useTenantStore()

  useEffect(() => {
    // Initialize from existing session on mount
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          try {
            const profile = await fetchUserProfileOnce(session.user.id)
            setUser(session.user)
            setRole(profile.role)
            setLabId(profile.labId)
          } catch (err) {
            // Preserve the real reason (e.g. "Your account is inactive.")
            // so the login form can show it after the redirect. Set it
            // AFTER clearAuth(), which resets sessionError to null.
            const message =
              err instanceof Error ? err.message : 'Your session could not be verified.'
            console.warn('Could not fetch user profile on init:', err)
            await supabase.auth.signOut()
            clearAuth()
            clearTenant()
            setSessionError(message)
          }
        } else {
          clearAuth()
        }
      } catch (err) {
        console.warn('Session init failed:', err)
        clearAuth()
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    initializeAuth()

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clearAuth()
          clearTenant()
          return
        }

        if (session.user) {
          try {
            const profile = await fetchUserProfileOnce(session.user.id)
            setUser(session.user)
            setRole(profile.role)
            setLabId(profile.labId)
          } catch (err) {
            // Don't let this cleanup path swallow the real error. Preserve
            // it (set AFTER clearAuth, which nulls sessionError) so the
            // login form shows "Your account is inactive." rather than a
            // message from some other request that failed post-signOut.
            const message =
              err instanceof Error ? err.message : 'Your session could not be verified.'
            console.warn('Auth state change profile fetch error:', err)
            await supabase.auth.signOut()
            clearAuth()
            clearTenant()
            setSessionError(message)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [
    setUser,
    setRole,
    setLabId,
    setIsLoading,
    setIsInitialized,
    setSessionError,
    clearAuth,
    clearTenant,
  ])
}
