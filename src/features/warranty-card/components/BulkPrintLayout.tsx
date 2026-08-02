import type { FieldConfig } from '../types/templateConfig.types'
import { CardFace } from './WarrantyCardPrintLayout'

export interface BulkPrintCardData {
  cardData: {
    serialNo: number
    labDentist: string
    patientName: string
    toothNo: string
    regNo: string
    warranty: string
    validTill: string
    authorisedCode: string
    clinicName: string
  }
  mode: 'main' | 'custom'
  clinicName?: string
  templates: {
    frontUrl: string
    backUrl: string
  }
  fieldConfigs?: Record<string, FieldConfig>
  backFieldConfigs?: Record<string, FieldConfig>
}

interface BulkPrintLayoutProps {
  cards: BulkPrintCardData[]
}

/** Group cards into pages of up to 4 cards each (2×2 grid) */
function chunkCards(cards: BulkPrintCardData[], size = 4): BulkPrintCardData[][] {
  const pages: BulkPrintCardData[][] = []
  for (let i = 0; i < cards.length; i += size) {
    pages.push(cards.slice(i, i + size))
  }
  return pages
}

function CardPair({ card }: { card: BulkPrintCardData }) {
  const frontReplacements = card.mode === 'custom' && card.clinicName
    ? { CLINIC_NAME: card.clinicName }
    : undefined
  const backReplacements = card.mode === 'custom' && card.clinicName
    ? { CLINIC_NAME: card.clinicName }
    : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3mm' }}>
      <CardFace
        templateUrl={card.templates.frontUrl}
        isBack={false}
        replacements={frontReplacements}
        cardData={card.cardData}
        fieldConfigs={card.fieldConfigs}
      />
      <CardFace
        templateUrl={card.templates.backUrl}
        isBack={true}
        replacements={backReplacements}
        cardData={card.cardData}
        fieldConfigs={card.backFieldConfigs || card.fieldConfigs}
        isCustomBack={card.mode === 'custom'}
        clinicName={card.clinicName}
      />
    </div>
  )
}

export function BulkPrintLayout({ cards }: BulkPrintLayoutProps) {
  const pages = chunkCards(cards)

  const printCss = `
    @media print {
      @page { size: A4 portrait; margin: 5mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        width: 210mm;
      }
      .bulk-page { page-break-after: always; }
      .bulk-page:last-child { page-break-after: auto; }
    }
  `

  return (
    <div id="bulk-print-root" style={{ margin: 0, padding: 0 }}>
      <style>{printCss}</style>
      {pages.map((pageCards, pageIdx) => (
        <div key={pageIdx} className="bulk-page" style={{ width: '210mm', height: '297mm', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '3mm', width: '100%', height: '100%' }}>
            {[0, 1, 2, 3].map((slot) => {
              const card = pageCards[slot]
              return (
                <div key={slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db', borderRadius: '2mm' }}>
                  {card ? <CardPair card={card} /> : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
