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
      <div className="text-center mb-4 space-y-1">
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
              <th className="border border-black px-1.5 py-1 text-center w-12">UNIT</th>
              <th className="border border-black px-2 py-1 text-right w-24">BILLING AMOUNT</th>
              <th className="border border-black px-2 py-1 text-right w-28">GRAND TOTAL AMOUNT</th>
              <th className="border border-black px-1.5 py-1 text-center w-20">DELIVERY DATE</th>
            </tr>
          </thead>
          <tbody>
            {filteredSupplies.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-black px-4 py-4 text-center text-slate-500 italic">
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
                    {doctor.name}
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
