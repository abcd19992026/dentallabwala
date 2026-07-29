import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/guards/AuthGuard'
import { SuperAdminGuard } from '@/guards/SuperAdminGuard'
import { AppShell } from '@/components/layout/AppShell'
import { AppRoot } from '@/app/AppRoot'

// Lazy-load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SuperAdminLoginPage = lazy(() => import('@/pages/auth/SuperAdminLoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const WarrantyCardPage = lazy(() => import('@/pages/warranty-card/WarrantyCardPage'))
const DoctorLedgerPage = lazy(() => import('@/pages/doctor-ledger/DoctorLedgerPage'))
const SuperAdminDashboardPage = lazy(() => import('@/pages/super-admin/SuperAdminDashboardPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/** Shared loading fallback for lazy-loaded pages */
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

/**
 * Application router.
 * Three route tiers:
 *  1. Public (/login, /admin/login)
 *  2. Authenticated lab user (/app/*)  — protected by AuthGuard
 *  3. Super admin (/super-admin/*)     — protected by SuperAdminGuard
 *
 * All routes are children of AppRoot, which initializes the auth listener.
 */
export const router = createBrowserRouter([
  {
    // AppRoot wraps everything — initializes auth inside router context
    element: <AppRoot />,
    children: [
      // ─── Public routes ──────────────────────────────────────
      {
        path: '/login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        // Hidden super admin route — not linked anywhere in the app
        path: '/admin/login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SuperAdminLoginPage />
          </Suspense>
        ),
      },

      // ─── Authenticated Lab User routes ──────────────────────
      {
        path: '/app',
        element: <AuthGuard />,
        children: [
          {
            index: true,
            element: <Navigate to="/app/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <AppShell>
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              </AppShell>
            ),
          },
          {
            path: 'warranty-card',
            element: (
              <AppShell>
                <Suspense fallback={<PageLoader />}>
                  <WarrantyCardPage />
                </Suspense>
              </AppShell>
            ),
          },
          {
            path: 'doctor-ledger',
            element: (
              <AppShell>
                <Suspense fallback={<PageLoader />}>
                  <DoctorLedgerPage />
                </Suspense>
              </AppShell>
            ),
          },
        ],
      },

      // ─── Super Admin routes ──────────────────────────────────
      {
        path: '/super-admin',
        element: <SuperAdminGuard />,
        children: [
          {
            index: true,
            element: <Navigate to="/super-admin/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SuperAdminDashboardPage />
              </Suspense>
            ),
          },
        ],
      },

      // ─── Root redirect ───────────────────────────────────────
      {
        path: '/',
        element: <Navigate to="/app/dashboard" replace />,
      },

      // ─── 404 fallback ────────────────────────────────────────
      {
        path: '*',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
])
