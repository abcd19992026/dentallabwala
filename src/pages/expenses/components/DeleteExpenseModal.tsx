import React from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import type { ExpenseEntry } from '../types'
import { formatIndianCurrency, formatDisplayDate } from '../utils/currencyFormatter'

interface DeleteExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: () => void
  expense: ExpenseEntry | null
  isDeleting?: boolean
}

export const DeleteExpenseModal: React.FC<DeleteExpenseModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  expense,
  isDeleting = false,
}) => {
  if (!isOpen || !expense) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Delete Expense Entry
              </h3>
              <p className="text-xs text-slate-400">
                Confirm removal of this record
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Are you sure you want to delete this expense record? This action cannot be undone.
          </p>

          {/* Expense Details Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-white text-sm">
                {expense.title}
              </span>
              <span className="font-bold text-rose-400 text-sm whitespace-nowrap">
                {formatIndianCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Date: {formatDisplayDate(expense.expense_date)}</span>
              {expense.paid_to && <span>Paid to: {expense.paid_to}</span>}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all"
          >
            <Trash2 size={14} />
            <span>{isDeleting ? 'Deleting…' : 'Delete Record'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
