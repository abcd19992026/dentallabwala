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

export interface DoctorLedgerSummary {
  openingBalance: number
  totalWorkAmount: number
  totalUnits: number
  totalPaymentReceived: number
  currentBalance: number
}
