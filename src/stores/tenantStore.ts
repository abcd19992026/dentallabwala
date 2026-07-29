import { create } from 'zustand'
import type { Tenant } from '@/types/tenant'

interface TenantState {
  tenant: Tenant | null
  isLoading: boolean

  // Actions
  setTenant: (tenant: Tenant | null) => void
  setIsLoading: (loading: boolean) => void
  clearTenant: () => void
}

export const useTenantStore = create<TenantState>()((set) => ({
  tenant: null,
  isLoading: false,

  setTenant: (tenant) => set({ tenant }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearTenant: () => set({ tenant: null, isLoading: false }),
}))
