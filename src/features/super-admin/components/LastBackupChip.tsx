import { useEffect, useState } from 'react'
import { getLastBackupAt } from '../services/backup.service'

interface LastBackupChipProps {
  /** Bump this after a successful backup to force the chip to re-read localStorage. */
  refreshKey: number
}

export function LastBackupChip({ refreshKey }: LastBackupChipProps) {
  const [lastBackupAt, setLastBackupAtState] = useState<string | null>(null)

  useEffect(() => {
    setLastBackupAtState(getLastBackupAt())
  }, [refreshKey])

  if (!lastBackupAt) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20 whitespace-nowrap">
        No backup yet — take one now
      </span>
    )
  }

  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
  )
  const overdue = daysAgo >= 8

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
        overdue
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      }`}
    >
      {overdue
        ? `Last backup: ${daysAgo} days ago — backup overdue`
        : `Last backup: ${daysAgo} days ago`}
    </span>
  )
}
