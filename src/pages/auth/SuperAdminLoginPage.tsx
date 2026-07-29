import { SuperAdminLoginForm } from '@/features/auth/components/SuperAdminLoginForm'

/**
 * SuperAdminLoginPage — route: /admin/login (hidden URL)
 * Not linked anywhere in the app. Known only to the software owner.
 */
export default function SuperAdminLoginPage() {
  return <SuperAdminLoginForm />
}
