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
  const { data, error, status } = await supabase
    .from('profiles')
    .select(`
      id,
      lab_id,
      role,
      full_name,
      created_at,
      labs(
        is_active
      )
      `)
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
    throw new Error(`Database Error (${error.code || status}): ${error.message}`)
  }

<<<<<<< HEAD
  const labRow: any = Array.isArray(data.labs)
    ? data.labs[0]
    : data.labs
  if (
    data.role === 'lab_user' &&
    labRow &&
    labRow.is_active === false
=======
  if (
    data.role === 'lab_user' &&
    data.labs &&
    data.labs.is_active === false
>>>>>>> 70803d7112456db98fd52bc3323c4f341225b889
  ) {
    throw new Error(
      `Your account is inactive. Please contact administrator.`
    )
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
