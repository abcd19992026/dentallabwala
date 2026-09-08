import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { fetchUserProfile } from '@/features/auth/services/auth.service'

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
            const profile = await fetchUserProfile(session.user.id)
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
          // Read live store state (not stale closure values).
          const store = useAuthStore.getState()

          // useAuth.login() owns its own sign-in: it fetches the profile
          // and populates the store, and signs out on failure. A second
          // fetch here would race it — and once login()'s deactivation
          // check has triggered signOut(), that refetch lands
          // unauthenticated (PGRST116 -> "Profile not found.") and
          // clobbers the real "Your account is inactive." message.
          if (store.signInInProgress) return

          // Store already hydrated for this same user (token refresh,
          // duplicate SIGNED_IN / INITIAL_SESSION replay): nothing to do.
          if (store.user?.id === session.user.id && store.role) return

          // A session we don't know about (e.g. a different user id, or a
          // session restored outside the login flow): fetch and hydrate.
          try {
            const profile = await fetchUserProfile(session.user.id)
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
