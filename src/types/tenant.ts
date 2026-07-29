/**
 * Tenant (Dental Lab) configuration.
 * Loaded into tenantStore after login.
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  branding: TenantBranding
  isActive: boolean
  createdAt: string
}

export interface TenantBranding {
  primaryColor?: string
  accentColor?: string
  font?: string
}
