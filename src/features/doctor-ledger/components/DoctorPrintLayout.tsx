import type { Doctor, DoctorSupply, DoctorPayment } from '@/types/doctorLedger.types'

interface DoctorPrintLayoutProps {
  labName: string
  labAddress?: string
  doctor: Doctor
  supplies: DoctorSupply[]
  payments: DoctorPayment[]
  fromDate?: string
  toDate?: string
  printLabName?: string
  printLabAddress?: string
  studioCode?: string
  mobileNumber?: string
  whatsappNumber?: string
  logoUrl?: string
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}.${m}.${y.slice(-2)}`
  }
  return dateStr
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount || 0)
}

export function DoctorPrintLayout({
  doctor,
  supplies,
  payments,
  fromDate,
  toDate,
  printLabName,
  printLabAddress,
  studioCode,
  mobileNumber,
  whatsappNumber,
  logoUrl,
}: DoctorPrintLayoutProps) {
  // Filter supplies & payments by date range if provided
  const filteredSupplies = supplies.filter((item) => {
    if (fromDate && item.entry_date < fromDate) return false
    if (toDate && item.entry_date > toDate) return false
    return true
  })

  const filteredPayments = payments.filter((p) => {
    if (fromDate && p.payment_date < fromDate) return false
    if (toDate && p.payment_date > toDate) return false
    return true
  })

  // Calculations
  const openingBalance = Number(doctor.opening_balance) || 0
  const totalWorkAmount = filteredSupplies.reduce((sum, s) => sum + (Number(s.billing_amount) || 0), 0)
  const totalUnits = filteredSupplies.reduce((sum, s) => sum + (Number(s.unit_count) || 0), 0)
  const totalPaymentReceived = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const finalDueAmount = openingBalance + totalWorkAmount - totalPaymentReceived

  const fromFormatted = fromDate ? formatDate(fromDate) : '____'
  const toFormatted = toDate ? formatDate(toDate) : '____'

  return (
    <div className="printable-doctor-ledger bg-white text-black font-sans p-6 text-xs select-text">
      {/* ─── PRINT MEDIA CSS STYLING ─── */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-hidden {
            display: none !important;
          }

          /* Let the ledger table flow across multiple pages */
          .printable-doctor-ledger table {
            page-break-inside: auto;
          }

          /* Repeat the table header on every printed page */
          .printable-doctor-ledger thead {
            display: table-header-group;
          }

          /* Never split a single row across pages */
          .printable-doctor-ledger tbody tr {
            page-break-inside: avoid;
          }

          /* Keep rows within the printable area */
          .printable-doctor-ledger tbody tr {
            page-break-after: auto;
          }

          /* Do not clip the table during print (overflow wrapper) */
          .printable-doctor-ledger .overflow-x-auto {
            overflow: visible !important;
          }

          /* Keep Payment History + Summary together as one unit */
          .printable-doctor-ledger .ledger-bottom {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ─── HEADER SECTION ─── */}
      <div className="flex items-start justify-between mb-4 gap-4">
        {/* Left: Lab Logo */}
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Lab Logo"
              className="max-h-30 max-w-20 object-contain"
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* Center: Lab Name + Address */}
        <div className="flex-1 text-center space-y-1">
          {printLabName && (
            <p className="text-2xl font-bold uppercase text-center text-black">
              {printLabName}
            </p>
          )}
          {printLabAddress && (
            <p className="text-sm font-semibold uppercase text-center text-black">
              {printLabAddress}
            </p>
          )}
          <p className="font-bold text-xs uppercase tracking-wider text-black pt-1">
            LEDGER ACCOUNT
          </p>
          <p className="font-bold text-xs uppercase tracking-wide text-black">
            FINAL BILL FROM {fromFormatted} TO {toFormatted}
          </p>
        </div>

        {/* Right: Mobile + WhatsApp */}
        <div className="flex-shrink-0 text-right text-xs space-y-1">
          {mobileNumber && (
            <p className="text-black flex items-center justify-end gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              {mobileNumber}
            </p>
          )}
          {whatsappNumber && (
            <p className="text-black flex items-center justify-end gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" className="w-3 h-3 inline"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              {whatsappNumber}
            </p>
          )}
        </div>
      </div>

      {/* ─── DOCTOR DETAILS HEADER BAR ─── */}
      <div className="grid grid-cols-2 gap-4 border border-black p-2 mb-3 bg-slate-50 print:bg-transparent font-medium">
        <div>
          <p><span className="font-bold">Doctor Name:</span> {doctor.name || 'N/A'}</p>
          <p><span className="font-bold">Clinic Name:</span> {doctor.clinic_name || 'N/A'}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold">Phone:</span> {doctor.phone || 'N/A'}</p>
          <p><span className="font-bold">Address:</span> {doctor.address || 'N/A'}</p>
        </div>
      </div>

      {/* ─── SUPPLIES / WORK TABLE ─── */}
      <div className="mb-4 overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="border-b border-black bg-slate-100 print:bg-transparent font-bold">
              <th className="border border-black px-1.5 py-1 text-center w-16">DATE</th>
              <th className="border border-black px-1.5 py-1 text-center w-20">
                {studioCode?.trim() ? `${studioCode.toUpperCase()} NO.` : 'CASE NO.'}
              </th>
              <th className="border border-black px-2 py-1 text-left">DOCTOR NAME</th>
              <th className="border border-black px-2 py-1 text-left">PATIENT NAME</th>
              <th className="border border-black px-2 py-1 text-left">WORK</th>
              <th className="border border-black px-1.5 py-1 text-center w-16">TOOTH NO.</th>
              <th className="border border-black px-1.5 py-1 text-right w-20">PER UNIT CHARGE</th>
              <th className="border border-black px-1.5 py-1 text-center w-12">UNIT</th>
              <th className="border border-black px-2 py-1 text-right w-24">BILLING AMOUNT</th>
              <th className="border border-black px-2 py-1 text-right w-28">GRAND TOTAL AMOUNT</th>
              <th className="border border-black px-1.5 py-1 text-center w-20">DELIVERY DATE</th>
            </tr>
          </thead>
          <tbody>
            {filteredSupplies.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-black px-4 py-4 text-center text-slate-500 italic">
                  No work entries for the selected period.
                </td>
              </tr>
            ) : (
              filteredSupplies.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-black">
                  <td className="border border-black px-1.5 py-1 text-center whitespace-nowrap">
                    {formatDate(item.entry_date)}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-center font-mono">
                    {item.case_no}
                  </td>
                  <td className="border border-black px-2 py-1 uppercase">
                    {item.doctor_name}
                  </td>
                  <td className="border border-black px-2 py-1 uppercase">
                    {item.patient_name}
                  </td>
                  <td className="border border-black px-2 py-1 uppercase">
                    {item.work_description}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-center">
                    {item.tooth_no}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-right font-mono">
                    Rs. {formatCurrency(item.per_unit_charge)}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-center font-semibold">
                    {item.unit_count}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono">
                    Rs. {formatCurrency(item.billing_amount)}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-mono font-bold">
                    Rs. {formatCurrency(item.billing_amount)}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-center whitespace-nowrap">
                    {formatDate(item.delivery_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── BOTTOM SECTION: PAYMENT HISTORY & SUMMARY CALCULATIONS ─── */}
      <div className="flex flex-row justify-between items-start gap-4 pt-2 ledger-bottom">
        {/* Payment History Box (Restored matching printed reference) */}
        <div className="flex-1 border-2 border-black p-3 bg-slate-50 print:bg-transparent text-xs">
          <h4 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs text-black">
            PAYMENT HISTORY
          </h4>
          {filteredPayments.length === 0 ? (
            <p className="text-slate-500 italic">No payments received for this period.</p>
          ) : (
            <ol className="space-y-1 list-decimal list-inside font-medium text-black">
              {filteredPayments.map((p, idx) => (
                <li key={p.id || idx} className="leading-snug">
                  Rs. <span className="font-mono font-bold">{formatCurrency(p.amount)}/-</span> through{' '}
                  <span className="font-semibold">{p.payment_mode}</span>
                  {p.payment_date ? ` on ${formatDate(p.payment_date)}` : ''}
                  {p.remarks ? ` (${p.remarks})` : ''}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 pt-1.5 border-t border-black font-bold flex justify-between text-black">
            <span>TOTAL AMOUNT PAID TILL {toFormatted}:</span>
            <span className="font-mono">Rs. {formatCurrency(totalPaymentReceived)}/-</span>
          </div>
          <div className="pt-1 text-xs text-black font-medium">
            i.e. Rs. {formatCurrency(openingBalance)} + Rs. {formatCurrency(totalWorkAmount)} - Rs. {formatCurrency(totalPaymentReceived)} = Rs. {formatCurrency(finalDueAmount)}/- (Till {toFormatted})
          </div>
        </div>

        {/* Summary Calculation Box */}
        <div className="w-96 border-2 border-black p-3 bg-slate-50 print:bg-transparent space-y-1 text-xs">
          <h4 className="font-bold border-b border-black pb-1 mb-2 uppercase text-xs text-black text-center">
            SUMMARY
          </h4>
          <div className="flex justify-between py-0.5 border-b border-slate-300">
            <span className="font-semibold text-black">Opening Balance:</span>
            <span className="font-mono font-bold">Rs. {formatCurrency(openingBalance)}/-</span>
          </div>

          <div className="flex justify-between py-0.5 border-b border-slate-300">
            <span className="font-semibold text-black">
              Total Units of Work (Till {toFormatted}):
            </span>
            <span className="font-mono font-bold">{totalUnits}</span>
          </div>

          <div className="flex justify-between py-0.5 border-b border-slate-300">
            <span className="font-semibold text-black">
              Total Amount of Work (Till {toFormatted}):
            </span>
            <span className="font-mono font-bold">Rs. {formatCurrency(totalWorkAmount)}/-</span>
          </div>

          <div className="flex justify-between py-0.5 border-b border-slate-300">
            <span className="font-semibold text-black">Total Payments:</span>
            <span className="font-mono font-bold text-black">
              Rs. {formatCurrency(totalPaymentReceived)}/-
            </span>
          </div>

          <div className="flex justify-between py-1 pt-1 font-extrabold text-sm border-t-2 border-black text-black">
            <span>Closing Due:</span>
            <span className="font-mono">Rs. {formatCurrency(finalDueAmount)}/-</span>
          </div>
        </div>
      </div>
    </div>
  )
}
