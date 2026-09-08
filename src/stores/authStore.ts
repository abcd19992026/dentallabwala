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

  // Actions
  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
  setLabId: (labId: string | null) => void
  setIsLoading: (loading: boolean) => void
  setIsInitialized: (initialized: boolean) => void
  setSessionError: (message: string | null) => void
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

      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setLabId: (labId) => set({ labId }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsInitialized: (isInitialized) => set({ isInitialized }),
      setSessionError: (sessionError) => set({ sessionError }),

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
