export interface Doctor {
  id: string
  lab_id: string
  name: string
  clinic_name: string
  phone: string
  address: string
  opening_balance: number
  created_at?: string
}

export interface DoctorSupply {
  id: string
  lab_id: string
  doctor_id: string
  entry_date: string
  case_no: string
  doctor_name: string
  patient_name: string
  work_description: string
  tooth_no: string
  per_unit_charge: number
  unit_count: number
  billing_amount: number
  delivery_date: string | null
  remarks: string
  created_at?: string
}

export type PaymentMode = 'Cash' | 'UPI' | 'Cheque'

export interface DoctorPayment {
  id: string
  lab_id: string
  doctor_id: string
  payment_date: string
  amount: number
  payment_mode: PaymentMode
  remarks: string
  created_at?: string
}

export function isDoctorProfileComplete(doc: Doctor): boolean {
  return !!(doc.name?.trim() && doc.clinic_name?.trim() && doc.phone?.trim() && doc.address?.trim())
}

export function getMissingDoctorFields(doc: Doctor): string[] {
  const missing: string[] = []
  if (!doc.clinic_name?.trim()) missing.push('Clinic Name')
  if (!doc.phone?.trim()) missing.push('Phone Number')
  if (!doc.address?.trim()) missing.push('Address')
  return missing
}

export interface DoctorLedgerSummary {
  openingBalance: number
  totalWorkAmount: number
  totalUnits: number
  totalPaymentReceived: number
  currentBalance: number
}
