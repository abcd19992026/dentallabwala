// TEMPORARY LOCK — remove this file and its usages in Sidebar.tsx and
// DashboardPage.tsx to fully restore normal Doctor Ledger access.
//
// Frontend-only gate: blocks navigation into Doctor Ledger for specific
// lab_id(s). No database column, RLS policy, or backend check is involved.
// Does not affect Warranty Card or any other feature/lab.
export const TEMP_LOCKED_LAB_IDS = ['48e9b9f8-2362-4fcc-ab42-ff03327bab45']

export function isDoctorLedgerLockedForLab(labId: string | null): boolean {
  return !!labId && TEMP_LOCKED_LAB_IDS.includes(labId)
}

/** Minimal popup shown when a locked lab tries to open Doctor Ledger. */
export function DoctorLedgerLockedModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
        <p className="text-white font-medium">This section is locked.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  )
}
