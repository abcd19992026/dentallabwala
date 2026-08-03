import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { DoctorSupply } from '@/types/doctorLedger.types'

interface AddSupplyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (supplyData: Omit<DoctorSupply, 'id' | 'lab_id' | 'doctor_id'>, supplyId?: string) => Promise<void>
  /** Logged-in lab's Studio Code, used for the field label (e.g. "RDS No.") */
  studioCode?: string
  /** Supply record being edited, if any */
  editingSupply?: DoctorSupply | null
}

export function AddSupplyModal({ isOpen, onClose, onSave, studioCode, editingSupply }: AddSupplyModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [entryDate, setEntryDate] = useState(today)
  const [caseNo, setCaseNo] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [patientName, setPatientName] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [toothNo, setToothNo] = useState('')
  const [unitCount, setUnitCount] = useState('1')
  const [billingAmount, setBillingAmount] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill form when editing, or reset when adding
  useEffect(() => {
    if (!isOpen) return
    if (editingSupply) {
      setEntryDate(editingSupply.entry_date || today)
      setCaseNo(editingSupply.case_no || '')
      setDoctorName(editingSupply.doctor_name || '')
      setPatientName(editingSupply.patient_name || '')
      setWorkDescription(editingSupply.work_description || '')
      setToothNo(editingSupply.tooth_no || '')
      setUnitCount(String(editingSupply.unit_count || 1))
      setBillingAmount(editingSupply.billing_amount ? String(editingSupply.billing_amount) : '')
      setDeliveryDate(editingSupply.delivery_date || '')
      setRemarks(editingSupply.remarks || '')
    } else {
      setEntryDate(today)
      setCaseNo('')
      setDoctorName('')
      setPatientName('')
      setWorkDescription('')
      setToothNo('')
      setUnitCount('1')
      setBillingAmount('')
      setDeliveryDate('')
      setRemarks('')
    }
  }, [isOpen, editingSupply, today])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave({
        entry_date: entryDate || today,
        case_no: caseNo,
        doctor_name: doctorName,
        patient_name: patientName,
        work_description: workDescription,
        tooth_no: toothNo,
        unit_count: unitCount ? parseInt(unitCount, 10) : 1,
        billing_amount: billingAmount ? parseFloat(billingAmount) : 0,
        delivery_date: deliveryDate || null,
        remarks,
      }, editingSupply?.id)
      // Reset form
      setEntryDate(today)
      setCaseNo('')
      setDoctorName('')
      setPatientName('')
      setWorkDescription('')
      setToothNo('')
      setUnitCount('1')
      setBillingAmount('')
      setDeliveryDate('')
      setRemarks('')
      onClose()
    } catch (err) {
      console.error('Error saving supply entry:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {editingSupply ? 'Edit Supply Entry' : 'Add Supply Entry'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                {studioCode?.trim() ? `${studioCode.trim().toUpperCase()} No.` : 'Case Number'}
              </label>
              <input
                type="text"
                value={caseNo}
                onChange={(e) => setCaseNo(e.target.value)}
                placeholder={studioCode?.trim() ? `${studioCode.trim().toUpperCase()} No.` : 'Case Number'}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Doctor Name
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Doctor Name (optional)"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Patient Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient Name"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Work
              </label>
              <input
                type="text"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="ZIRCONIA / PFM / CROWN"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Tooth Number
              </label>
              <input
                type="text"
                value={toothNo}
                onChange={(e) => setToothNo(e.target.value)}
                placeholder="11, 12, 46"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unit
              </label>
              <input
                type="number"
                min="1"
                value={unitCount}
                onChange={(e) => setUnitCount(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Billing Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                value={billingAmount}
                onChange={(e) => setBillingAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
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
              {isSubmitting ? 'Saving...' : editingSupply ? 'Update Supply' : 'Save Supply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
