import { useState, type FormEvent } from 'react'
import { X, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import type { DentalLabClient } from '../types/client'

interface ResetPasswordModalProps {
  isOpen: boolean
  client: DentalLabClient | null
  onClose: () => void
  onReset: (clientId: string, newPassword: string) => Promise<void>
}

export function ResetPasswordModal({
  isOpen,
  client,
  onClose,
  onReset,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen || !client) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!newPassword.trim()) return
    setIsSubmitting(true)
    try {
      await onReset(client.id, newPassword)
      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        setNewPassword('')
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Password reset failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Reset Password</h3>
              <p className="text-xs text-slate-400">{client.labName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto animate-bounce" />
              <p className="text-white font-medium">Password Updated Successfully!</p>
              <p className="text-xs text-slate-400">The client can now log in with the new password.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-300">
                Set a new password for <span className="font-semibold text-white">{client.labName}</span> ({client.email || 'No email specified'}).
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">New Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
