/**
 * Maps raw Supabase/Postgres errors from the expenses module into
 * user-facing messages. Never render error.message directly in the UI.
 */
export function getFriendlyExpenseError(error: unknown): string {
  console.error('[Expenses] Supabase error:', error)

  const message = (error as { message?: string })?.message || ''
  const code = (error as { code?: string })?.code || ''

  if (code === '23505' && message.includes('ux_expense_categories_lab_name')) {
    return 'This category already exists.'
  }
  if (message.includes('is not an active category')) {
    return 'This category is inactive. Please choose another one.'
  }
  if (code === '23514' && message.includes('expense_entries_amount_check')) {
    return 'Amount must be greater than zero.'
  }
  if (code === '23514' && message.includes('expense_entries_expense_date_check')) {
    return 'Expense date cannot be in the future.'
  }

  return 'Something went wrong. Please try again.'
}
