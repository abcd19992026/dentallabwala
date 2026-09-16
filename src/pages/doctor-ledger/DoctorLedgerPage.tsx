import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft, Printer, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { doctorLedgerService } from '@/features/doctor-ledger/services/doctorLedger.service'
import { AddDoctorModal } from '@/features/doctor-ledger/components/AddDoctorModal'
import { AddSupplyModal } from '@/features/doctor-ledger/components/AddSupplyModal'
import { AddPaymentModal } from '@/features/doctor-ledger/components/AddPaymentModal'
import { DoctorPrintLayout } from '@/features/doctor-ledger/components/DoctorPrintLayout'
import type { Doctor, DoctorSupply, DoctorPayment } from '@/types/doctorLedger.types'
import { isDoctorProfileComplete, getMissingDoctorFields } from '@/types/doctorLedger.types'
import { isDoctorLedgerLockedForLab, DoctorLedgerLockedModal } from '@/lib/tempDoctorLedgerLock'

export default function DoctorLedgerPage() {
  const { labId } = useAuthStore()
  const { tenant } = useTenantStore()
  const navigate = useNavigate()
  const effectiveLabId = labId || tenant?.id || ''
  const isLocked = isDoctorLedgerLockedForLab(effectiveLabId)

  // Logged-in Client Lab Details
  const [labDetails, setLabDetails] = useState<{ lab_name: string; address: string; studio_code: string; mobile: string; whatsapp_number: string; logoUrl: string }>({
    lab_name: '',
    address: '',
    studio_code: '',
    mobile: '',
    whatsapp_number: '',
    logoUrl: '',
  })

  // View state: 'list' | 'profile'
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Data states
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [supplies, setSupplies] = useState<DoctorSupply[]>([])
  const [payments, setPayments] = useState<DoctorPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Doctor Profile Tab State: 'supply' | 'payment' | 'print'
  const [profileTab, setProfileTab] = useState<'supply' | 'payment' | 'print'>('supply')

  // Print Tab Date Range
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)

  // Modals
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false)
  const [isAddSupplyOpen, setIsAddSupplyOpen] = useState(false)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)

  // Supply being edited (null = adding new)
  const [editingSupply, setEditingSupply] = useState<DoctorSupply | null>(null)

  // Payment being edited (null = adding new)
  const [editingPayment, setEditingPayment] = useState<DoctorPayment | null>(null)

  // Doctor being edited (null = adding new)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)

  // Success toast message
  const [successMessage, setSuccessMessage] = useState('')

  // Warning toast message (shown when an incomplete doctor profile is blocked)
  const [warningMessage, setWarningMessage] = useState('')

  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => setSuccessMessage(''), 2500)
    return () => clearTimeout(t)
  }, [successMessage])

  useEffect(() => {
    if (!warningMessage) return
    const t = setTimeout(() => setWarningMessage(''), 4000)
    return () => clearTimeout(t)
  }, [warningMessage])

  // Fetch Logged-in Client Lab Info from database
  useEffect(() => {
    async function loadLabInfo() {
      if (!effectiveLabId || isLocked) return
      const info = await doctorLedgerService.getLabInfo(effectiveLabId)
      if (info && info.lab_name) {
        setLabDetails({
          lab_name: info.lab_name,
          address: info.address || '',
          studio_code: info.studio_code || '',
          mobile: info.mobile || '',
          whatsapp_number: info.whatsapp_number || '',
          logoUrl: info.logoUrl || '',
        })
      } else if (tenant?.name) {
        setLabDetails({
          lab_name: tenant.name,
          address: '',
          studio_code: '',
          mobile: '',
          whatsapp_number: '',
          logoUrl: '',
        })
      }
    }
    loadLabInfo()
  }, [effectiveLabId, tenant, isLocked])

  // Load doctors on mount
  useEffect(() => {
    if (isLocked) return
    async function loadDoctorsData() {
      setIsLoading(true)
      try {
        const fetchedDoctors = await doctorLedgerService.getDoctors(effectiveLabId)
        setDoctors(fetchedDoctors)
      } catch (err) {
        console.error('Failed to load doctors:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadDoctorsData()
  }, [effectiveLabId, isLocked])

  // Load supplies and payments when activeDoctor changes
  useEffect(() => {
    if (!activeDoctor || isLocked) {
      setSupplies([])
      setPayments([])
      return
    }

    const currentDocId = activeDoctor.id

    async function loadDoctorDetails() {
      try {
        const [fetchedSupplies, fetchedPayments] = await Promise.all([
          doctorLedgerService.getSupplies(effectiveLabId, currentDocId),
          doctorLedgerService.getPayments(effectiveLabId, currentDocId),
        ])
        setSupplies(fetchedSupplies)
        setPayments(fetchedPayments)
      } catch (err) {
        console.error('Failed to load doctor details:', err)
      }
    }
    loadDoctorDetails()
  }, [activeDoctor, effectiveLabId, isLocked])

  // Filtered doctors list for instant search
  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors
    const q = searchQuery.toLowerCase().trim()
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.clinic_name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q)
    )
  }, [doctors, searchQuery])

  // Doctor Profile Calculations
  const calculations = useMemo(() => {
    const openingBalance = Number(activeDoctor?.opening_balance) || 0
    const totalWorkAmount = supplies.reduce((sum, s) => sum + (Number(s.billing_amount) || 0), 0)
    const totalPaymentReceived = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const currentBalance = openingBalance + totalWorkAmount - totalPaymentReceived
    return {
      openingBalance,
      totalWorkAmount,
      totalPaymentReceived,
      currentBalance,
    }
  }, [activeDoctor, supplies, payments])

  // Collapsed state tracking for month-grouped Payment History
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})

  // Group payment records by Month-Year (chronologically newest to oldest, with payments inside also newest to oldest)
  const groupedPayments = useMemo(() => {
    if (!payments.length) return []

    // Sort all payments (latest date first)
    const sorted = [...payments].sort((a, b) => {
      const dateA = a.payment_date || ''
      const dateB = b.payment_date || ''
      if (dateA !== dateB) return dateB.localeCompare(dateA)
      return (b.created_at || '').localeCompare(a.created_at || '')
    })

    // Group by month key "YYYY-MM"
    const groupsMap = new Map<string, { monthKey: string; monthLabel: string; items: DoctorPayment[]; totalAmount: number }>()

    for (const p of sorted) {
      let monthKey = 'Unknown'
      let monthLabel = 'Unknown Month'

      if (p.payment_date && p.payment_date.includes('-')) {
        const parts = p.payment_date.split('-')
        if (parts.length === 3) {
          const [y, m] = parts
          monthKey = `${y}-${m}`
          const dateObj = new Date(Number(y), Number(m) - 1, 1)
          monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
        }
      }

      if (!groupsMap.has(monthKey)) {
        groupsMap.set(monthKey, {
          monthKey,
          monthLabel,
          items: [],
          totalAmount: 0,
        })
      }

      const group = groupsMap.get(monthKey)!
      group.items.push(p)
      group.totalAmount += Number(p.amount) || 0
    }

    // Convert to array sorted by monthKey descending (Newest month -> Oldest month)
    return Array.from(groupsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  }, [payments])

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const mostRecentKey = groupedPayments.length > 0 ? groupedPayments[0].monthKey : ''
      const isCurrentlyCollapsed = monthKey in prev ? prev[monthKey] : monthKey !== mostRecentKey
      return {
        ...prev,
        [monthKey]: !isCurrentlyCollapsed,
      }
    })
  }

  // Handlers
  const handleSaveDoctor = async (
    doctorData: Partial<Omit<Doctor, 'id' | 'lab_id'>>,
    doctorId?: string
  ) => {
    if (doctorId) {
      const updated = await doctorLedgerService.updateDoctor(effectiveLabId, doctorId, doctorData)
      if (updated) {
        setDoctors((prev) => prev.map((d) => (d.id === doctorId ? updated : d)))
        setSuccessMessage('Doctor updated successfully.')
      }
    } else {
      const created = await doctorLedgerService.createDoctor(effectiveLabId, doctorData)
      setDoctors((prev) => [created, ...prev])
    }
  }

  const handleEditDoctor = (doc: Doctor) => {
    setEditingDoctor(doc)
    setIsAddDoctorOpen(true)
  }

  const handleDoctorCardClick = (doc: Doctor) => {
    if (!isDoctorProfileComplete(doc)) {
      const missing = getMissingDoctorFields(doc)
      setWarningMessage(
        `Please complete the missing details (${missing.join(', ')}) before opening ${doc.name || 'this doctor'}'s ledger.`
      )
      handleEditDoctor(doc)
      return
    }
    setActiveDoctor(doc)
  }

  const handleSaveSupply = async (
    supplyData: Omit<DoctorSupply, 'id' | 'lab_id' | 'doctor_id'>,
    supplyId?: string
  ) => {
    if (!activeDoctor) return

    if (supplyId) {
      // Edit mode: update existing record in place (position unchanged)
      const updated = await doctorLedgerService.updateSupply(
        effectiveLabId,
        supplyId,
        supplyData
      )
      if (updated) {
        setSupplies((prev) => prev.map((s) => (s.id === supplyId ? updated : s)))
      }
    } else {
      // Add mode: prepend new record to the top
      const created = await doctorLedgerService.addSupply(
        effectiveLabId,
        activeDoctor.id,
        supplyData
      )
      setSupplies((prev) => [...prev, created])
    }
  }

  const openEditSupply = (item: DoctorSupply) => {
    setEditingSupply(item)
    setIsAddSupplyOpen(true)
  }

  const handleSavePayment = async (
    paymentData: Omit<DoctorPayment, 'id' | 'lab_id' | 'doctor_id'>,
    paymentId?: string
  ) => {
    if (!activeDoctor) return

    if (paymentId) {
      // Edit mode: update existing record in place (position unchanged)
      const updated = await doctorLedgerService.updatePayment(
        effectiveLabId,
        paymentId,
        paymentData
      )
      if (updated) {
        setPayments((prev) => prev.map((p) => (p.id === paymentId ? updated : p)))
      }
    } else {
      // Add mode: prepend new record to the top
      const created = await doctorLedgerService.addPayment(
        effectiveLabId,
        activeDoctor.id,
        paymentData
      )
      setPayments((prev) => [created, ...prev])
    }
  }

  const openEditPayment = (payment: DoctorPayment) => {
    setEditingPayment(payment)
    setIsAddPaymentOpen(true)
  }

  const handleDeletePayment = async (payment: DoctorPayment) => {
    if (!window.confirm('Are you sure you want to delete this payment entry?')) return
    await doctorLedgerService.deletePayment(payment.id)
    setPayments((prev) => prev.filter((p) => p.id !== payment.id))
  }

  const handleGeneratePrint = async () => {
    if (!activeDoctor) return

    setIsPrinting(true)
    let printWindow: Window | null = null
    try {
      // Open a dedicated print popup isolated from the AppShell layout
      printWindow = window.open('', '_blank', 'width=1000,height=700')
      if (!printWindow) {
        alert('Popup blocked. Please allow popups for this site.')
        return
      }

      // Clean isolated document (no AppShell / sidebar / header)
      printWindow.document.open()
      printWindow.document.write(
        '<!DOCTYPE html><html><head><title>Doctor Ledger</title></head><body></body></html>'
      )
      printWindow.document.close()

      // Copy all app styles into the popup (Tailwind CSS + any <style> tags)
      const popupHead = printWindow.document.head
      document.querySelectorAll('style').forEach((el) => {
        popupHead.appendChild(el.cloneNode(true))
      })
      document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
        popupHead.appendChild(el.cloneNode(true))
      })

      // Clone ONLY the printable Doctor Ledger content
      const source = document.querySelector('.printable-doctor-ledger')
      if (!source) {
        throw new Error('Printable ledger content not found.')
      }
      printWindow.document.body.appendChild(source.cloneNode(true))

      // Wait until the popup document, styles, and fonts are fully loaded
      await new Promise<void>((resolve) => {
        const doc = printWindow!.document
        const deadline = Date.now() + 5000
        const check = () => {
          const stylesReady = Array.from(doc.styleSheets).every((sheet) => {
            try {
              sheet.cssRules
              return true
            } catch {
              return false
            }
          })
          if (stylesReady || Date.now() > deadline) resolve()
          else setTimeout(check, 50)
        }
        check()
      })
      await printWindow.document.fonts.ready
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Open the native browser print dialog (Chrome auto-paginates)
      printWindow.onafterprint = () => {
        printWindow?.close()
        setIsPrinting(false)
      }
      printWindow.print()

      // Fallback close if onafterprint didn't fire
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.close()
            setIsPrinting(false)
          }
        } catch { }
      }, 8000)
    } catch (err) {
      console.error('Failed to prepare doctor ledger print:', err)
      alert('Failed to prepare print layout.')
      if (printWindow && !printWindow.closed) printWindow.close()
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDeleteSupply = async (supply: DoctorSupply) => {
    if (!window.confirm('Are you sure you want to delete this supply entry?')) return
    await doctorLedgerService.deleteSupply(supply.id)
    setSupplies((prev) => prev.filter((s) => s.id !== supply.id))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const [y, m, d] = parts
      return `${d}.${m}.${y.slice(-2)}`
    }
    return dateStr
  }

  if (isLocked) {
    return (
      <DoctorLedgerLockedModal
        isOpen
        onClose={() => navigate('/app/dashboard')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 md:p-6 print:p-0 print:bg-white">
      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. DOCTOR LEDGER HOME PAGE (DOCTOR LIST VIEW)           */}
      {/* ──────────────────────────────────────────────────────── */}
      {!activeDoctor && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar: ONLY Add Doctor button & Search box */}
          <div className="bg-white p-4 rounded border border-slate-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <button
              onClick={() => {
                setEditingDoctor(null)
                setIsAddDoctorOpen(true)
              }}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>

            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Doctor..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>

          {/* Doctor List */}
          {isLoading ? (
            <div className="bg-white p-8 text-center text-slate-500 rounded border border-slate-300">
              Loading doctor list...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-500 rounded border border-slate-300">
              {searchQuery ? 'No doctors found matching search.' : 'No doctors added yet. Click "Add Doctor" to begin.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => {
                const isComplete = isDoctorProfileComplete(doc)
                return (
                <div
                  key={doc.id}
                  onClick={() => handleDoctorCardClick(doc)}
                  className={`bg-white p-5 rounded border shadow-sm hover:shadow-md cursor-pointer transition-all space-y-2 relative ${isComplete ? 'border-slate-300 hover:border-blue-600' : 'border-amber-400 hover:border-amber-500'
                    }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditDoctor(doc)
                    }}
                    className="absolute top-2.5 right-2.5 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Edit Doctor"
                    type="button"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 pr-6">
                    <h3 className="font-bold text-base text-slate-900 uppercase">
                      {doc.name || 'Unnamed Doctor'}
                    </h3>
                    {!isComplete && (
                      <span className="shrink-0 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                        Incomplete
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-700">Clinic:</span>{' '}
                      {doc.clinic_name || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Phone:</span>{' '}
                      {doc.phone || '-'}
                    </p>
                    <p className="pt-1 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">Initial Opening Balance:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">
                        ₹{formatCurrency(doc.opening_balance)}
                      </span>
                    </p>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. DOCTOR PROFILE VIEW                                  */}
      {/* ──────────────────────────────────────────────────────── */}
      {activeDoctor && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Bar & Back Button */}
          <div className="print:hidden">
            <button
              onClick={() => {
                setActiveDoctor(null)
                setIsPrinting(false)
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Doctors
            </button>

            {/* Doctor Info Card */}
            <div className="bg-white p-5 rounded border border-slate-300 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                <div>
                  <h2 className="text-xl font-bold uppercase text-slate-900">
                    {activeDoctor.name || 'Doctor Ledger'}
                  </h2>
                  <p className="text-sm font-medium text-slate-600">
                    {activeDoctor.clinic_name || 'Clinic Name'}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase block">
                    Current Balance
                  </span>
                  <span className="text-xl font-extrabold font-mono text-blue-800">
                    ₹{formatCurrency(calculations.currentBalance)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Phone Number</span>
                  <span className="font-semibold text-slate-800">{activeDoctor.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Address</span>
                  <span className="font-semibold text-slate-800">{activeDoctor.address || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Initial Opening Balance</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{formatCurrency(calculations.openingBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Work Billed</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{formatCurrency(calculations.totalWorkAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* EXACTLY THREE TABS: 1. Supply  2. Payment  3. Print */}
            <div className="flex border-b border-slate-300 bg-white rounded-t mt-4">
              <button
                onClick={() => {
                  setProfileTab('supply')
                  setIsPrinting(false)
                }}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'supply'
                  ? 'border-blue-700 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                1. Supply
              </button>
              <button
                onClick={() => {
                  setProfileTab('payment')
                  setIsPrinting(false)
                }}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'payment'
                  ? 'border-blue-700 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                2. Payment
              </button>
              <button
                onClick={() => {
                  setProfileTab('print')
                }}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'print'
                  ? 'border-blue-700 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
              >
                3. Print
              </button>
            </div>
          </div>

          {/* TAB 1: SUPPLY TAB */}
          {profileTab === 'supply' && (
            <div className="bg-white p-5 rounded-b border border-slate-300 shadow-sm space-y-4 print:hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-800">Supply Records</h3>
                <button
                  onClick={() => {
                    setEditingSupply(null)
                    setIsAddSupplyOpen(true)
                  }}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Supply
                </button>
              </div>

              {/* Supply Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="border border-slate-300 p-2 text-center">Date</th>
                      <th className="border border-slate-300 p-2 text-center">
                        {labDetails.studio_code?.trim() ? labDetails.studio_code.trim().toUpperCase() : 'Case No.'}
                      </th>
                      <th className="border border-slate-300 p-2 text-left">Doctor Name</th>
                      <th className="border border-slate-300 p-2 text-left">Patient Name</th>
                      <th className="border border-slate-300 p-2 text-left">Work</th>
                      <th className="border border-slate-300 p-2 text-center">Tooth No.</th>
                      <th className="border border-slate-300 p-2 text-right">Per Unit Charge</th>
                      <th className="border border-slate-300 p-2 text-center">Unit</th>
                      <th className="border border-slate-300 p-2 text-right">Billing Amount</th>
                      <th className="border border-slate-300 p-2 text-center">Delivery Date</th>
                      <th className="border border-slate-300 p-2 text-left">Remarks</th>
                      <th className="border border-slate-300 p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplies.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-slate-500 italic">
                          No supply entries recorded yet. Click "Add Supply" above to add work entries.
                        </td>
                      </tr>
                    ) : (
                      supplies.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                          <td className="border border-slate-300 p-2 text-center font-medium">
                            {formatDate(item.entry_date)}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-medium">
                            {item.case_no || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 uppercase font-medium">
                            {item.doctor_name || ''}
                          </td>
                          <td className="border border-slate-300 p-2 uppercase font-medium">
                            {item.patient_name || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 uppercase font-medium">
                            {item.work_description || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            {item.tooth_no || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-semibold">
                            ₹{formatCurrency(item.per_unit_charge)}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-semibold">
                            {item.unit_count}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
                            ₹{formatCurrency(item.billing_amount)}
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            {formatDate(item.delivery_date)}
                          </td>
                          <td className="border border-slate-300 p-2 text-slate-600">
                            {item.remarks || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditSupply(item)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit Supply"
                                type="button"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSupply(item)}
                                className="text-red-400 hover:text-red-700 transition-colors"
                                title="Delete Supply"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENT TAB */}
          {profileTab === 'payment' && (
            <div className="bg-white p-5 rounded-b border border-slate-300 shadow-sm space-y-4 print:hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-800">Payment History</h3>
                <button
                  onClick={() => {
                    setEditingPayment(null)
                    setIsAddPaymentOpen(true)
                  }}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Payment
                </button>
              </div>

              {/* Payment History Grouped by Month (Newest -> Oldest) */}
              {groupedPayments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 italic border border-slate-300 rounded bg-slate-50">
                  No payment entries recorded yet. Click "Add Payment" above.
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedPayments.map((group) => {
                    const mostRecentKey = groupedPayments.length > 0 ? groupedPayments[0].monthKey : ''
                    const isCollapsed = group.monthKey in collapsedMonths ? collapsedMonths[group.monthKey] : group.monthKey !== mostRecentKey
                    return (
                      <div key={group.monthKey} className="border border-slate-300 rounded overflow-hidden shadow-sm">
                        {/* Month Header Banner */}
                        <button
                          type="button"
                          onClick={() => toggleMonthCollapse(group.monthKey)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200/80 transition-colors text-left select-none border-b border-slate-300"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            )}
                            <span className="font-bold text-sm text-slate-900 tracking-wide uppercase">
                              {group.monthLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                            <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                              {group.items.length} {group.items.length === 1 ? 'Payment' : 'Payments'}
                            </span>
                            <span className="font-mono text-slate-900 font-bold text-sm">
                              ₹{formatCurrency(group.totalAmount)}
                            </span>
                          </div>
                        </button>

                        {/* Month Payment Rows Table (when expanded) */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                                  <th className="border-r border-b border-slate-300 p-2 text-center w-28">Date</th>
                                  <th className="border-r border-b border-slate-300 p-2 text-right w-36">Amount</th>
                                  <th className="border-r border-b border-slate-300 p-2 text-center w-36">Payment Mode</th>
                                  <th className="border-r border-b border-slate-300 p-2 text-left">Remarks</th>
                                  <th className="border-b border-slate-300 p-2 text-center w-24">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((p) => (
                                  <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-200 last:border-b-0">
                                    <td className="border-r border-slate-200 p-2 text-center font-medium">
                                      {formatDate(p.payment_date)}
                                    </td>
                                    <td className="border-r border-slate-200 p-2 text-right font-mono font-bold text-green-700">
                                      ₹{formatCurrency(p.amount)}
                                    </td>
                                    <td className="border-r border-slate-200 p-2 text-center font-semibold">
                                      {p.payment_mode}
                                    </td>
                                    <td className="border-r border-slate-200 p-2 text-slate-600">
                                      {p.remarks || '-'}
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => openEditPayment(p)}
                                          className="text-blue-600 hover:text-blue-800 transition-colors"
                                          title="Edit Payment"
                                          type="button"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePayment(p)}
                                          className="text-red-400 hover:text-red-700 transition-colors"
                                          title="Delete Payment"
                                          type="button"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRINT TAB */}
          {profileTab === 'print' && (
            <div className="space-y-6">
              {/* Controls Box (Hidden during actual print execution) */}
              <div className="bg-white p-5 rounded-b border border-slate-300 shadow-sm space-y-4 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleGeneratePrint}
                    className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded text-sm shadow-sm transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Generate Print
                  </button>
                </div>
              </div>

              {/* Printable Component Layout */}
              <div className={isPrinting ? 'block' : 'block print:block border border-slate-300 bg-white p-2 rounded'}>
                <DoctorPrintLayout
                  labName={labDetails.lab_name || tenant?.name || ''}
                  labAddress={labDetails.address}
                  doctor={activeDoctor}
                  supplies={supplies}
                  payments={payments}
                  fromDate={fromDate}
                  toDate={toDate}
                  printLabName={labDetails.lab_name || tenant?.name || ''}
                  printLabAddress={labDetails.address}
                  studioCode={labDetails.studio_code}
                  mobileNumber={labDetails.mobile}
                  whatsappNumber={labDetails.whatsapp_number}
                  logoUrl={labDetails.logoUrl}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[70] bg-emerald-600 text-white px-4 py-2 rounded shadow-lg text-sm">
          {successMessage}
        </div>
      )}

      {/* Warning Toast (incomplete doctor profile blocked) */}
      {warningMessage && (
        <div className="fixed top-4 right-4 z-[70] bg-amber-600 text-white px-4 py-2 rounded shadow-lg text-sm max-w-sm">
          {warningMessage}
        </div>
      )}

      {/* Modals */}
      <AddDoctorModal
        isOpen={isAddDoctorOpen}
        onClose={() => {
          setIsAddDoctorOpen(false)
          setEditingDoctor(null)
        }}
        onSave={handleSaveDoctor}
        editingDoctor={editingDoctor}
      />

      {activeDoctor && (
        <>
          <AddSupplyModal
            isOpen={isAddSupplyOpen}
            onClose={() => {
              setIsAddSupplyOpen(false)
              setEditingSupply(null)
            }}
            onSave={handleSaveSupply}
            studioCode={labDetails.studio_code}
            editingSupply={editingSupply}
          />

          <AddPaymentModal
            isOpen={isAddPaymentOpen}
            onClose={() => {
              setIsAddPaymentOpen(false)
              setEditingPayment(null)
            }}
            onSave={handleSavePayment}
            editingPayment={editingPayment}
          />
        </>
      )}
    </div>
  )
}
