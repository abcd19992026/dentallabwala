import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Plus,
  Building2,
  Banknote,
  QrCode,
  AlertCircle,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Search,
} from 'lucide-react'
import type { ExpenseEntry, Category, ExpenseFormInput, PaymentMode, TransactionType } from '../types'
import { getISTDateString } from '../utils/currencyFormatter'
import { getCategoryColor } from '../utils/categoryColors'

interface AddEditExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveExpense: (expense: ExpenseFormInput, existingId?: string) => Promise<void>
  onAddNewCategory: (categoryName: string) => Promise<Category>
  editingExpense?: ExpenseEntry | null
  categories: Category[]
  cashInCategoryId?: string
  isSaving?: boolean
}

export const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  onAddNewCategory,
  editingExpense,
  categories,
  cashInCategoryId,
  isSaving = false,
}) => {
  const todayStr = getISTDateString()

  const [transactionType, setTransactionType] = useState<TransactionType>('cash_out')
  const [date, setDate] = useState(todayStr)
  const [categoryId, setCategoryId] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
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

  // Active categories for selector (excluding "Cash In" category from normal expense choices)
  const activeExpenseCategories = categories.filter(
    (c) => c.is_active && c.id !== cashInCategoryId && c.name.toLowerCase() !== 'cash in'
  )

  // Searchable Category Dropdown State
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false)
  const [catSearchQuery, setCatSearchQuery] = useState('')
  const catDropdownRef = useRef<HTMLDivElement>(null)
  const catSearchInputRef = useRef<HTMLInputElement>(null)

  const availableCategories = useMemo(() => {
    return transactionType === 'cash_in'
      ? categories.filter((c) => c.is_active)
      : activeExpenseCategories
  }, [transactionType, categories, activeExpenseCategories])

  const filteredCategories = useMemo(() => {
    if (!catSearchQuery.trim()) return availableCategories
    const q = catSearchQuery.toLowerCase().trim()
    return availableCategories.filter((c) => c.name.toLowerCase().includes(q))
  }, [availableCategories, catSearchQuery])

  // Focus search input on dropdown open
  useEffect(() => {
    if (isCatDropdownOpen) {
      setTimeout(() => {
        catSearchInputRef.current?.focus()
      }, 50)
    } else {
      setCatSearchQuery('')
    }
  }, [isCatDropdownOpen])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false)
      }
    }
    if (isCatDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isCatDropdownOpen])

  // Pre-fill on open / edit
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
      setIsCreatingInlineCat(false)
      setNewCatName('')
      setInlineCatError('')
      setIsCatDropdownOpen(false)
      setCatSearchQuery('')
      return
    }

    if (editingExpense) {
      const isCashIn =
        editingExpense.title === 'Cash In' ||
        editingExpense.title?.startsWith('Cash In') ||
        editingExpense.category_id === cashInCategoryId ||
        categories.find((c) => c.id === editingExpense.category_id)?.name.toLowerCase() === 'cash in'

      setTransactionType(isCashIn ? 'cash_in' : 'cash_out')
      setDate(editingExpense.expense_date || todayStr)
      setCategoryId(editingExpense.category_id || (activeExpenseCategories[0]?.id ?? ''))
      setPaymentMode(editingExpense.payment_mode || 'cash')
      setPaidTo(editingExpense.paid_to || '')
      setAmount(editingExpense.amount ? String(editingExpense.amount) : '')
      setNotes(editingExpense.notes || '')
    } else {
      setTransactionType('cash_out')
      setDate(todayStr)
      setCategoryId(activeExpenseCategories[0]?.id || '')
      setPaymentMode('cash')
      setPaidTo('')
      setAmount('')
      setNotes('')
    }
  }, [isOpen, editingExpense, todayStr, cashInCategoryId])

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

    const effectiveCatId =
      transactionType === 'cash_in'
        ? (categoryId || cashInCategoryId || categories.find((c) => c.name.toLowerCase() === 'cash in')?.id || '')
        : categoryId

    if (!effectiveCatId) {
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

    const selectedCategory = categories.find((c) => c.id === effectiveCatId)
    const finalTitle =
      transactionType === 'cash_in'
        ? (paidTo.trim() ? `Cash In: ${paidTo.trim()}` : 'Cash In')
        : (editingExpense?.title || selectedCategory?.name || 'Expense')

    await onSaveExpense(
      {
        expense_date: date,
        title: finalTitle,
        category_id: effectiveCatId,
        payment_mode: paymentMode,
        paid_to: paidTo.trim() ? paidTo.trim() : null,
        amount: numAmount,
        notes: notes.trim() ? notes.trim() : null,
        transaction_type: transactionType,
      },
      editingExpense?.id
    )
  }

  const currentSelectedCategory = categories.find((c) => c.id === categoryId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                transactionType === 'cash_in'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {transactionType === 'cash_in' ? (
                <ArrowDownLeft size={18} className="stroke-[2.5]" />
              ) : (
                <ArrowUpRight size={18} className="stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {isEditing
                  ? 'Edit Transaction Record'
                  : transactionType === 'cash_in'
                  ? 'Log Cash In (Paisa Aaya)'
                  : 'Log Cash Out (Expense)'}
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                {transactionType === 'cash_in'
                  ? 'Record pocket cash, funds received, or advance'
                  : 'Record operational cost, supplier bill, or staff payout'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form - Compact space-y-3 */}
        <form onSubmit={handleSubmit} className="px-5 py-3.5 space-y-3">
          {/* Transaction Type Selector (Default: Cash Out) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-300">
                Transaction Type
              </label>
              <span className="text-[10px] text-slate-500">
                {transactionType === 'cash_in' ? 'Money Inflow (+)' : 'Money Outflow (-)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('cash_out')
                  if (!categoryId || categoryId === cashInCategoryId) {
                    setCategoryId(activeExpenseCategories[0]?.id || '')
                  }
                  setIsCatDropdownOpen(false)
                  setCatSearchQuery('')
                }}
                className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  transactionType === 'cash_out'
                    ? 'bg-rose-600/20 border border-rose-500/60 text-rose-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight size={14} className="text-rose-400 stroke-[2.5]" />
                <span>Cash Out (Expense)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransactionType('cash_in')
                  if (cashInCategoryId) {
                    setCategoryId(cashInCategoryId)
                  }
                  setIsCatDropdownOpen(false)
                  setCatSearchQuery('')
                }}
                className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  transactionType === 'cash_in'
                    ? 'bg-emerald-600/20 border border-emerald-500/60 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft size={14} className="text-emerald-400 stroke-[2.5]" />
                <span>Cash In (Paisa Aaya)</span>
              </button>
            </div>
          </div>

          {/* Row 1: Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Picker */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Date <span className="text-rose-400">*</span>
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
                  className={`w-full px-3 py-1.5 rounded-xl bg-slate-950 border text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.date ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.date && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                  <AlertCircle size={12} /> {errors.date}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">
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
                  placeholder="e.g. 10000"
                  className={`w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-950 border text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.amount ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-700'
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                  <AlertCircle size={12} /> {errors.amount}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Category Dropdown (Shown for both Cash Out and Cash In) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-300">
                {transactionType === 'cash_in' ? 'Category / Source Type' : 'Expense Category'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              {!isCreatingInlineCat && (
                <button
                  type="button"
                  onClick={() => setIsCreatingInlineCat(true)}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add new category</span>
                </button>
              )}
            </div>

            {/* Inline Category Creation Input */}
            {isCreatingInlineCat ? (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-blue-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-400">
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
              <div className="relative" ref={catDropdownRef}>
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                  className={`w-full px-3 py-1.5 rounded-xl bg-slate-950 border text-xs sm:text-sm flex items-center justify-between text-left transition-all ${
                    errors.categoryId
                      ? 'border-rose-500/80 bg-rose-500/5'
                      : isCatDropdownOpen
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {currentSelectedCategory ? (
                      <>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCategoryColor(currentSelectedCategory) }}
                        />
                        <span className="text-white font-medium truncate">
                          {currentSelectedCategory.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500">Select a category</span>
                    )}
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                      isCatDropdownOpen ? 'rotate-180 text-blue-400' : ''
                    }`}
                  />
                </button>

                {/* Searchable Dropdown Menu */}
                {isCatDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-slate-800 bg-slate-950/70">
                      <div className="relative">
                        <Search
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          ref={catSearchInputRef}
                          type="text"
                          value={catSearchQuery}
                          onChange={(e) => setCatSearchQuery(e.target.value)}
                          placeholder="Search category..."
                          className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        {catSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCatSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Options List */}
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => {
                          const isSelected = cat.id === categoryId
                          const color = getCategoryColor(cat)
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryId(cat.id)
                                setIsCatDropdownOpen(false)
                                if (errors.categoryId) {
                                  setErrors((prev) => ({ ...prev, categoryId: '' }))
                                }
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                                isSelected
                                  ? 'bg-blue-600/20 text-blue-300 font-semibold'
                                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate">{cat.name}</span>
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-blue-400 flex-shrink-0" />
                              )}
                            </button>
                          )
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400 space-y-2">
                          <p>No category matches &quot;{catSearchQuery}&quot;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewCatName(catSearchQuery.trim())
                              setIsCreatingInlineCat(true)
                              setIsCatDropdownOpen(false)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-colors"
                          >
                            <Plus size={12} />
                            <span>Create &quot;{catSearchQuery.trim()}&quot;</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action: Add New Category */}
                    <div className="p-1 border-t border-slate-800 bg-slate-950/40">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCatDropdownOpen(false)
                          setIsCreatingInlineCat(true)
                          if (catSearchQuery.trim()) {
                            setNewCatName(catSearchQuery.trim())
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors text-left"
                      >
                        <Plus size={13} />
                        <span>Add new category...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errors.categoryId && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                <AlertCircle size={12} /> {errors.categoryId}
              </p>
            )}
          </div>

          {/* Row 3: Payment Mode Pills */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-300">
              Payment Mode <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Banknote size={14} />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMode === 'upi'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <QrCode size={14} />
                <span>UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('bank_transfer')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMode === 'bank_transfer'
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Building2 size={14} />
                <span>Bank Transfer</span>
              </button>
            </div>
            {errors.paymentMode && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                <AlertCircle size={12} /> {errors.paymentMode}
              </p>
            )}
          </div>

          {/* Row 4: Paid To OR Received From */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-300">
              {transactionType === 'cash_in'
                ? 'Received From / Source'
                : 'Paid To / Vendor / Beneficiary'}{' '}
              <span className="text-slate-500 font-normal text-[10px]">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder={
                  transactionType === 'cash_in'
                    ? 'e.g. Pocket Cash, Owner, Dr. Sharma, Bank Withdrawal, Advance...'
                    : 'e.g. Ivoclar Vivadent India, Ramesh Verma, Landlord...'
                }
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Row 5: Notes (Optional) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-300">
              Notes / Transaction Remarks{' '}
              <span className="text-slate-500 font-normal text-[10px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Daily cash in hand, invoice #9482, remarks..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-1.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                transactionType === 'cash_in'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-600/30'
              }`}
            >
              {isSaving
                ? 'Saving…'
                : isEditing
                ? 'Update Record'
                : transactionType === 'cash_in'
                ? 'Save Cash In'
                : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
