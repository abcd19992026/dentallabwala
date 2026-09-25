import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  IndianRupee,
  Building2,
  Banknote,
  QrCode,
  AlertCircle,
  Check,
} from 'lucide-react'
import type { ExpenseEntry, Category, ExpenseFormInput, PaymentMode } from '../types'
import { getISTDateString } from '../utils/currencyFormatter'

interface AddEditExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveExpense: (expense: ExpenseFormInput, existingId?: string) => Promise<void>
  onAddNewCategory: (categoryName: string) => Promise<Category>
  editingExpense?: ExpenseEntry | null
  categories: Category[]
  isSaving?: boolean
}

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  onAddNewCategory,
  editingExpense,
  categories,
  isSaving = false,
}) => {
  const todayStr = getISTDateString()

  const [date, setDate] = useState(todayStr)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer')
  const [paidTo, setPaidTo] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  // Inline Category Creation State
  const [isCreatingInlineCat, setIsCreatingInlineCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [inlineCatError, setInlineCatError] = useState('')
  const [isSavingInlineCat, setIsSavingInlineCat] = useState(false)

  // Form Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Active categories for selector
  const activeCategories = categories.filter((c) => c.is_active)

  // Pre-fill on open / edit
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
      setIsCreatingInlineCat(false)
      setNewCatName('')
      setInlineCatError('')
      return
    }

    if (editingExpense) {
      setDate(editingExpense.expense_date || todayStr)
      setTitle(editingExpense.title || '')
      setCategoryId(editingExpense.category_id || (activeCategories[0]?.id ?? ''))
      setPaymentMode(editingExpense.payment_mode || 'bank_transfer')
      setPaidTo(editingExpense.paid_to || '')
      setAmount(editingExpense.amount ? String(editingExpense.amount) : '')
      setNotes(editingExpense.notes || '')
    } else {
      setDate(todayStr)
      setTitle('')
      setCategoryId(activeCategories[0]?.id || '')
      setPaymentMode('bank_transfer')
      setPaidTo('')
      setAmount('')
      setNotes('')
    }
  }, [isOpen, editingExpense, todayStr])

  if (!isOpen) return null

  const isEditing = !!editingExpense

  // Handle inline category creation
  const handleSaveInlineCategory = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newCatName.trim()) {
      setInlineCatError('Category name is required')
      return
    }

    setIsSavingInlineCat(true)
    try {
      const created = await onAddNewCategory(newCatName.trim())
      setCategoryId(created.id)
      setNewCatName('')
      setIsCreatingInlineCat(false)
      setInlineCatError('')
      // Clear category error if any
      setErrors((prev) => ({ ...prev, categoryId: '' }))
    } catch (err) {
      setInlineCatError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSavingInlineCat(false)
    }
  }

  // Handle main form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    const newErrors: Record<string, string> = {}

    // Validation
    if (!date) {
      newErrors.date = 'Date is required'
    } else if (date > todayStr) {
      newErrors.date = 'Future dates are not allowed'
    }

    if (!title.trim()) {
      newErrors.title = 'Expense title is required'
    }

    if (!categoryId) {
      newErrors.categoryId = 'Please select a category'
    }

    if (!paymentMode) {
      newErrors.paymentMode = 'Payment mode is required'
    }

    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onSaveExpense(
      {
        expense_date: date,
        title: title.trim(),
        category_id: categoryId,
        payment_mode: paymentMode,
        paid_to: paidTo.trim() ? paidTo.trim() : null,
        amount: numAmount,
        notes: notes.trim() ? notes.trim() : null,
      },
      editingExpense?.id
    )
    // Parent closes the modal on success and keeps it open (with an error
    // toast) on failure, so no onClose() call here.
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <IndianRupee size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isEditing ? 'Edit Expense Entry' : 'Log New Expense'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Update information for this lab expenditure'
                  : 'Record operational cost, supplier bill, or staff payout'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1: Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Expense Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  max={todayStr}
                  onChange={(e) => {
                    setDate(e.target.value)
                    if (errors.date) setErrors((prev) => ({ ...prev, date: '' }))
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.date ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.date && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.date}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }))
                  }}
                  placeholder="e.g. 15400"
                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.amount ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {errors.amount}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Expense Title / Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }))
              }}
              placeholder="e.g. Zirconia HT discs purchase, Electric bill, Staff Salary..."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.title ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-700'
              }`}
            />
            {errors.title && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {errors.title}
              </p>
            )}
          </div>

          {/* Row 3: Category Selection with Inline Add Option */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Expense Category <span className="text-rose-400">*</span>
              </label>
              {!isCreatingInlineCat && (
                <button
                  type="button"
                  onClick={() => setIsCreatingInlineCat(true)}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>+ Add new category</span>
                </button>
              )}
            </div>

            {/* Inline Category Creation Input */}
            {isCreatingInlineCat ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400">
                    Create New Category
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingInlineCat(false)
                      setNewCatName('')
                      setInlineCatError('')
                    }}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value)
                      if (inlineCatError) setInlineCatError('')
                    }}
                    placeholder="Enter new category name..."
                    autoFocus
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInlineCategory}
                    disabled={isSavingInlineCat}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Check size={13} />
                    <span>{isSavingInlineCat ? 'Creating…' : 'Create & Select'}</span>
                  </button>
                </div>
                {inlineCatError && (
                  <p className="text-[11px] text-rose-400">{inlineCatError}</p>
                )}
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsCreatingInlineCat(true)
                  } else {
                    setCategoryId(e.target.value)
                    if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }))
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  errors.categoryId ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-700'
                }`}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="__add_new__" className="text-blue-400 font-semibold">
                  + Add new category...
                </option>
              </select>
            )}

            {errors.categoryId && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {errors.categoryId}
              </p>
            )}
          </div>

          {/* Row 4: Payment Mode Pills */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Payment Mode <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('bank_transfer')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMode === 'bank_transfer'
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-md shadow-violet-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Building2 size={15} />
                <span>Bank Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMode === 'upi'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <QrCode size={15} />
                <span>UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Banknote size={15} />
                <span>Cash</span>
              </button>
            </div>
            {errors.paymentMode && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {errors.paymentMode}
              </p>
            )}
          </div>

          {/* Row 5: Paid To (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Paid To / Vendor / Beneficiary <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="e.g. Ivoclar Vivadent India, Ramesh Verma, Landlord..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Row 6: Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Notes / Transaction Remarks <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Invoice #9482, rush delivery overtime, warranty batch..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
