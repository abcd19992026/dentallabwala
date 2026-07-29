import { useState } from 'react'
import { X, Printer, Loader2 } from 'lucide-react'

interface PrintPopupProps {
  isOpen: boolean
  onClose: () => void
  onPrint: (mode: 'main' | 'custom', clinicName?: string) => Promise<void>
  onDownloadPDF: (mode: 'main' | 'custom', clinicName?: string) => Promise<void>
}

export function PrintPopup({ isOpen, onClose, onPrint, onDownloadPDF }: PrintPopupProps) {
  const [selectedMode, setSelectedMode] = useState<'main' | 'custom' | null>(null)
  const [clinicName, setClinicName] = useState('')
  const [action, setAction] = useState<'print' | 'pdf' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleAction = async (type: 'print' | 'pdf') => {
    if (!selectedMode) return
    if (selectedMode === 'custom' && !clinicName.trim()) return
    setAction(type)
    setIsProcessing(true)
    try {
      if (type === 'print') {
        await onPrint(selectedMode, clinicName.trim() || undefined)
      } else {
        await onDownloadPDF(selectedMode, clinicName.trim() || undefined)
      }
    } finally {
      setIsProcessing(false)
      setAction(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Print Warranty Card</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-400">Choose a template to print:</p>

          <div className="space-y-3">
            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${selectedMode === 'main' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-600'}`}>
              <input
                type="radio"
                name="printMode"
                value="main"
                checked={selectedMode === 'main'}
                onChange={() => setSelectedMode('main')}
                className="accent-violet-500"
              />
              <div>
                <p className="text-sm font-medium text-white">Main Lab</p>
                <p className="text-xs text-slate-400">Template A — Front & Back</p>
              </div>
            </label>

            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${selectedMode === 'custom' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-600'}`}>
              <input
                type="radio"
                name="printMode"
                value="custom"
                checked={selectedMode === 'custom'}
                onChange={() => setSelectedMode('custom')}
                className="accent-violet-500"
              />
              <div>
                <p className="text-sm font-medium text-white">Custom Clinic</p>
                <p className="text-xs text-slate-400">Template B — Front & Back</p>
              </div>
            </label>
          </div>

          {selectedMode === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Clinic Name</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Sunrise Dental Clinic"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction('print')}
              disabled={!selectedMode || isProcessing || (selectedMode === 'custom' && !clinicName.trim())}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isProcessing && action === 'print' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              Print
            </button>
            <button
              onClick={() => handleAction('pdf')}
              disabled={!selectedMode || isProcessing || (selectedMode === 'custom' && !clinicName.trim())}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isProcessing && action === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
