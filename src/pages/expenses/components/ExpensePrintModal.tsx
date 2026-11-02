import React, { useState, useMemo, useEffect } from 'react'
import { X, Printer } from 'lucide-react'
import type { ExpenseEntry, Category } from '../types'
import { ExpensePrintLayout } from './ExpensePrintLayout'
import { daysInMonth } from '../utils/calculations'
import { formatMonthName } from '../utils/currencyFormatter'

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

interface LabDetails {
  lab_name: string
  address: string
  mobile: string
  whatsapp_number: string
  logoUrl: string
}

interface ExpensePrintModalProps {
  isOpen: boolean
  onClose: () => void
  expenses: ExpenseEntry[]
  categories: Category[]
  cashInCategoryId?: string
  selectedMonth: string  // YYYY-MM
  labDetails: LabDetails
}

export const ExpensePrintModal: React.FC<ExpensePrintModalProps> = ({
  isOpen,
  onClose,
  expenses,
  categories,
  cashInCategoryId,
  selectedMonth,
  labDetails,
}) => {
  const totalDays = daysInMonth(selectedMonth)
  const [yearNum, monthNum] = selectedMonth.split('-').map(Number)

  // ── Filter State ──
  const [selCatId, setSelCatId] = useState('all')
  const [dateMode, setDateMode] = useState<'full' | 'custom'>('full')
  const [fromDay, setFromDay] = useState(1)
  const [toDay, setToDay] = useState(totalDays)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [isPrinting, setIsPrinting] = useState(false)

  // Reset all filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelCatId('all')
      setDateMode('full')
      setFromDay(1)
      setToDay(totalDays)
      setSortOrder('newest')
    }
  }, [isOpen, totalDays])

  // Category map
  const catMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((c) => map.set(c.id, c))
    return map
  }, [categories])

  // Active expense categories (no Cash In)
  const activeCats = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.is_active &&
          c.id !== cashInCategoryId &&
          c.name.toLowerCase() !== 'cash in'
      ),
    [categories, cashInCategoryId]
  )

  // Computed date strings for filtering
  const safeFrom = Math.min(fromDay, toDay)
  const safeTo = Math.max(fromDay, toDay)

  const fromDateStr = useMemo(
    () =>
      dateMode === 'full'
        ? `${selectedMonth}-01`
        : `${selectedMonth}-${String(safeFrom).padStart(2, '0')}`,
    [dateMode, selectedMonth, safeFrom]
  )

  const toDateStr = useMemo(
    () =>
      dateMode === 'full'
        ? `${selectedMonth}-${String(totalDays).padStart(2, '0')}`
        : `${selectedMonth}-${String(safeTo).padStart(2, '0')}`,
    [dateMode, selectedMonth, totalDays, safeTo]
  )

  // Filtered + sorted entries (Cash In always excluded)
  const filteredEntries = useMemo(() => {
    const isCashIn = (e: ExpenseEntry): boolean => {
      if (e.title === 'Cash In' || e.title?.startsWith('Cash In')) return true
      if (cashInCategoryId && e.category_id === cashInCategoryId) return true
      return catMap.get(e.category_id)?.name.toLowerCase() === 'cash in'
    }

    let result = expenses.filter((e) => {
      if (isCashIn(e)) return false
      return e.expense_date >= fromDateStr && e.expense_date <= toDateStr
    })

    if (selCatId !== 'all') {
      result = result.filter((e) => e.category_id === selCatId)
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.expense_date.localeCompare(a.expense_date) || b.id.localeCompare(a.id)
      }
      return a.expense_date.localeCompare(b.expense_date) || a.id.localeCompare(b.id)
    })

    return result
  }, [expenses, catMap, cashInCategoryId, fromDateStr, toDateStr, selCatId, sortOrder])

  const totalAmount = useMemo(
    () => filteredEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [filteredEntries]
  )

  // Human-readable date labels for the print layout header
  const makeDateLabel = (day: number): string =>
    `${String(day).padStart(2, '0')} ${MONTHS_SHORT[monthNum - 1]} ${yearNum}`

  const fromLabel =
    dateMode === 'full' ? makeDateLabel(1) : makeDateLabel(safeFrom)
  const toLabel =
    dateMode === 'full' ? makeDateLabel(totalDays) : makeDateLabel(safeTo)
  const categoryLabel =
    selCatId === 'all' ? 'All Categories' : catMap.get(selCatId)?.name ?? 'Unknown'

  // Day options array
  const dayOptions = Array.from({ length: totalDays }, (_, i) => i + 1)

  // Format currency for summary panel
  const fmtAmtShort = (n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

  // ── Print Handler (same approach as Doctor Ledger) ──
  const handlePrint = async () => {
    setIsPrinting(true)
    let pw: Window | null = null
    try {
      pw = window.open('', '_blank', 'width=900,height=700')
      if (!pw) {
        alert('Popup blocked. Please allow popups for this site and try again.')
        return
      }

      pw.document.open()
      pw.document.write(
        '<!DOCTYPE html><html><head><title>Payment Statement</title></head><body style="margin:0;padding:0;background:#fff"></body></html>'
      )
      pw.document.close()

      // Copy all app styles into the popup
      document.querySelectorAll('style').forEach((el) =>
        pw!.document.head.appendChild(el.cloneNode(true))
      )
      document.querySelectorAll('link[rel="stylesheet"]').forEach((el) =>
        pw!.document.head.appendChild(el.cloneNode(true))
      )

      // Clone the rendered print layout
      const src = document.querySelector('.printable-expense-statement')
      if (!src) {
        alert('Print layout not found. Please try again.')
        pw.close()
        return
      }
      pw.document.body.appendChild(src.cloneNode(true))

      // Wait for styles + fonts to load
      await new Promise<void>((resolve) => {
        const deadline = Date.now() + 5000
        const check = () => {
          const ready = Array.from(pw!.document.styleSheets).every((sheet) => {
            try {
              sheet.cssRules
              return true
            } catch {
              return false
            }
          })
          if (ready || Date.now() > deadline) resolve()
          else setTimeout(check, 50)
        }
        check()
      })
      await pw.document.fonts.ready
      await new Promise((r) => setTimeout(r, 200))

      pw.onafterprint = () => pw?.close()
      pw.print()

      // Fallback close
      setTimeout(() => {
        try {
          if (pw && !pw.closed) pw.close()
        } catch { /* noop */ }
      }, 8000)
    } catch (err) {
      console.error('Expense print failed:', err)
      alert('Failed to prepare print. Please try again.')
      pw?.close()
    } finally {
      setIsPrinting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-[95vw] h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Printer size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Print Statement</h2>
              <p className="text-[11px] text-slate-400">{formatMonthName(selectedMonth)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── BODY: LEFT FILTERS + RIGHT PREVIEW ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT PANEL: Filters ── */}
          <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-950">
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Category Filter */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Category
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelCatId('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      selCatId === 'all'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {activeCats.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelCatId(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        selCatId === cat.id
                          ? 'bg-slate-700 border-slate-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Date Range
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="dateMode"
                      checked={dateMode === 'full'}
                      onChange={() => setDateMode('full')}
                      className="accent-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-200 font-medium group-hover:text-white transition-colors">
                      Full Month ({formatMonthName(selectedMonth)})
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="dateMode"
                      checked={dateMode === 'custom'}
                      onChange={() => setDateMode('custom')}
                      className="accent-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-200 font-medium group-hover:text-white transition-colors">
                      Custom Range
                    </span>
                  </label>
                </div>

                {dateMode === 'custom' && (
                  <div className="mt-3 space-y-2.5 pl-0.5">
                    {/* Quick Presets */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: '1–10', from: 1, to: 10 },
                        { label: '11–20', from: 11, to: 20 },
                        { label: `21–${totalDays}`, from: 21, to: totalDays },
                      ].map((preset) => {
                        const isActive =
                          safeFrom === preset.from &&
                          safeTo === Math.min(preset.to, totalDays)
                        return (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setFromDay(preset.from)
                              setToDay(Math.min(preset.to, totalDays))
                            }}
                            className={`py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              isActive
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Custom Day Dropdowns */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                          From Day
                        </label>
                        <select
                          value={fromDay}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setFromDay(v)
                            if (v > toDay) setToDay(v)
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {dayOptions.map((d) => (
                            <option key={d} value={d} className="bg-slate-900">
                              Day {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                          To Day
                        </label>
                        <select
                          value={toDay}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setToDay(v)
                            if (v < fromDay) setFromDay(v)
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {dayOptions.map((d) => (
                            <option key={d} value={d} className="bg-slate-900">
                              Day {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sort Order */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Sort Order
                </p>
                <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <button
                    onClick={() => setSortOrder('newest')}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      sortOrder === 'newest'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Newest First
                  </button>
                  <button
                    onClick={() => setSortOrder('oldest')}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      sortOrder === 'oldest'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Oldest First
                  </button>
                </div>
              </div>
            </div>

            {/* ── Summary + Action Buttons (sticky bottom) ── */}
            <div className="border-t border-slate-800 p-4 space-y-3 flex-shrink-0">
              {/* Summary */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Entries</span>
                  <span className="font-bold text-white">{filteredEntries.length}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-slate-400">Total Amount</span>
                  <span className="font-bold text-emerald-400">
                    ₹{fmtAmtShort(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={isPrinting || filteredEntries.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Printer size={13} />
                  {isPrinting ? 'Preparing…' : 'Print Now'}
                </button>
              </div>

              {filteredEntries.length === 0 && (
                <p className="text-[10px] text-slate-500 text-center">
                  No entries match the selected filters.
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Live Print Preview ── */}
          <div className="flex-1 bg-slate-300 overflow-y-auto p-6">
            <div
              className="mx-auto shadow-2xl rounded-sm ring-1 ring-black/10"
              style={{ maxWidth: '750px' }}
            >
              <ExpensePrintLayout
                labName={labDetails.lab_name}
                labAddress={labDetails.address}
                mobileNumber={labDetails.mobile}
                whatsappNumber={labDetails.whatsapp_number}
                logoUrl={labDetails.logoUrl}
                entries={filteredEntries}
                categories={categories}
                fromLabel={fromLabel}
                toLabel={toLabel}
                categoryLabel={categoryLabel}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

