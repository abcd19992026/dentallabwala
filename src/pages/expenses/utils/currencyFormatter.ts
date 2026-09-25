/**
 * currencyFormatter.ts
 * Utilities for Indian currency (₹) formatting and date helpers.
 */

/**
 * Formats a numeric amount to Indian number format with ₹ symbol.
 * Whole amounts show no decimals; fractional amounts always show exactly
 * two, so paise are never silently rounded away.
 * Examples: 142850 -> "₹1,42,850", 1250.5 -> "₹1,250.50"
 */
export function formatIndianCurrency(amount: number): string {
  const numeric = Number(amount)
  if (isNaN(numeric)) {
    return '₹0'
  }
  const isWhole = Number.isInteger(Math.round(numeric * 100) / 100)
  return (
    '₹' +
    numeric.toLocaleString('en-IN', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    })
  )
}

/**
 * Formats a date string (YYYY-MM-DD) into clean readable date.
 * Example: "2026-09-25" -> "25 Sep 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const monthIndex = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const date = new Date(year, monthIndex, day)
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Formats a month string (YYYY-MM) into clean readable month.
 * Example: "2026-09" -> "September 2026"
 */
export function formatMonthName(monthStr: string): string {
  if (!monthStr) return ''
  try {
    const [year, month] = monthStr.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch {
    return monthStr
  }
}

/**
 * Short month label
 * Example: "2026-09" -> "Sep 2026"
 */
export function formatShortMonth(monthStr: string): string {
  if (!monthStr) return ''
  try {
    const [year, month] = monthStr.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return monthStr
  }
}

/**
 * Gets the previous month string in YYYY-MM format.
 * Example: "2026-09" -> "2026-08", "2026-01" -> "2025-12"
 */
export function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const prevDate = new Date(year, month - 2, 1)
  const prevYear = prevDate.getFullYear()
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0')
  return `${prevYear}-${prevMonth}`
}

/**
 * Today's date in Asia/Kolkata, as YYYY-MM-DD, regardless of the
 * browser's or server's local timezone.
 */
export function getISTDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * "Today" in IST as a local Date object (pinned to noon to avoid any
 * midnight/DST boundary issues), for use with getFullYear/getMonth/getDate.
 */
export function getISTReferenceDate(): Date {
  const [year, month, day] = getISTDateString().split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

/** Current month in IST, as YYYY-MM. */
export function getISTMonthString(): string {
  return getISTDateString().slice(0, 7)
}
