import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Stethoscope, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * LoginForm — used on /login for Dental Lab Users.
 */
export function LoginForm() {
  const { login, error, isSubmitting, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    await login(email, password, 'lab_user')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-cyan-400 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30">
            <Stethoscope size={44} className="text-white" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Dental Lab
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Wala
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xs mx-auto leading-relaxed">
            Professional management portal for dental laboratories.
          </p>

          {/* Feature tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Warranty Cards', 'Doctor Ledger', 'Secure & Isolated'].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Stethoscope size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Dental Lab Wala</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-400">Sign in to your dental lab portal</p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Dev warning: Supabase not configured */}
          {!isSupabaseConfigured && (
            <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-400 text-sm font-medium">Supabase not configured (Demo Mode)</p>
                <p className="text-amber-400/70 text-xs mt-0.5">
                  Sign in with any email/password to explore the interface.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lab@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer note & Super Admin link */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-3">
            <Link
              to="/admin/login"
              className="text-xs text-slate-400 hover:text-blue-400 transition-colors underline underline-offset-4"
            >
              Super Admin Login
            </Link>
            <p className="text-center text-slate-600 text-xs">
              © {new Date().getFullYear()} Dental Lab Wala. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
