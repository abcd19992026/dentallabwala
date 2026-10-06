/**
 * Deterministic color assignment for expense categories.
 * The schema has no color column, so defaults get a curated color by name
 * and custom categories get a stable color hashed from their id.
 */

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  'Raw Material': '#3b82f6', // blue
  'Staff Salary': '#10b981', // emerald
  'Rent': '#8b5cf6', // violet
  'Food': '#f59e0b', // amber
  'Marketing': '#ec4899', // pink
  'Miscellaneous': '#64748b', // slate
  'Referral': '#06b6d4', // cyan
  'Tea': '#f97316', // orange
  'Travel': '#14b8a6', // teal
}

const FALLBACK_PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getCategoryColor(category: { id: string; name: string } | null | undefined): string {
  if (!category) return '#64748b'
  if (DEFAULT_CATEGORY_COLORS[category.name]) return DEFAULT_CATEGORY_COLORS[category.name]
  return FALLBACK_PALETTE[hashString(category.id) % FALLBACK_PALETTE.length]
}
