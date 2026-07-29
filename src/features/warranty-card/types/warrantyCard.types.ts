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
}
