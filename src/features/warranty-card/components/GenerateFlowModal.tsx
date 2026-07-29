import { useState } from 'react'
import { X, CheckCircle2, Building2, Stethoscope } from 'lucide-react'

interface GenerateFlowModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'main' | 'custom') => void
}

export function GenerateFlowModal({ isOpen, onClose, onSelect }: GenerateFlowModalProps) {
  const [selected, setSelected] = useState<'main' | 'custom' | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Generate Warranty Card For</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${selected === 'main' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-600'}`}>
            <input
              type="radio"
              name="generationType"
              value="main"
              checked={selected === 'main'}
              onChange={() => setSelected('main')}
              className="accent-violet-500"
            />
            <Building2 size={20} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Main Lab</p>
              <p className="text-xs text-slate-400">Template A — Front & Back</p>
            </div>
          </label>

          <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${selected === 'custom' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-600'}`}>
            <input
              type="radio"
              name="generationType"
              value="custom"
              checked={selected === 'custom'}
              onChange={() => setSelected('custom')}
              className="accent-violet-500"
            />
            <Stethoscope size={20} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Custom Clinic</p>
              <p className="text-xs text-slate-400">Template B — Front & Back</p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
