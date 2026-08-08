import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { DoctorPayment, PaymentMode } from '@/types/doctorLedger.types'

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (paymentData: Omit<DoctorPayment, 'id' | 'lab_id' | 'doctor_id'>, paymentId?: string) => Promise<void>
  /** Payment record being edited, if any */
  editingPayment?: DoctorPayment | null
}

export function AddPaymentModal({ isOpen, onClose, onSave, editingPayment }: AddPaymentModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [paymentDate, setPaymentDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash')
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill form when editing, or reset when adding
  useEffect(() => {
    if (!isOpen) return
    if (editingPayment) {
      setPaymentDate(editingPayment.payment_date || today)
      setAmount(editingPayment.amount ? String(editingPayment.amount) : '')
      setPaymentMode(editingPayment.payment_mode || 'Cash')
      setRemarks(editingPayment.remarks || '')
    } else {
      setPaymentDate(today)
      setAmount('')
      setPaymentMode('Cash')
      setRemarks('')
    }
  }, [isOpen, editingPayment, today])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave({
        payment_date: paymentDate || today,
        amount: amount ? parseFloat(amount) : 0,
        payment_mode: paymentMode,
        remarks,
      }, editingPayment?.id)
      // Reset form
      setPaymentDate(today)
      setAmount('')
      setPaymentMode('Cash')
      setRemarks('')
      onClose()
    } catch (err) {
      console.error('Error saving payment entry:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {editingPayment ? 'Edit Payment' : 'Add Payment'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Transaction ID / Cheque No. / Notes"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingPayment ? 'Update Payment' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
