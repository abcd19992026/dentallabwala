/**
 * TypeScript types for the Dentivo Expenses Module.
 * Mirrors the public.expense_categories / public.expense_entries schema.
 */

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer'

export interface Category {
  id: string
  lab_id: string
  name: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ExpenseEntry {
  id: string
  lab_id: string
  expense_date: string // YYYY-MM-DD
  title: string
  category_id: string
  payment_mode: PaymentMode
  paid_to: string | null
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseFormInput {
  expense_date: string
  title: string
  category_id: string
  payment_mode: PaymentMode
  paid_to?: string | null
  amount: number
  notes?: string | null
}
