/**
 * User roles in the system.
 * - SUPER_ADMIN: Software owner — full access to all tenants
 * - LAB_USER: Dental lab staff — scoped to their own lab_id only
 */
export type UserRole = 'super_admin' | 'lab_user'

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin' as UserRole,
  LAB_USER: 'lab_user' as UserRole,
} as const
