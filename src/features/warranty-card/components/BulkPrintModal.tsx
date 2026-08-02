import { useState } from 'react'
import { X, Printer, FileText } from 'lucide-react'

interface BulkPrintModalProps {
  isOpen: boolean
  onClose: () => void
  onPrint: (from: number, to: number) => Promise<void>
}

function parseNum(val: string): number | null {
  const n = parseInt(val, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function BulkPrintModal({ isOpen, onClose, onPrint }: BulkPrintModalProps) {
  const [fromStr, setFromStr] = useState('')
  const [toStr, setToStr] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const from = parseNum(fromStr)
  const to = parseNum(toStr)

  const selectedCards = from !== null && to !== null && to >= from ? to - from + 1 : 0
  const pagesToPrint = Math.ceil(selectedCards / 4)

  const handlePrint = async () => {
    if (from === null || to === null || to < from) return
    setIsProcessing(true)
    try {
      await onPrint(from, to)
    } finally {
      setIsProcessing(false)
      setFromStr('')
      setToStr('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Bulk Print Warranty Cards</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">From Serial No.</label>
              <input
                type="number"
                min={1}
                value={fromStr}
                onChange={(e) => setFromStr(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">To Serial No.</label>
              <input
                type="number"
                min={1}
                value={toStr}
                onChange={(e) => setToStr(e.target.value)}
                placeholder="e.g. 4"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Live calculation */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Selected Cards</span>
              <span className="text-white font-semibold font-mono">{selectedCards}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Pages to Print</span>
              <span className="text-white font-semibold font-mono">{pagesToPrint}</span>
            </div>
          </div>

          {/* Read-only paper info */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-800 p-4">
            <FileText size={18} className="text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Paper</p>
              <p className="text-xs text-slate-400">A4 Photo Paper (260 GSM)</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={isProcessing || selectedCards === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Preparing...' : <Printer size={16} />}
              {isProcessing ? 'Preparing...' : 'Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
