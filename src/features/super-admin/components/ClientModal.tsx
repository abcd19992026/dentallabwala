import { useState, type FormEvent, useEffect } from 'react'
import { X, Upload, Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { DentalLabClient, CreateClientInput } from '../types/client'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateClientInput) => Promise<void>
  initialData?: DentalLabClient | null
}

export function ClientModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: ClientModalProps) {
  const [labName, setLabName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [address, setAddress] = useState('')
  const [studioCode, setStudioCode] = useState('')
  const [password, setPassword] = useState('')

  // Template upload preview states (optional fields)
  const [templateAFront, setTemplateAFront] = useState<string>('')
  const [templateABack, setTemplateABack] = useState<string>('')
  const [templateBFront, setTemplateBFront] = useState<string>('')
  const [templateBBack, setTemplateBBack] = useState<string>('')
  const [templateAFrontFile, setTemplateAFrontFile] = useState<File | null>(null)
  const [templateABackFile, setTemplateABackFile] = useState<File | null>(null)
  const [templateBFrontFile, setTemplateBFrontFile] = useState<File | null>(null)
  const [templateBBackFile, setTemplateBBackFile] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setSuccessMessage(null)
    if (initialData) {
      setLabName(initialData.labName || '')
      setOwnerName(initialData.ownerName || '')
      setEmail(initialData.email || '')
      setMobileNumber(initialData.mobileNumber || '')
      setAddress(initialData.address || '')
      setStudioCode(initialData.studioCode || '')
      setTemplateAFront(initialData.templateAFrontUrl || '')
      setTemplateABack(initialData.templateABackUrl || '')
      setTemplateBFront(initialData.templateBFrontUrl || '')
      setTemplateBBack(initialData.templateBBackUrl || '')
    } else {
      setLabName('')
      setOwnerName('')
      setEmail('')
      setMobileNumber('')
      setAddress('')
      setStudioCode('')
      setPassword('')
      setTemplateAFront('')
      setTemplateABack('')
      setTemplateBFront('')
      setTemplateBBack('')
      setTemplateAFrontFile(null)
      setTemplateABackFile(null)
      setTemplateBFrontFile(null)
      setTemplateBBackFile(null)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    nameSetter: (val: string) => void,
    fileSetter: (file: File | null) => void,
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      nameSetter(file.name)
      fileSetter(file)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await onSave({
        labName,
        ownerName,
        email,
        mobileNumber,
        address,
        studioCode,
        password: password || undefined,
        templateAFrontUrl: templateAFront,
        templateABackUrl: templateABack,
        templateBFrontUrl: templateBFront,
        templateBBackUrl: templateBBack,
        templateAFrontFile: templateAFrontFile,
        templateABackFile: templateABackFile,
        templateBFrontFile: templateBFrontFile,
        templateBBackFile: templateBBackFile,
      })

      if (!initialData) {
        setSuccessMessage('Client created successfully.')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = !!initialData

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEditing ? 'Edit Client Details' : 'Add New Dental Lab'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Update existing dental lab details' : 'Register a new dental lab client'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed break-all">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-400 animate-bounce" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* General Information Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Client Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lab Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Lab Name</label>
                <input
                  type="text"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder="e.g. Apex Dental Lab"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Owner Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@apexdental.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Mobile Number</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Studio Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Studio Code</label>
                <input
                  type="text"
                  value={studioCode}
                  onChange={(e) => setStudioCode(e.target.value)}
                  placeholder="e.g. CDS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Password for new users */}
              {!isEditing && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Initial Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set initial password for lab login"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              {/* Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-slate-300">Lab Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full lab address..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Optional Template Files Upload Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                Template Files (Optional)
              </h4>
              <span className="text-[10px] text-slate-500">Upload SVG / Image files</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Template A Front */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-xs font-medium text-slate-300">Template A Front</p>
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 hover:border-violet-500/50 hover:bg-slate-900 cursor-pointer transition-all text-xs text-slate-400">
                  <Upload size={14} className="text-violet-400" />
                  <span className="truncate">{templateAFront || 'Choose File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.svg"
                    onChange={(e) => handleFileUpload(e, setTemplateAFront, setTemplateAFrontFile)}
                  />
                </label>
              </div>

              {/* Template A Back */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-xs font-medium text-slate-300">Template A Back</p>
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 hover:border-violet-500/50 hover:bg-slate-900 cursor-pointer transition-all text-xs text-slate-400">
                  <Upload size={14} className="text-violet-400" />
                  <span className="truncate">{templateABack || 'Choose File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.svg"
                    onChange={(e) => handleFileUpload(e, setTemplateABack, setTemplateABackFile)}
                  />
                </label>
              </div>

              {/* Template B Front */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-xs font-medium text-slate-300">Template B Front</p>
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 hover:border-violet-500/50 hover:bg-slate-900 cursor-pointer transition-all text-xs text-slate-400">
                  <Upload size={14} className="text-violet-400" />
                  <span className="truncate">{templateBFront || 'Choose File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.svg"
                    onChange={(e) => handleFileUpload(e, setTemplateBFront, setTemplateBFrontFile)}
                  />
                </label>
              </div>

              {/* Template B Back */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-xs font-medium text-slate-300">Template B Back</p>
                <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 hover:border-violet-500/50 hover:bg-slate-900 cursor-pointer transition-all text-xs text-slate-400">
                  <Upload size={14} className="text-violet-400" />
                  <span className="truncate">{templateBBack || 'Choose File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.svg"
                    onChange={(e) => handleFileUpload(e, setTemplateBBack, setTemplateBBackFile)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {isEditing ? 'Save Changes' : 'Create Client'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
