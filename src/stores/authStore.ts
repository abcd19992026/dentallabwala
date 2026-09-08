import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types/roles'

interface AuthState {
  user: User | null
  role: UserRole | null
  labId: string | null
  isLoading: boolean
  isInitialized: boolean
  /** Why the last session/profile load was rejected (e.g. lab deactivated),
   *  set by useAuthInitializer's cleanup path so the login form can show it. */
  sessionError: string | null
  /** True while useAuth.login() is driving a sign-in. supabase-js awaits the
   *  onAuthStateChange callback *inside* signInWithPassword(), so the store
   *  isn't populated yet when the SIGNED_IN handler runs — this flag tells
   *  that handler login() will fetch the profile, so it must not also. */
  signInInProgress: boolean

  // Actions
  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
  setLabId: (labId: string | null) => void
  setIsLoading: (loading: boolean) => void
  setIsInitialized: (initialized: boolean) => void
  setSessionError: (message: string | null) => void
  setSignInInProgress: (inProgress: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      labId: null,
      isLoading: true,
      isInitialized: false,
      sessionError: null,
      signInInProgress: false,

      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setLabId: (labId) => set({ labId }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsInitialized: (isInitialized) => set({ isInitialized }),
      setSessionError: (sessionError) => set({ sessionError }),
      setSignInInProgress: (signInInProgress) => set({ signInInProgress }),

      clearAuth: () =>
        set({
          user: null,
          role: null,
          labId: null,
          isLoading: false,
          sessionError: null,
        }),
    }),
    {
      name: 'dlw-auth',
      // Only persist non-sensitive, UI-relevant state
      partialize: (state) => ({
        role: state.role,
        labId: state.labId,
      }),
    }
  )
)
