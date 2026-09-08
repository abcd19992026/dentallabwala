import { supabase } from '@/lib/supabase/client'
import type { UserRole } from '@/types/roles'

export interface UserProfile {
  id: string
  labId: string | null
  role: UserRole
  fullName: string
  createdAt: string
}

/**
 * Signs in a user with email and password.
 * This is used for BOTH lab users and super admin.
 * Role differentiation happens after sign-in by fetching the profile.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * Signs the current user out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Fetches the user's profile from the `profiles` table.
 * This includes their role and lab_id.
 * Shows detailed error message if database table is missing (404 / 42P01).
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  // Query `profiles` alone — no embedded labs(...). This always succeeds
  // for the logged-in user under the "User reads own profile" policy.
  // (An embedded labs(...) relation would drag the whole result to zero
  // rows when get_my_lab_id() returns NULL for a deactivated lab, making
  // .single() throw PGRST116 before the inactive check below can run.)
  const { data, error, status } = await supabase
    .from('profiles')
    .select('id, lab_id, role, full_name, created_at')
    .eq('id', userId)
    .single()

  if (error) {
    // 404 Not Found / 42P01 relation does not exist / PGRST204
    if (
      status === 404 ||
      error.code === '42P01' ||
      error.code === 'PGRST204' ||
      error.message?.includes('profiles') ||
      error.message?.includes('not found')
    ) {
      throw new Error(
        "Database Error: Table 'profiles' is missing in Supabase. Please run the SQL migration (supabase/migrations/20260723000000_initial_schema.sql) in your Supabase SQL Editor."
      )
    }
    // PGRST116 = zero rows: the profile row simply doesn't exist. Show a
    // friendly message instead of the raw PostgREST coercion error.
    if (error.code === 'PGRST116') {
      throw new Error('Profile not found. Please contact administrator.')
    }
    throw new Error(`Database Error (${error.code || status}): ${error.message}`)
  }

  // Deactivation enforcement. get_my_lab_id() returns NULL for a
  // deactivated lab, so its `labs` row is hidden by RLS. Query labs
  // separately with maybeSingle() (zero rows -> null, no throw), then
  // fail closed: an active lab_user can always read their own labs row,
  // so a missing lab_id or a missing/inactive row means deactivated.
  // super_admin has no lab_id and skips this entirely.
  if (data.role === 'lab_user') {
    let labIsActive = false
    if (data.lab_id) {
      const { data: labRow } = await supabase
        .from('labs')
        .select('is_active')
        .eq('id', data.lab_id)
        .maybeSingle()
      labIsActive = labRow?.is_active === true
    }
    if (!labIsActive) {
      throw new Error(
        `Your account is inactive. Please contact administrator.`
      )
    }
  }

  return {
    id: data.id,
    labId: data.lab_id,
    role: data.role as UserRole,
    fullName: data.full_name || '',
    createdAt: data.created_at,
  }
}

/**
 * Gets the current session from Supabase.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
