import { useState, useEffect } from 'react'
import type { FieldConfig } from '../types/templateConfig.types'
import { DEFAULT_FIELD_CONFIGS, FIELD_KEYS } from '../types/templateConfig.types'
import { getMaterialContent } from '../types/warrantyCard.types'

interface WarrantyCardPrintLayoutProps {
  mode: 'main' | 'custom'
  clinicName?: string
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
    materialType: string
  }
  labDetails: {
    labName: string
    address: string
  }
  templates: {
    frontUrl: string
    backUrl: string
  }
  /** Optional saved field configurations — overrides DEFAULT_FIELD_CONFIGS */
  fieldConfigs?: Record<string, FieldConfig>
  /** Optional saved field configurations for the back face */
  backFieldConfigs?: Record<string, FieldConfig>
  /** When true, renders only the front face (used by configurator) */
  singleFace?: boolean
}

function useSvgWithReplacement(
  url: string,
  replacements: Record<string, string>,
  literalReplacements?: Record<string, string>,
) {
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    if (!url || !url.toLowerCase().endsWith('.svg')) {
      setContent(null)
      return
    }
    let cancelled = false
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return
        let modified = text
        for (const [key, val] of Object.entries(replacements)) {
          modified = modified.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
        }
        if (literalReplacements) {
          for (const [key, val] of Object.entries(literalReplacements)) {
            modified = modified.split(key).join(val)
          }
        }
        setContent(modified)
      })
      .catch(() => setContent(null))
    return () => { cancelled = true }
  }, [url, JSON.stringify(replacements), JSON.stringify(literalReplacements || {})])

  return content
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

function formatWarranty(val: string): string {
  const n = Number(val)
  return n > 0 ? `${val} ${n > 1 ? '' : ''}` : val
}

function fieldStyle(cfg: { left: number; top: number; fontSize: number; bold: boolean; width: number }) {
  return {
    position: 'absolute' as const,
    left: `${cfg.left}px`,
    top: `${cfg.top}px`,
    fontSize: `${cfg.fontSize}px`,
    fontWeight: cfg.bold ? 700 : 400,
    color: '#111',
    whiteSpace: 'nowrap' as const,
    width: `${cfg.width}px`,
    // 👇 ADD THESE
    lineHeight: '1',
    display: 'block',
    margin: 0,
    padding: 0,
  }
}

function getMerged(fieldConfigs: Record<string, FieldConfig> | undefined, key: string) {
  const saved = fieldConfigs?.[key]
  const def = DEFAULT_FIELD_CONFIGS[key]
  return {
    left: saved?.left ?? def.left,
    top: saved?.top ?? def.top,
    fontSize: saved?.fontSize ?? def.fontSize,
    bold: saved?.bold ?? def.bold,
    width: saved?.width ?? def.width ?? 80,
  }
}

export function CardFace({
  templateUrl,
  isBack,
  replacements,
  literalReplacements,
  cardData,
  fieldConfigs,
  isCustomBack,
  clinicName,
  visibleFieldKeys,
}: {
  templateUrl: string
  isBack?: boolean
  replacements?: Record<string, string>
  literalReplacements?: Record<string, string>
  cardData: WarrantyCardPrintLayoutProps['cardData']
  fieldConfigs?: Record<string, FieldConfig>
  isCustomBack?: boolean
  clinicName?: string
  visibleFieldKeys?: string[]
}) {
  const svgContent = useSvgWithReplacement(templateUrl, replacements || {}, literalReplacements)
  const isSvg = templateUrl?.toLowerCase().endsWith('.svg')
  const material = getMaterialContent(cardData.materialType)

  const fieldValues: Record<string, string> = {
    sl_no: `${cardData.serialNo}`,
    lab_dentist: cardData.labDentist || '-',
    patient_name: cardData.patientName || '-',
    tooth_no: cardData.toothNo || '-',
    reg_no: cardData.regNo || '-',
    warranty: formatWarranty(cardData.warranty),
    valid_till: formatDate(cardData.validTill),

    clinic_name: cardData.clinicName || '',
    tagline: material.heading,
    material_text: material.text,
    material_name: cardData.materialType || 'Zirconia',
  }

  return (
    <div className="atm-card" style={{ position: 'relative', width: '85.6mm', height: '53.98mm', overflow: 'visible', fontFamily: 'Arial, sans-serif' }}>
      {templateUrl ? (
        isSvg && svgContent ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          />
        ) : isSvg && !svgContent ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <p style={{ color: '#999', fontSize: '10px' }}>Loading template...</p>
          </div>
        ) : (
          <img
            src={templateUrl}
            alt={isBack ? 'Warranty card back' : 'Warranty card front'}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }}
            crossOrigin="anonymous"
          />
        )
      ) : (
        <div style={{ position: 'absolute', inset: 0, border: '1px dashed #ccc', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#999', fontSize: '10px' }}>No template uploaded</p>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {isBack ? (
          <>
            {isCustomBack && clinicName && (
              <span style={fieldStyle(getMerged(fieldConfigs, 'clinic_name'))}>
                {clinicName}
              </span>
            )}
            <span style={fieldStyle(getMerged(fieldConfigs, 'material_name'))}>
              {fieldValues.material_name}
            </span>
          </>
        ) : (
          <>
            {(visibleFieldKeys || FIELD_KEYS)
              .filter((key) => key !== 'material_name')
              .map((key) => {
              const cfg = getMerged(fieldConfigs, key)
              const style = {
                ...fieldStyle(cfg),
                color:
                  !isBack && key === 'clinic_name'
                    ? '#0B3D91'
                    : key === 'tagline'
                      ? '#DC2626'
                      : key === 'material_text'
                        ? '#1D4ED8'
                        : '#111',
              }
              return (
                <span key={key} style={style}>
                  {fieldValues[key]}
                </span>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

export function WarrantyCardPrintLayout(props: WarrantyCardPrintLayoutProps) {
  const frontReplacements = props.mode === 'custom' && props.clinicName
    ? { CLINIC_NAME: props.clinicName }
    : undefined

  const backReplacements = props.mode === 'custom' && props.clinicName
    ? { CLINIC_NAME: props.clinicName }
    : undefined

  // Replace the literal material name (e.g. "Zirconia") on the back side
  const backLiteralReplacements =
    props.cardData.materialType &&
      props.cardData.materialType.toLowerCase() !== 'zirconia'
      ? { Zirconia: props.cardData.materialType }
      : undefined

  const printCss = `
    @media print {
      @page { size: 85.6mm 53.98mm; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        width: 85.6mm;
        overflow: hidden;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .atm-card { width: 85.6mm !important; height: 53.98mm !important; }
      .atm-card ~ .atm-card { page-break-before: always; }
    }
  `

  return (
    <div id="warranty-card-print-root" style={{ margin: 0, padding: 0 }}>
      <style>{printCss}</style>
      <CardFace
        templateUrl={props.templates.frontUrl}
        isBack={false}
        replacements={frontReplacements}
        cardData={props.cardData}
        fieldConfigs={props.fieldConfigs}
      />
      {!props.singleFace && (
        <CardFace
          templateUrl={props.templates.backUrl}
          isBack={true}
          replacements={backReplacements}
          literalReplacements={backLiteralReplacements}
          cardData={props.cardData}
          fieldConfigs={props.backFieldConfigs || props.fieldConfigs}
          isCustomBack={props.mode === 'custom'}
          clinicName={props.clinicName}
        />
      )}
    </div>
  )
}
