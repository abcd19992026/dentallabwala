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
  const { setUser, setRole, setLabId, setIsLoading, setIsInitialized, clearAuth } =
    useAuthStore()
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
            console.warn('Could not fetch user profile on init:', err)
            await supabase.auth.signOut()
            clearAuth()
            clearTenant()
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
            const profile = await fetchUserProfile(session.user.id)
            setUser(session.user)
            setRole(profile.role)
            setLabId(profile.labId)
          } catch (err) {
            console.warn('Auth state change profile fetch error:', err)
            await supabase.auth.signOut()
            clearAuth()
            clearTenant()
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setRole, setLabId, setIsLoading, setIsInitialized, clearAuth, clearTenant])
}
