import type { ExpenseEntry, Category, PaymentMode } from '../types'

interface ExpensePrintLayoutProps {
  labName: string
  labAddress?: string
  mobileNumber?: string
  whatsappNumber?: string
  logoUrl?: string
  entries: ExpenseEntry[]      // Already filtered (Cash In removed)
  categories: Category[]
  fromLabel: string            // e.g. "01 Oct 2026"
  toLabel: string              // e.g. "31 Oct 2026"
  categoryLabel: string        // "All Categories" or "Salary" etc.
}

function fmtDate(d?: string | null): string {
  if (!d) return ''
  const p = d.split('-')
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0].slice(-2)}` : d
}

function fmtAmt(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n || 0)
}

function fmtMode(mode: PaymentMode): string {
  switch (mode) {
    case 'cash': return 'Cash'
    case 'upi': return 'UPI'
    case 'bank_transfer': return 'Bank Transfer'
    default: return mode
  }
}

export function ExpensePrintLayout({
  labName,
  labAddress,
  mobileNumber,
  whatsappNumber,
  logoUrl,
  entries,
  categories,
  fromLabel,
  toLabel,
  categoryLabel,
}: ExpensePrintLayoutProps) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  return (
    <div className="printable-expense-statement bg-white text-black font-sans p-6 text-[11px] select-text">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body {
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-hidden { display: none !important; }
          .printable-expense-statement table { page-break-inside: auto; }
          .printable-expense-statement thead { display: table-header-group; }
          .printable-expense-statement tbody tr { page-break-inside: avoid; }
          .printable-expense-statement .overflow-x-auto { overflow: visible !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-5 gap-4">
        {/* Logo */}
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Lab Logo"
              className="max-h-16 max-w-16 object-contain"
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* Center: Lab Name, Address, Title */}
        <div className="flex-1 text-center">
          {labName && (
            <p className="text-[22px] font-extrabold uppercase leading-tight text-black">
              {labName}
            </p>
          )}
          {labAddress && (
            <p className="text-[11px] font-semibold text-black mt-0.5">{labAddress}</p>
          )}
          <div className="border-t border-b border-black mt-2 py-1">
            <p className="font-bold text-[12px] uppercase tracking-widest text-black">
              PAYMENT STATEMENT
            </p>
          </div>
          <p className="text-[10px] font-medium text-black mt-1">
            Period: {fromLabel} — {toLabel}
          </p>
        </div>

        {/* Right: Phone + WhatsApp */}
        <div className="flex-shrink-0 text-right text-[11px] space-y-1.5 min-w-[120px]">
          {mobileNumber && (
            <p className="text-black flex items-center justify-end gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 inline flex-shrink-0"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12 19.79 19.79 0 0 1 1.06 3.38 2 2 0 0 1 3.05 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {mobileNumber}
            </p>
          )}
          {whatsappNumber && (
            <p className="text-black flex items-center justify-end gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#25D366"
                className="w-3 h-3 inline flex-shrink-0"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {whatsappNumber}
            </p>
          )}
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <div className="grid grid-cols-2 border border-black p-2 mb-3 text-[11px] font-medium">
        <div className="space-y-0.5">
          <p>
            <span className="font-bold">CATEGORY :</span>{' '}
            {categoryLabel.toUpperCase()}
          </p>
          <p>
            <span className="font-bold">TOTAL ENTRIES :</span> {entries.length}
          </p>
        </div>
        <div className="text-right space-y-0.5">
          <p>
            <span className="font-bold">PERIOD :</span>{' '}
            {fromLabel.toUpperCase()} – {toLabel.toUpperCase()}
          </p>
          <p>
            <span className="font-bold">TOTAL AMOUNT :</span> Rs. {fmtAmt(total)}/-
          </p>
        </div>
      </div>

      {/* ── MAIN TABLE ── */}
      <div className="overflow-x-auto print:overflow-visible mb-5">
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-100 print:bg-transparent font-bold">
              <th className="border border-black px-1.5 py-1.5 text-center w-8">S.NO</th>
              <th className="border border-black px-1.5 py-1.5 text-center w-14">DATE</th>
              <th className="border border-black px-2 py-1.5 text-left">PARTICULARS</th>
              <th className="border border-black px-1.5 py-1.5 text-center w-20">CATEGORY</th>
              <th className="border border-black px-1.5 py-1.5 text-center w-24">PAYMENT MODE</th>
              <th className="border border-black px-2 py-1.5 text-right w-24">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-black px-4 py-8 text-center italic text-slate-500"
                >
                  No expense entries for the selected period and filters.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const cat = catMap.get(entry.category_id)
                const catName = cat?.name || 'Uncategorized'

                // Smart Particulars: paid_to primary + notes secondary
                const primary =
                  entry.paid_to?.trim() || entry.notes?.trim() || catName
                const secondary =
                  entry.paid_to?.trim() && entry.notes?.trim()
                    ? entry.notes.trim()
                    : null

                return (
                  <tr key={entry.id} className="border-b border-black">
                    <td className="border border-black px-1.5 py-1.5 text-center">
                      {idx + 1}
                    </td>
                    <td className="border border-black px-1.5 py-1.5 text-center whitespace-nowrap">
                      {fmtDate(entry.expense_date)}
                    </td>
                    <td className="border border-black px-2 py-1.5">
                      <p className="font-semibold uppercase leading-snug">{primary}</p>
                      {secondary && (
                        <p className="text-[9px] text-slate-600 mt-0.5 leading-snug">
                          {secondary}
                        </p>
                      )}
                    </td>
                    <td className="border border-black px-1.5 py-1.5 text-center uppercase">
                      {catName}
                    </td>
                    <td className="border border-black px-1.5 py-1.5 text-center">
                      {fmtMode(entry.payment_mode)}
                    </td>
                    <td className="border border-black px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap">
                      Rs. {fmtAmt(entry.amount)}/-
                    </td>
                  </tr>
                )
              })
            )}

            {/* Total Row */}
            {entries.length > 0 && (
              <tr className="font-bold border-t-2 border-black bg-slate-100 print:bg-transparent">
                <td
                  colSpan={5}
                  className="border border-black px-2 py-1.5 text-right uppercase tracking-wide text-[11px]"
                >
                  Total Amount :
                </td>
                <td className="border border-black px-2 py-1.5 text-right font-mono font-extrabold whitespace-nowrap">
                  Rs. {fmtAmt(total)}/-
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t border-black pt-2 text-center text-[11px] font-bold text-black tracking-wide">
        Powered by Dentivo Software &nbsp;|&nbsp; www.cavoratechnologies.com &nbsp;|&nbsp; Enquiry: +91 9142639282
      </div>
    </div>
  )
}

