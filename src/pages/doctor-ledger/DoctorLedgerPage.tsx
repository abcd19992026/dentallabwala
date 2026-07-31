import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, ArrowLeft, Printer, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { doctorLedgerService } from '@/features/doctor-ledger/services/doctorLedger.service'
import { AddDoctorModal } from '@/features/doctor-ledger/components/AddDoctorModal'
import { AddSupplyModal } from '@/features/doctor-ledger/components/AddSupplyModal'
import { AddPaymentModal } from '@/features/doctor-ledger/components/AddPaymentModal'
import { DoctorPrintLayout } from '@/features/doctor-ledger/components/DoctorPrintLayout'
import type { Doctor, DoctorSupply, DoctorPayment } from '@/types/doctorLedger.types'

export default function DoctorLedgerPage() {
  const { labId } = useAuthStore()
  const { tenant } = useTenantStore()
  const effectiveLabId = labId || tenant?.id || ''

  // Logged-in Client Lab Details
  const [labDetails, setLabDetails] = useState<{ lab_name: string; address: string; studio_code: string }>({
    lab_name: '',
    address: '',
    studio_code: '',
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

  // Fetch Logged-in Client Lab Info from database
  useEffect(() => {
    async function loadLabInfo() {
      if (!effectiveLabId) return
      const info = await doctorLedgerService.getLabInfo(effectiveLabId)
      if (info && info.lab_name) {
        setLabDetails({
          lab_name: info.lab_name,
          address: info.address || '',
          studio_code: info.studio_code || '',
        })
      } else if (tenant?.name) {
        setLabDetails({
          lab_name: tenant.name,
          address: '',
          studio_code: '',
        })
      }
    }
    loadLabInfo()
  }, [effectiveLabId, tenant])

  // Load doctors on mount
  useEffect(() => {
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
  }, [effectiveLabId])

  // Load supplies and payments when activeDoctor changes
  useEffect(() => {
    if (!activeDoctor) {
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
  }, [activeDoctor, effectiveLabId])

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

  // Handlers
  const handleSaveDoctor = async (doctorData: Partial<Omit<Doctor, 'id' | 'lab_id'>>) => {
    const created = await doctorLedgerService.createDoctor(effectiveLabId, doctorData)
    setDoctors((prev) => [created, ...prev])
  }

  const handleSaveSupply = async (
    supplyData: Omit<DoctorSupply, 'id' | 'lab_id' | 'doctor_id'>
  ) => {
    if (!activeDoctor) return
    const created = await doctorLedgerService.addSupply(
      effectiveLabId,
      activeDoctor.id,
      supplyData
    )
    setSupplies((prev) => [created, ...prev])
  }

  const handleSavePayment = async (
    paymentData: Omit<DoctorPayment, 'id' | 'lab_id' | 'doctor_id'>
  ) => {
    if (!activeDoctor) return
    const created = await doctorLedgerService.addPayment(
      effectiveLabId,
      activeDoctor.id,
      paymentData
    )
    setPayments((prev) => [created, ...prev])
  }

  const handleGeneratePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  const handleDeleteDoctor = async (doctor: Doctor, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete doctor "${doctor.name}"?`)) return
    if (activeDoctor?.id === doctor.id) {
      setActiveDoctor(null)
    }
    await doctorLedgerService.deleteDoctor(doctor.id)
    setDoctors((prev) => prev.filter((d) => d.id !== doctor.id))
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
              onClick={() => setIsAddDoctorOpen(true)}
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
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoctor(doc)}
                  className="bg-white p-5 rounded border border-slate-300 shadow-sm hover:border-blue-600 hover:shadow-md cursor-pointer transition-all space-y-2 relative"
                >
                  <button
                    onClick={(e) => handleDeleteDoctor(doc, e)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-700 transition-colors"
                    title="Delete Doctor"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-base text-slate-900 uppercase">
                    {doc.name || 'Unnamed Doctor'}
                  </h3>
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
                      <span className="font-semibold text-slate-700">Opening Balance:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">
                        ₹{formatCurrency(doc.opening_balance)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
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
                  <span className="text-slate-500 block">Opening Balance</span>
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
                  onClick={() => setIsAddSupplyOpen(true)}
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
                        {labDetails.studio_code?.trim() ? `${labDetails.studio_code.trim()} NO.`.toUpperCase() : 'Case No.'}
                      </th>
                      <th className="border border-slate-300 p-2 text-left">Patient Name</th>
                      <th className="border border-slate-300 p-2 text-left">Work</th>
                      <th className="border border-slate-300 p-2 text-center">Tooth No.</th>
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
                        <td colSpan={10} className="p-6 text-center text-slate-500 italic">
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
                            {item.patient_name || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 uppercase font-medium">
                            {item.work_description || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            {item.tooth_no || '-'}
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
                            <button
                              onClick={() => handleDeleteSupply(item)}
                              className="text-red-400 hover:text-red-700 transition-colors"
                              title="Delete Supply"
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                  onClick={() => setIsAddPaymentOpen(true)}
                  className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Payment
                </button>
              </div>

              {/* Payment Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="border border-slate-300 p-2 text-center">Date</th>
                      <th className="border border-slate-300 p-2 text-right">Amount</th>
                      <th className="border border-slate-300 p-2 text-center">Payment Mode</th>
                      <th className="border border-slate-300 p-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                          No payment entries recorded yet. Click "Add Payment" above.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-200">
                          <td className="border border-slate-300 p-2 text-center font-medium">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold text-green-700">
                            ₹{formatCurrency(p.amount)}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-semibold">
                            {p.payment_mode}
                          </td>
                          <td className="border border-slate-300 p-2 text-slate-600">
                            {p.remarks || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddDoctorModal
        isOpen={isAddDoctorOpen}
        onClose={() => setIsAddDoctorOpen(false)}
        onSave={handleSaveDoctor}
      />

      {activeDoctor && (
        <>
          <AddSupplyModal
            isOpen={isAddSupplyOpen}
            onClose={() => setIsAddSupplyOpen(false)}
            onSave={handleSaveSupply}
            studioCode={labDetails.studio_code}
          />

          <AddPaymentModal
            isOpen={isAddPaymentOpen}
            onClose={() => setIsAddPaymentOpen(false)}
            onSave={handleSavePayment}
          />
        </>
      )}
    </div>
  )
}
