import { fetchUserProfile, type UserProfile } from '@/features/auth/services/auth.service'

/**
 * Single-flight wrapper around fetchUserProfile().
 *
 * On login, useAuth.login() and the onAuthStateChange handler in
 * useAuthInitializer both fetch the profile for the same user at nearly
 * the same time. For a deactivated lab, the first result throws
 * "Your account is inactive."; the initializer's catch then calls
 * supabase.auth.signOut(), which makes any still-in-flight /profiles
 * request come back with 0 rows — PGRST116, surfaced as
 * "Profile not found." — clobbering the real message in the UI.
 *
 * Sharing one promise per user id means there is exactly one request and
 * every caller observes the same original error.
 */
const inFlight = new Map<string, Promise<UserProfile>>()

export function fetchUserProfileOnce(userId: string): Promise<UserProfile> {
  const existing = inFlight.get(userId)
  if (existing) return existing

  const request = fetchUserProfile(userId)
  inFlight.set(userId, request)
  // Free the slot once settled so a later, unrelated sign-in re-fetches.
  // The .catch here only keeps this bookkeeping chain from becoming an
  // unhandled rejection; real callers still receive `request`'s rejection.
  request.catch(() => undefined).finally(() => inFlight.delete(userId))

  return request
}
