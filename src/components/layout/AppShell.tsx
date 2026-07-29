import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: ReactNode
}

/**
 * AppShell — the main authenticated layout shell.
 * Renders: Sidebar (left) + Header (top) + Content (right/main).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Right: Header + Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
