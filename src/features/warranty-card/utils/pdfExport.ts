import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export async function downloadWarrantyCardPDF(elementId: string, filename = 'Warranty_Card.pdf') {
  const root = document.getElementById(elementId)
  if (!root) {
    console.error(`Element #${elementId} not found`)
    return
  }

  const cards = root.querySelectorAll('.atm-card')
  if (cards.length === 0) return

  const pdf = new jsPDF({
    unit: 'mm',
    format: [85.6, 53.98],
    orientation: 'landscape',
  })

  for (let i = 0; i < cards.length; i++) {
    if (i > 0) {
      pdf.addPage([85.6, 53.98], 'landscape')
    }

    const el = cards[i] as HTMLElement
    const { offsetWidth: w, offsetHeight: h } = el

    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: w,
      height: h,
    })

    const imgData = canvas.toDataURL('image/jpeg', 1)

    // Preserve the canvas aspect ratio to avoid any baseline shift.
    // The PDF height is derived from the canvas ratio so that the image
    // is never stretched unevenly.
    const ratio = canvas.width / canvas.height
    const pdfH = 85.6 / ratio
    const yOff = (53.98 - pdfH) / 2
    pdf.addImage(imgData, 'JPEG', 0, yOff, 85.6, pdfH)
  }

  pdf.save(filename)
}
