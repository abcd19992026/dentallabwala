import React, { useState, useEffect, useRef } from 'react'
import { Calendar, SlidersHorizontal, X, Check, RotateCcw } from 'lucide-react'
import { daysInMonth } from '../utils/calculations'
import { formatMonthName } from '../utils/currencyFormatter'

interface DayRangeFilterProps {
  selectedMonth: string // YYYY-MM
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  onApplyRange: (startDate: string, endDate: string) => void
  onClear: () => void
}

export const DayRangeFilter: React.FC<DayRangeFilterProps> = ({
  selectedMonth,
  startDate,
  endDate,
  onApplyRange,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const totalDays = daysInMonth(selectedMonth)

  // Local state for popover draft values
  const [fromDay, setFromDay] = useState<number>(1)
  const [toDay, setToDay] = useState<number>(totalDays)

  // Sync draft days with external props when opened
  useEffect(() => {
    if (startDate && startDate.startsWith(selectedMonth)) {
      const day = parseInt(startDate.split('-')[2], 10)
      if (!isNaN(day)) setFromDay(day)
    } else {
      setFromDay(1)
    }

    if (endDate && endDate.startsWith(selectedMonth)) {
      const day = parseInt(endDate.split('-')[2], 10)
      if (!isNaN(day)) setToDay(Math.min(day, totalDays))
    } else {
      setToDay(totalDays)
    }
  }, [startDate, endDate, selectedMonth, totalDays, isOpen])

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const isFiltered = Boolean(startDate || endDate)
  const activeFromDay = startDate ? parseInt(startDate.split('-')[2], 10) : 1
  const activeToDay = endDate ? parseInt(endDate.split('-')[2], 10) : totalDays

  const handleApply = (fDay = fromDay, tDay = toDay) => {
    const safeFrom = Math.min(fDay, tDay)
    const safeTo = Math.max(fDay, tDay)
    const startStr = `${selectedMonth}-${String(safeFrom).padStart(2, '0')}`
    const endStr = `${selectedMonth}-${String(safeTo).padStart(2, '0')}`
    onApplyRange(startStr, endStr)
    setIsOpen(false)
  }

  const handlePreset = (presetStart: number, presetEnd: number) => {
    const endClamped = Math.min(presetEnd, totalDays)
    setFromDay(presetStart)
    setToDay(endClamped)
    handleApply(presetStart, endClamped)
  }

  const handleReset = () => {
    onClear()
    setIsOpen(false)
  }

  // Days array for dropdown (1 to totalDays)
  const daysList = Array.from({ length: totalDays }, (_, i) => i + 1)

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      {isFiltered ? (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold shadow-sm transition-all">
          <Calendar size={13} className="text-cyan-400 flex-shrink-0" />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="hover:underline tracking-tight"
            title="Click to change date range"
          >
            {activeFromDay} - {activeToDay} {formatMonthName(selectedMonth).slice(0, 3)}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="ml-1 p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear date filter"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            isOpen
              ? 'bg-slate-800 border-blue-500 text-white shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white shadow-sm'
          }`}
        >
          <SlidersHorizontal size={13} className="text-slate-400 flex-shrink-0" />
          <span>Filter Date</span>
        </button>
      )}

      {/* Sleek Popover Modal */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 z-50 w-72 rounded-2xl bg-slate-900 border border-slate-700/80 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight">
                Filter Days in {formatMonthName(selectedMonth)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Select custom days (1 to {totalDays})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="py-3 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Quick Ranges
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handlePreset(1, 10)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  fromDay === 1 && toDay === 10
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                1st - 10th
              </button>
              <button
                type="button"
                onClick={() => handlePreset(11, 20)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  fromDay === 11 && toDay === 20
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                11th - 20th
              </button>
              <button
                type="button"
                onClick={() => handlePreset(21, totalDays)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  fromDay === 21 && toDay === totalDays
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                21st - {totalDays}th
              </button>
            </div>
          </div>

          {/* Custom Day Dropdowns */}
          <div className="py-2.5 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Custom Range
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 block">From Day</label>
                <select
                  value={fromDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setFromDay(val)
                    if (val > toDay) setToDay(val)
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {daysList.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-white">
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 block">To Day</label>
                <select
                  value={toDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setToDay(val)
                    if (val < fromDay) setFromDay(val)
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {daysList.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-white">
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Popover Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-1">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              <RotateCcw size={12} />
              <span>Full Month</span>
            </button>

            <button
              type="button"
              onClick={() => handleApply()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
            >
              <Check size={13} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

