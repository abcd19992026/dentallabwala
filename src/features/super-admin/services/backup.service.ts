import { supabase } from '@/lib/supabase/client'

/**
 * Read-only data export / backup helpers for the Super Admin panel.
 * Every query here is a plain `.select('*')` — no writes, no schema access.
 */

export const APP_NAME = 'Dentivo'
export const BACKUP_VERSION = 1
export const LAST_BACKUP_STORAGE_KEY = 'dentivo_last_backup_at'

const PAGE_SIZE = 1000

interface TableConfig {
  name: string
  /** Column used to keep .range() pagination deterministic across pages. */
  orderColumn: string
}

/**
 * Every table in the `public` schema, live and legacy. Legacy doctor_ledger*
 * tables are superseded by doctor_supplies/doctor_payments in the current UI
 * but may still hold historical data, so they're included for completeness.
 */
const TABLE_CONFIGS: TableConfig[] = [
  { name: 'labs', orderColumn: 'id' },
  { name: 'profiles', orderColumn: 'id' },
  { name: 'doctors', orderColumn: 'id' },
  { name: 'doctor_supplies', orderColumn: 'id' },
  { name: 'doctor_payments', orderColumn: 'id' },
  { name: 'warranty_cards', orderColumn: 'id' },
  { name: 'warranty_templates', orderColumn: 'lab_id' },
  { name: 'template_configs', orderColumn: 'id' },
  { name: 'doctor_ledgers', orderColumn: 'id' },
  { name: 'doctor_ledger_items', orderColumn: 'id' },
  { name: 'doctor_ledger_payments', orderColumn: 'id' },
  { name: 'doctor_ledger_entries', orderColumn: 'id' },
]

export interface BackupJson {
  exported_at: string
  app: string
  version: number
  row_counts: Record<string, number>
  tables: Record<string, Record<string, unknown>[]>
}

/** Fetches every row of one table, looping .range() until exhausted. */
async function fetchAllRows(
  tableName: string,
  orderColumn: string,
  filter?: { column: string; value: string }
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from(tableName)
      .select('*')
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (filter) {
      query = query.eq(filter.column, filter.value)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to read table "${tableName}": ${error.message}`)
    }

    const batch = data || []
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function buildBackup(filter?: { column: string; value: string }): Promise<BackupJson> {
  const tables: Record<string, Record<string, unknown>[]> = {}
  const row_counts: Record<string, number> = {}

  for (const table of TABLE_CONFIGS) {
    const tableFilter =
      filter && table.name === 'labs' ? { column: 'id', value: filter.value } : filter
    const rows = await fetchAllRows(table.name, table.orderColumn, tableFilter)
    tables[table.name] = rows
    row_counts[table.name] = rows.length
  }

  return {
    exported_at: new Date().toISOString(),
    app: APP_NAME,
    version: BACKUP_VERSION,
    row_counts,
    tables,
  }
}

/** Fetches every row of every table across all labs. */
export async function buildGlobalBackup(): Promise<BackupJson> {
  return buildBackup()
}

/** Fetches every row scoped to a single lab (by `labs.id` / `lab_id`). */
export async function buildLabBackup(labId: string): Promise<BackupJson> {
  return buildBackup({ column: 'lab_id', value: labId })
}

/** Slugifies a lab name for use in a filename: lowercase, hyphenated, no special chars. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'lab'
}

/** Formats a Date as YYYY-MM-DD for filenames. */
export function formatDateForFilename(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function csvEscapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/** Builds an RFC 4180 CSV string from an array of flat row objects. */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvEscapeCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscapeCell(row[h])).join(','))
  }
  return lines.join('\r\n')
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerBlobDownload(blob, filename)
}

export function downloadCsvFile(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerBlobDownload(blob, filename)
}

export function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setLastBackupAt(iso: string): void {
  try {
    localStorage.setItem(LAST_BACKUP_STORAGE_KEY, iso)
  } catch {
    // localStorage unavailable (e.g. private browsing) — display-only feature, safe to ignore
  }
}
