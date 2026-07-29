import html2pdf from 'html2pdf.js'

/**
 * Downloads the Doctor Ledger element as a crisp A4 Landscape PDF
 */
export async function downloadLedgerPDF(elementId: string, filename = 'Doctor_Ledger.pdf') {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id #${elementId} not found`)
    return
  }

  const opt = {
    margin: [6, 8, 6, 8] as [number, number, number, number],
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'landscape' as const,
    },
  }

  try {
    await html2pdf().set(opt).from(element).save()
  } catch (err) {
    console.error('PDF export failed:', err)
    // Fallback to browser print if html2pdf fails
    window.print()
  }
}
