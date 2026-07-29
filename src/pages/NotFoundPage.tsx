import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

/**
 * NotFoundPage — route: *
 * Renders when no route matches.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-8xl font-bold text-slate-800 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <Home size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
