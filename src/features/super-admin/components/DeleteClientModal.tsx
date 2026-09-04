import { useState, type FormEvent } from 'react'
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import type { DentalLabClient } from '../types/client'
import { buildLabBackup, downloadJsonFile, formatDateForFilename, slugify } from '../services/backup.service'

interface DeleteClientModalProps {
  isOpen: boolean
  client: DentalLabClient | null
  onClose: () => void
  /** Actually deletes the client. Called only after backup succeeds and the name is confirmed. */
  onConfirmDelete: (client: DentalLabClient) => Promise<void>
}

export function DeleteClientModal({
  isOpen,
  client,
  onClose,
  onConfirmDelete,
}: DeleteClientModalProps) {
  const [typedName, setTypedName] = useState('')
  const [step, setStep] = useState<'idle' | 'backing-up' | 'deleting'>('idle')
  const [error, setError] = useState('')

  if (!isOpen || !client) return null

  const isNameMatched = typedName.trim().toLowerCase() === client.labName.trim().toLowerCase()
  const isBusy = step !== 'idle'

  const handleClose = () => {
    if (isBusy) return
    setTypedName('')
    setError('')
    setStep('idle')
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isNameMatched || isBusy) return
    setError('')

    // Step 1: take a safety backup of this lab's data before deleting anything.
    setStep('backing-up')
    try {
      const backup = await buildLabBackup(client.id)
      const filename = `dentivo-${slugify(client.labName)}-${formatDateForFilename(new Date())}-pre-delete-backup.json`
      downloadJsonFile(backup, filename)
    } catch (err) {
      setStep('idle')
      setError(
        `Backup failed, so the lab was NOT deleted (for safety): ${err instanceof Error ? err.message : 'Unknown error'
        }`
      )
      return
    }

    // Step 2: proceed with the actual delete only if the backup succeeded.
    setStep('deleting')
    try {
      await onConfirmDelete(client)
      setTypedName('')
      setStep('idle')
      onClose()
    } catch (err) {
      setStep('idle')
      setError(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Delete Client</h3>
              <p className="text-xs text-slate-400">{client.labName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-200">
              This will <span className="font-semibold">permanently delete</span> every doctor, warranty
              card, ledger entry, and file belonging to this lab. This cannot be undone. A backup file
              will be downloaded automatically before deletion proceeds.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Type <span className="font-semibold text-white">{client.labName}</span> to confirm
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={client.labName}
              disabled={isBusy}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isBusy}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isNameMatched || isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'backing-up' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Taking backup...
                </>
              ) : step === 'deleting' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Backup & Delete Permanently'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
