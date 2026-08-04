import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { MATERIAL_TYPES } from '../types/warrantyCard.types'
import type { MaterialType, WarrantyCard, WarrantyCardFormData } from '../types/warrantyCard.types'

interface GenerateCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: WarrantyCardFormData, cardId?: string) => Promise<void>
  generationType: 'main' | 'custom'
  /** Card being edited, if any */
  editingCard?: WarrantyCard | null
}

function calcValidTill(issueDate: string, years: number): string {
  if (!issueDate || !years) return ''
  const d = new Date(issueDate)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split('T')[0]
}

export function GenerateCardModal({ isOpen, onClose, onSave, generationType, editingCard }: GenerateCardModalProps) {
  const [labDentist, setLabDentist] = useState('')
  const [patientName, setPatientName] = useState('')
  const [toothNo, setToothNo] = useState('')
  const [regNo, setRegNo] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const [issueDate, setIssueDate] = useState(today)
  const [warrantyYears, setWarrantyYears] = useState(1)
  const [validTill, setValidTill] = useState(calcValidTill(today, 1))
  const [materialType, setMaterialType] = useState<MaterialType>('Zirconia')
  const [clinicName, setClinicName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Pre-fill form when editing, or reset when adding
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSuccess(null)
    if (editingCard) {
      const years = parseInt(editingCard.warranty, 10) || 1
      setLabDentist(editingCard.lab_dentist || '')
      setPatientName(editingCard.patient_name || '')
      setToothNo(editingCard.tooth_no || '')
      setRegNo(editingCard.reg_no || '')
      setIssueDate(editingCard.issue_date || today)
      setWarrantyYears(years)
      setValidTill(editingCard.valid_till || calcValidTill(editingCard.issue_date, years))
      setMaterialType((editingCard.material_type as MaterialType) || 'Zirconia')
      setClinicName(editingCard.clinic_name || '')
    } else {
      setLabDentist('')
      setPatientName('')
      setToothNo('')
      setRegNo('')
      setIssueDate(today)
      setWarrantyYears(1)
      setValidTill(calcValidTill(today, 1))
      setMaterialType('Zirconia')
      setClinicName('')
    }
  }, [isOpen, editingCard, today])

  if (!isOpen) return null

  const handleWarrantyChange = (val: number) => {
    setWarrantyYears(val)
    setValidTill(calcValidTill(issueDate, val))
  }

  const handleIssueDateChange = (val: string) => {
    setIssueDate(val)
    setValidTill(calcValidTill(val, warrantyYears))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await onSave({
        lab_dentist: labDentist,
        patient_name: patientName,
        tooth_no: toothNo,
        reg_no: regNo,
        issue_date: issueDate,
        valid_till: validTill,
        warranty: String(warrantyYears),
        authorised_code: '',
        material_type: materialType,
        clinic_name: generationType === 'custom' && clinicName.trim() ? clinicName.trim() : null,
      }, editingCard?.id)
      setSuccess(editingCard ? 'Warranty card updated successfully.' : 'Warranty card generated successfully.')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">
            {editingCard ? 'Edit Warranty Card' : 'Generate Warranty Card'}
            <span className="ml-2 text-xs font-medium text-slate-400">
              {generationType === 'main' ? '(Main Lab)' : '(Custom Clinic)'}
            </span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm break-all">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 size={20} />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Lab / Dentist</label>
              <input
                type="text"
                value={labDentist}
                onChange={(e) => setLabDentist(e.target.value)}
                placeholder="e.g. Dr. Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tooth No.</label>
              <input
                type="text"
                value={toothNo}
                onChange={(e) => setToothNo(e.target.value)}
                placeholder="e.g. 11, 12, 46"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reg. No.</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="e.g. REG-001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => handleIssueDateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Warranty (Years)</label>
              <input
                type="number"
                min={1}
                value={warrantyYears}
                onChange={(e) => handleWarrantyChange(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Valid Till</label>
              <input
                type="date"
                value={validTill}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white/70 text-sm focus:outline-none cursor-default"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Material Type</label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {MATERIAL_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value}
                  </option>
                ))}
              </select>
            </div>

            {generationType === 'custom' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Custom Clinic Name</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. Sunrise Dental Clinic"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isSubmitting ? 'Saving...' : editingCard ? 'Update Card' : 'Generate Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
