export interface FieldConfig {
  left: number
  top: number
  fontSize: number
  bold: boolean
  width?: number
}

export interface TemplateConfig {
  id: string
  lab_id: string
  template_key: TemplateKey
  config: {
    fields: Record<string, FieldConfig>
  }
  created_at: string
  updated_at: string
}

export type TemplateKey = 'template_a_front' | 'template_a_back' | 'template_b_front' | 'template_b_back'

export const TEMPLATE_KEYS: { key: TemplateKey; label: string }[] = [
  { key: 'template_a_front', label: 'Template A — Front' },
  { key: 'template_a_back', label: 'Template A — Back' },
  { key: 'template_b_front', label: 'Template B — Front' },
  { key: 'template_b_back', label: 'Template B — Back' },
]

export const FIELD_LABELS: Record<string, string> = {
  sl_no: 'SL No.',
  lab_dentist: 'Lab / Dentist',
  patient_name: 'Patient Name',
  tooth_no: 'Tooth No.',
  reg_no: 'Reg. No.',
  warranty: 'Warranty',
  valid_till: 'Valid Till',

  clinic_name: 'Clinic Name',
  tagline: 'Tagline',
  material_text: 'Material Text',
  material_name: 'Material Name',
}

/** ATM card dimensions: 85.6mm × 53.98mm ≈ 324px × 204px at 96dpi */
export const CARD_W_PX = 324
export const CARD_H_PX = 204

export const DEFAULT_FIELD_CONFIGS: Record<string, FieldConfig> = {
  sl_no: { left: 140, top: 10, fontSize: 8, bold: false, width: 80 },
  lab_dentist: { left: 10, top: 30, fontSize: 8, bold: false, width: 140 },
  patient_name: { left: 10, top: 50, fontSize: 8, bold: false, width: 140 },
  tooth_no: { left: 10, top: 70, fontSize: 8, bold: false, width: 80 },
  reg_no: { left: 10, top: 90, fontSize: 8, bold: false, width: 100 },
  warranty: { left: 10, top: 110, fontSize: 8, bold: false, width: 80 },
  valid_till: { left: 10, top: 130, fontSize: 8, bold: false, width: 100 },

  clinic_name: { left: 10, top: 170, fontSize: 8, bold: false, width: 140 },
  tagline: { left: 62, top: 172, fontSize: 9, bold: true, width: 200 },
  material_text: { left: 76, top: 186, fontSize: 8, bold: false, width: 172 },
  material_name: { left: 100, top: 80, fontSize: 10, bold: true, width: 120 },
}

export const FIELD_KEYS = Object.keys(DEFAULT_FIELD_CONFIGS)

/** Materials that can have their own saved Material Text position */
export const MATERIAL_TEXT_MATERIALS = ['Zirconia', 'PFM', 'DMLS']

/**
 * Storage key under which a material's own Material Text position is saved.
 * e.g. material_text_zirconia, material_text_pfm, material_text_dmls
 */
export function materialTextVariantKey(materialType?: string | null): string {
  const key = (materialType || 'Zirconia').toLowerCase()
  return `material_text_${key}`
}

/**
 * Storage key under which a material's own Tagline position is saved.
 * e.g. tagline_zirconia, tagline_pfm, tagline_dmls
 */
export function taglineVariantKey(materialType?: string | null): string {
  const key = (materialType || 'Zirconia').toLowerCase()
  return `tagline_${key}`
}
