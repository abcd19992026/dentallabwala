/**
 * Pure calculation functions for the Expenses module — no Supabase, no
 * React, no DOM. Every number the KPI cards and charts display is
 * computed here so it can be exercised with fixture data.
 */
import type { Category, ExpenseEntry } from '../types'

export interface CategoryBreakdownItem {
  id: string
  name: string
  amount: number
  percentage: number
}

export type TrendDirection = 'up' | 'down' | 'neutral' | 'no-data'

/**
 * Entries whose expense_date falls within monthStr (YYYY-MM). expense_date
 * is a plain date string with no time component, so string-prefix
 * matching is exact — an entry on the last day of a month never leaks
 * into the next, and one on the 1st never counts in the previous.
 */
export function filterByMonth(entries: ExpenseEntry[], monthStr: string): ExpenseEntry[] {
  return entries.filter((e) => e.expense_date.startsWith(monthStr))
}

/**
 * Defensive numeric sum. Supabase/postgrest can serialize `numeric`
 * columns as strings — Number() here guarantees "500" + "300" sums to
 * 800, never concatenates to "500300".
 */
export function sumAmounts(entries: ExpenseEntry[]): number {
  return entries.reduce((sum, e) => sum + Number(e.amount), 0)
}

export function daysInMonth(monthStr: string): number {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** True only for a month strictly after the reference (IST) month. */
export function isFutureMonth(monthStr: string, referenceDate: Date): boolean {
  return monthStr > monthKeyFromDate(referenceDate)
}

export function isCurrentMonth(monthStr: string, referenceDate: Date): boolean {
  return monthStr === monthKeyFromDate(referenceDate)
}

/**
 * Days elapsed in monthStr as of referenceDate:
 * - the current month -> min(today's day-of-month, days in that month)
 * - a past month -> every day in that month
 * - a future month -> 1 (defensive; navigation should never reach this)
 */
export function getDaysElapsedInMonth(monthStr: string, referenceDate: Date): number {
  const currentKey = monthKeyFromDate(referenceDate)
  const totalDays = daysInMonth(monthStr)
  if (monthStr === currentKey) {
    return Math.min(referenceDate.getDate(), totalDays)
  }
  if (monthStr < currentKey) {
    return totalDays
  }
  return 1
}

/**
 * Same-period day count for a comparison month, clamped to however many
 * days that month actually has — e.g. "1–30 Mar" compares against
 * "1–28 Feb" (or 29 in a leap year), never an out-of-range day.
 */
export function getClampedSamePeriodDay(daysElapsed: number, monthStr: string): number {
  return Math.min(daysElapsed, daysInMonth(monthStr))
}

/**
 * Percent change from previous -> current. Returns null (never
 * Infinity/NaN) when there is no previous-period baseline to compare
 * against, which callers use to render a "no data" state instead of a
 * misleading "-100%".
 */
export function getPercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function classifyTrend(percentageChange: number | null): TrendDirection {
  if (percentageChange === null) return 'no-data'
  if (percentageChange < 0) return 'down'
  if (percentageChange > 0) return 'up'
  return 'neutral'
}

export function getDailyAverage(total: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0
  return total / daysElapsed
}

/**
 * Per-category totals for a set of entries, sorted by amount descending
 * with a deterministic tie-break (name, then id) so categories with
 * equal spend always render in the same order regardless of fetch
 * order. Categories with zero spend never appear — nothing to sum for
 * them — which is exactly what the donut chart needs. Deactivated
 * categories are still looked up by id, so their entries still count;
 * only entries with no matching category at all fall back to
 * "Uncategorized".
 */
export function getCategoryBreakdown(
  entries: ExpenseEntry[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const totals = new Map<string, number>()

  for (const e of entries) {
    const prev = totals.get(e.category_id) || 0
    totals.set(e.category_id, prev + Number(e.amount))
  }

  const total = sumAmounts(entries)

  const items: CategoryBreakdownItem[] = Array.from(totals.entries()).map(([categoryId, amount]) => ({
    id: categoryId,
    name: categoryMap.get(categoryId)?.name || 'Uncategorized',
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }))

  items.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  return items
}

export function getTopCategories(
  entries: ExpenseEntry[],
  categories: Category[],
  limit: number
): CategoryBreakdownItem[] {
  return getCategoryBreakdown(entries, categories).slice(0, limit)
}
