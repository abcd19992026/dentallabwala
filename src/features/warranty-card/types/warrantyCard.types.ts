export interface WarrantyCard {
  id: string
  lab_id: string
  sl_no: number
  lab_dentist: string
  patient_name: string
  tooth_no: string
  reg_no: string
  issue_date: string
  valid_till: string
  warranty: string
  authorised_code: string
  clinic_name: string | null
  material_type: string
  created_at: string
}

export type WarrantyCardFormData = {
  lab_dentist: string
  patient_name: string
  tooth_no: string
  reg_no: string
  issue_date: string
  valid_till: string
  warranty: string
  authorised_code: string
  clinic_name: string | null
  material_type: string
}

export type MaterialType = 'Zirconia' | 'PFM' | 'DMLS'

export interface MaterialContent {
  value: MaterialType
  heading: string
  text: string
}

/** Material-specific red heading and blue text shown on the card front */
export const MATERIAL_TYPES: MaterialContent[] = [
  {
    value: 'Zirconia',
    heading: 'Monolithic Virtually Unbreakable',
    text: 'Made Of Zirconium Oxide',
  },
  {
    value: 'PFM',
    heading: 'CAD/CAM PFM Technology',
    text: 'Made Of PFM Oxide',
  },
  {
    value: 'DMLS',
    heading: 'Direct Metal Laser Sintering Technology',
    text: 'Made Of DMLS Technology',
  },
]

export function getMaterialContent(materialType?: string | null): MaterialContent {
  return (
    MATERIAL_TYPES.find((m) => m.value.toLowerCase() === (materialType || '').toLowerCase()) ||
    MATERIAL_TYPES[0]
  )
}
