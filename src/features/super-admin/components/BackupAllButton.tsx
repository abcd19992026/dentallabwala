import { useState } from 'react'
import { DatabaseBackup, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  buildGlobalBackup,
  downloadJsonFile,
  setLastBackupAt,
  formatDateForFilename,
} from '../services/backup.service'

interface BackupAllButtonProps {
  onBackupComplete?: () => void
}

type BackupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; rowCounts: Record<string, number>; exportedAt: string }
  | { status: 'error'; message: string }

export function BackupAllButton({ onBackupComplete }: BackupAllButtonProps) {
  const [state, setState] = useState<BackupState>({ status: 'idle' })

  const handleBackup = async () => {
    setState({ status: 'loading' })
    try {
      const backup = await buildGlobalBackup()
      downloadJsonFile(backup, `dentivo-full-backup-${formatDateForFilename(new Date())}.json`)
      setLastBackupAt(backup.exported_at)
      setState({ status: 'success', rowCounts: backup.row_counts, exportedAt: backup.exported_at })
      onBackupComplete?.()
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Backup failed.' })
    }
  }

  const isLoading = state.status === 'loading'
  const showPanel = state.status === 'success' || state.status === 'error'

  return (
    <>
      <button
        onClick={handleBackup}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <DatabaseBackup size={18} />}
        {isLoading ? 'Backing up...' : 'Backup All Data'}
      </button>

      {showPanel && (
        <div className="fixed bottom-6 right-6 z-50 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border shadow-2xl bg-slate-900 border-slate-800">
          <div
            className={`flex items-center justify-between gap-2 px-4 py-3 border-b sticky top-0 bg-slate-900 ${
              state.status === 'success' ? 'border-emerald-500/20' : 'border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {state.status === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={16} className="text-red-400" />
              )}
              <span className="text-sm font-semibold text-white">
                {state.status === 'success' ? 'Backup Complete' : 'Backup Failed'}
              </span>
            </div>
            <button
              onClick={() => setState({ status: 'idle' })}
              className="text-slate-500 hover:text-white"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4">
            {state.status === 'success' ? (
              <>
                <p className="text-xs text-slate-400 mb-3">
                  Exported at {new Date(state.exportedAt).toLocaleString()}
                </p>
                <ul className="space-y-1.5">
                  {Object.entries(state.rowCounts).map(([table, count]) => (
                    <li key={table} className="flex items-center justify-between text-xs gap-3">
                      <span className="text-slate-400 font-mono truncate">{table}</span>
                      <span
                        className={`font-semibold flex-shrink-0 ${
                          count === 0 ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-red-300">{state.message}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
