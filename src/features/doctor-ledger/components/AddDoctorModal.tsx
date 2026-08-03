import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Doctor } from '@/types/doctorLedger.types'

interface AddDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (doctorData: Partial<Omit<Doctor, 'id' | 'lab_id'>>, doctorId?: string) => Promise<void>
  /** Doctor being edited, if any */
  editingDoctor?: Doctor | null
}

export function AddDoctorModal({ isOpen, onClose, onSave, editingDoctor }: AddDoctorModalProps) {
  const [doctorName, setDoctorName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill form when editing, or reset when adding
  useEffect(() => {
    if (!isOpen) return
    if (editingDoctor) {
      setDoctorName(editingDoctor.name || '')
      setClinicName(editingDoctor.clinic_name || '')
      setPhoneNumber(editingDoctor.phone || '')
      setAddress(editingDoctor.address || '')
      setOpeningBalance(editingDoctor.opening_balance ? String(editingDoctor.opening_balance) : '')
    } else {
      setDoctorName('')
      setClinicName('')
      setPhoneNumber('')
      setAddress('')
      setOpeningBalance('')
    }
  }, [isOpen, editingDoctor])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave({
        name: doctorName,
        clinic_name: clinicName,
        phone: phoneNumber,
        address,
        opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
      }, editingDoctor?.id)
      // Reset form
      setDoctorName('')
      setClinicName('')
      setPhoneNumber('')
      setAddress('')
      setOpeningBalance('')
      onClose()
    } catch (err) {
      console.error('Error saving doctor:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Doctor Name
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. John Doe"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Clinic Name
            </label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Dental Care Clinic"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Clinic street address, City"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Opening Balance (₹)
            </label>
            <input
              type="number"
              step="any"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Form Actions */}
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
              {isSubmitting ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Save Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
