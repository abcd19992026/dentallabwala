import { useState, useMemo } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { TEMPLATE_KEYS, type TemplateKey } from '../types/templateConfig.types'

interface TemplateSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (templateKey: TemplateKey) => void
  /** 'main' shows A templates, 'custom' shows B templates */
  generationType: 'main' | 'custom'
}

export function TemplateSelectModal({ isOpen, onClose, onSelect, generationType }: TemplateSelectModalProps) {
  const [selected, setSelected] = useState<TemplateKey | null>(null)
  const [dirty, setDirty] = useState(false)

  const filteredKeys = useMemo(() => {
    if (generationType === 'main') {
      return TEMPLATE_KEYS.filter((t) => t.key.startsWith('template_a'))
    }
    return TEMPLATE_KEYS.filter((t) => t.key.startsWith('template_b'))
  }, [generationType])

  // Reset selection when the filtered list changes
  const shownKeys = useMemo(() => filteredKeys.map((t) => t.key), [filteredKeys])
  if (isOpen && (!dirty || (selected && !shownKeys.includes(selected)))) {
    setSelected(shownKeys[0] as TemplateKey)
    setDirty(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Select Template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-400">Choose a template to configure:</p>
          {filteredKeys.map(({ key, label }) => (
            <label
              key={key}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                selected === key
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-slate-700 bg-slate-950 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="templateKey"
                value={key}
                checked={selected === key}
                onChange={() => setSelected(key)}
                className="accent-violet-500"
              />
              <span className="text-sm font-medium text-white">{label}</span>
            </label>
          ))}
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
