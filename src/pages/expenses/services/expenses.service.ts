import { supabase } from '@/lib/supabase/client'
import type { Category, ExpenseEntry, ExpenseFormInput } from '../types'

/**
 * Orders categories the way the UI expects: the 9 defaults first in their
 * curated sort_order, then any custom categories alphabetically after.
 * sort_order is 0 for every custom category (no per-lab counter in the
 * schema), so this can't be done with a single ORDER BY clause.
 */
function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
    if (a.is_default) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name)
  })
}

function toExpenseEntry(row: Record<string, unknown>): ExpenseEntry {
  return {
    id: row.id as string,
    lab_id: row.lab_id as string,
    expense_date: row.expense_date as string,
    title: row.title as string,
    category_id: row.category_id as string,
    payment_mode: row.payment_mode as ExpenseEntry['payment_mode'],
    paid_to: (row.paid_to as string | null) ?? null,
    amount: Number(row.amount),
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export const expensesService = {
  /** All categories for the lab, active and inactive alike. */
  async getCategories(labId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, lab_id, name, is_default, is_active, sort_order, created_at')
      .eq('lab_id', labId)

    if (error) throw error
    return sortCategories((data || []) as Category[])
  },

  /** Entries with expense_date in [fromDate, toDate] inclusive (YYYY-MM-DD). */
  async getEntries(labId: string, fromDate: string, toDate: string): Promise<ExpenseEntry[]> {
    const { data, error } = await supabase
      .from('expense_entries')
      .select('id, lab_id, expense_date, title, category_id, payment_mode, paid_to, amount, notes, created_at, updated_at')
      .eq('lab_id', labId)
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate)
      .order('expense_date', { ascending: false })

    if (error) throw error
    return (data || []).map(toExpenseEntry)
  },

  async createEntry(labId: string, entry: ExpenseFormInput): Promise<ExpenseEntry> {
    // created_by is set by a DB trigger from auth.uid() — never sent from the client.
    const { data, error } = await supabase
      .from('expense_entries')
      .insert({
        lab_id: labId,
        expense_date: entry.expense_date,
        title: entry.title,
        category_id: entry.category_id,
        payment_mode: entry.payment_mode,
        paid_to: entry.paid_to?.trim() || null,
        amount: entry.amount,
        notes: entry.notes?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error
    return toExpenseEntry(data)
  },

  async updateEntry(entryId: string, entry: ExpenseFormInput): Promise<ExpenseEntry> {
    const { data, error } = await supabase
      .from('expense_entries')
      .update({
        expense_date: entry.expense_date,
        title: entry.title,
        category_id: entry.category_id,
        payment_mode: entry.payment_mode,
        paid_to: entry.paid_to?.trim() || null,
        amount: entry.amount,
        notes: entry.notes?.trim() || null,
      })
      .eq('id', entryId)
      .select()
      .single()

    if (error) throw error
    return toExpenseEntry(data)
  },

  async deleteEntry(entryId: string): Promise<void> {
    const { error } = await supabase.from('expense_entries').delete().eq('id', entryId)
    if (error) throw error
  },

  async createCategory(labId: string, name: string): Promise<Category> {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ lab_id: labId, name: name.trim() })
      .select('id, lab_id, name, is_default, is_active, sort_order, created_at')
      .single()

    if (error) throw error
    return data as Category
  },

  async renameCategory(categoryId: string, newName: string): Promise<Category> {
    const { data, error } = await supabase
      .from('expense_categories')
      .update({ name: newName.trim() })
      .eq('id', categoryId)
      .select('id, lab_id, name, is_default, is_active, sort_order, created_at')
      .single()

    if (error) throw error
    return data as Category
  },

  async setCategoryActive(categoryId: string, isActive: boolean): Promise<Category> {
    const { data, error } = await supabase
      .from('expense_categories')
      .update({ is_active: isActive })
      .eq('id', categoryId)
      .select('id, lab_id, name, is_default, is_active, sort_order, created_at')
      .single()

    if (error) throw error
    return data as Category
  },
}

export { sortCategories }
