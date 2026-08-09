import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import type { DentalLabClient } from '../types/client'
import {
  buildLabBackup,
  downloadCsvFile,
  downloadJsonFile,
  formatDateForFilename,
  rowsToCsv,
  slugify,
} from '../services/backup.service'

interface ExportLabButtonsProps {
  client: DentalLabClient
}

export function ExportLabButtons({ client }: ExportLabButtonsProps) {
  const [jsonLoading, setJsonLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)

  const filePrefix = `dentivo-${slugify(client.labName)}-${formatDateForFilename(new Date())}`

  const handleJsonExport = async () => {
    setJsonLoading(true)
    try {
      const backup = await buildLabBackup(client.id)
      downloadJsonFile(backup, `${filePrefix}.json`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setJsonLoading(false)
    }
  }

  const handleCsvExport = async () => {
    setCsvLoading(true)
    try {
      const backup = await buildLabBackup(client.id)
      downloadCsvFile(rowsToCsv(backup.tables['doctor_supplies'] || []), `${filePrefix}-case-entries.csv`)
      downloadCsvFile(rowsToCsv(backup.tables['doctor_payments'] || []), `${filePrefix}-payments.csv`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSV export failed.')
    } finally {
      setCsvLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleJsonExport}
        disabled={jsonLoading}
        className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Export ${client.labName}'s data as JSON`}
      >
        {jsonLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      </button>

      <button
        onClick={handleCsvExport}
        disabled={csvLoading}
        className="p-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Export ${client.labName}'s case entries & payments as CSV`}
      >
        {csvLoading ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
      </button>
    </>
  )
}
