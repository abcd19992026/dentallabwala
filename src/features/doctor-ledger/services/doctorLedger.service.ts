import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Doctor, DoctorSupply, DoctorPayment } from '@/types/doctorLedger.types'

const LOCAL_STORAGE_DOCTORS_KEY = 'dlw_doctors_v2'
const LOCAL_STORAGE_SUPPLIES_KEY = 'dlw_supplies_v2'
const LOCAL_STORAGE_PAYMENTS_KEY = 'dlw_payments_v2'

// Helper functions for localStorage fallback
function getLocalDoctors(): Doctor[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOCTORS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalDoctors(doctors: Doctor[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DOCTORS_KEY, JSON.stringify(doctors))
  } catch (err) {
    console.error('Failed saving doctors to localStorage', err)
  }
}

function getLocalSupplies(): DoctorSupply[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUPPLIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalSupplies(supplies: DoctorSupply[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SUPPLIES_KEY, JSON.stringify(supplies))
  } catch (err) {
    console.error('Failed saving supplies to localStorage', err)
  }
}

function getLocalPayments(): DoctorPayment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalPayments(payments: DoctorPayment[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(payments))
  } catch (err) {
    console.error('Failed saving payments to localStorage', err)
  }
}

export const doctorLedgerService = {
  /**
   * Fetch logged-in client's lab record details (lab_name, address)
   */
  async getLabInfo(labId: string): Promise<{ lab_name: string; address?: string; studio_code?: string } | null> {
    if (isSupabaseConfigured && labId) {
      try {
        const { data, error } = await supabase
          .from('labs')
          .select('lab_name, address, studio_code')
          .eq('id', labId)
          .maybeSingle()

        if (!error && data) {
          return {
            lab_name: data.lab_name || '',
            address: data.address || '',
            studio_code: data.studio_code || '',
          }
        }
      } catch (err) {
        console.warn('Error fetching lab info from Supabase:', err)
      }
    }
    return null
  },

  /**
   * Fetch all doctors for a specific lab
   */
  async getDoctors(labId: string): Promise<Doctor[]> {
    if (!isSupabaseConfigured) {
      const local = getLocalDoctors()
      return local.filter((d) => d.lab_id === labId || !labId)
    }

    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('lab_id', labId)
        .order('created_at', { ascending: false })

      if (error || !data) {
        console.warn('Supabase getDoctors error, fallback to local storage:', error)
        return getLocalDoctors().filter((d) => d.lab_id === labId || !labId)
      }

      return data.map((d) => ({
        id: d.id,
        lab_id: d.lab_id,
        name: d.name || '',
        clinic_name: d.clinic_name || '',
        phone: d.phone || '',
        address: d.address || '',
        opening_balance: Number(d.opening_balance) || 0,
        created_at: d.created_at,
      }))
    } catch {
      return getLocalDoctors().filter((d) => d.lab_id === labId || !labId)
    }
  },

  /**
   * Add a new doctor
   */
  async createDoctor(
    labId: string,
    doctorData: Partial<Omit<Doctor, 'id' | 'lab_id'>>
  ): Promise<Doctor> {
    const newDoctor: Doctor = {
      id: crypto.randomUUID(),
      lab_id: labId,
      name: doctorData.name?.trim() || '',
      clinic_name: doctorData.clinic_name?.trim() || '',
      phone: doctorData.phone?.trim() || '',
      address: doctorData.address?.trim() || '',
      opening_balance: Number(doctorData.opening_balance) || 0,
      created_at: new Date().toISOString(),
    }

    // Always update local storage
    const local = getLocalDoctors()
    local.unshift(newDoctor)
    saveLocalDoctors(local)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .insert({
            id: newDoctor.id,
            lab_id: newDoctor.lab_id,
            name: newDoctor.name,
            clinic_name: newDoctor.clinic_name,
            phone: newDoctor.phone,
            address: newDoctor.address,
            opening_balance: newDoctor.opening_balance,
          })
          .select()
          .single()

        if (error) {
          console.error('Supabase doctor create error:', error)
        } else if (data) {
          return {
            id: data.id,
            lab_id: data.lab_id,
            name: data.name || '',
            clinic_name: data.clinic_name || '',
            phone: data.phone || '',
            address: data.address || '',
            opening_balance: Number(data.opening_balance) || 0,
            created_at: data.created_at,
          }
        }
      } catch (err) {
        console.error('Supabase insert exception:', err)
      }
    }

    return newDoctor
  },

  /**
   * Fetch supply entries for a doctor
   */
  async getSupplies(labId: string, doctorId: string): Promise<DoctorSupply[]> {
    if (!isSupabaseConfigured) {
      const local = getLocalSupplies()
      return local.filter((s) => s.doctor_id === doctorId && (s.lab_id === labId || !labId))
    }

    try {
      const { data, error } = await supabase
        .from('doctor_supplies')
        .select('*')
        .eq('lab_id', labId)
        .eq('doctor_id', doctorId)
        .order('entry_date', { ascending: false })

      if (error || !data) {
        console.warn('Supabase getSupplies fallback to local:', error)
        const local = getLocalSupplies()
        return local.filter((s) => s.doctor_id === doctorId && (s.lab_id === labId || !labId))
      }

      return data.map((s) => ({
        id: s.id,
        lab_id: s.lab_id,
        doctor_id: s.doctor_id,
        entry_date: s.entry_date,
        case_no: s.case_no || '',
        doctor_name: s.doctor_name || '',
        patient_name: s.patient_name || '',
        work_description: s.work_description || '',
        tooth_no: s.tooth_no || '',
        unit_count: Number(s.unit_count) || 1,
        billing_amount: Number(s.billing_amount) || 0,
        delivery_date: s.delivery_date || null,
        remarks: s.remarks || '',
        created_at: s.created_at,
      }))
    } catch {
      const local = getLocalSupplies()
      return local.filter((s) => s.doctor_id === doctorId && (s.lab_id === labId || !labId))
    }
  },

  /**
   * Add a new supply entry
   */
  async addSupply(
    labId: string,
    doctorId: string,
    supplyData: Omit<DoctorSupply, 'id' | 'lab_id' | 'doctor_id'>
  ): Promise<DoctorSupply> {
    const newSupply: DoctorSupply = {
      id: crypto.randomUUID(),
      lab_id: labId,
      doctor_id: doctorId,
      entry_date: supplyData.entry_date || new Date().toISOString().split('T')[0],
      case_no: supplyData.case_no?.trim() || '',
      doctor_name: supplyData.doctor_name?.trim() || '',
      patient_name: supplyData.patient_name?.trim() || '',
      work_description: supplyData.work_description?.trim() || '',
      tooth_no: supplyData.tooth_no?.trim() || '',
      unit_count: Number(supplyData.unit_count) || 1,
      billing_amount: Number(supplyData.billing_amount) || 0,
      delivery_date: supplyData.delivery_date || null,
      remarks: supplyData.remarks?.trim() || '',
      created_at: new Date().toISOString(),
    }

    const local = getLocalSupplies()
    local.unshift(newSupply)
    saveLocalSupplies(local)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('doctor_supplies')
          .insert({
            id: newSupply.id,
            lab_id: newSupply.lab_id,
            doctor_id: newSupply.doctor_id,
            entry_date: newSupply.entry_date,
            case_no: newSupply.case_no,
            doctor_name: newSupply.doctor_name,
            patient_name: newSupply.patient_name,
            work_description: newSupply.work_description,
            tooth_no: newSupply.tooth_no,
            unit_count: newSupply.unit_count,
            billing_amount: newSupply.billing_amount,
            delivery_date: newSupply.delivery_date,
            remarks: newSupply.remarks,
          })
          .select()
          .single()

        if (error) {
          console.error('Supabase addSupply error:', error)
        } else if (data) {
          return {
            id: data.id,
            lab_id: data.lab_id,
            doctor_id: data.doctor_id,
            entry_date: data.entry_date,
            case_no: data.case_no || '',
            doctor_name: data.doctor_name || '',
            patient_name: data.patient_name || '',
            work_description: data.work_description || '',
            tooth_no: data.tooth_no || '',
            unit_count: Number(data.unit_count) || 1,
            billing_amount: Number(data.billing_amount) || 0,
            delivery_date: data.delivery_date || null,
            remarks: data.remarks || '',
            created_at: data.created_at,
          }
        }
      } catch (err) {
        console.error('Supabase addSupply exception:', err)
      }
    }

    return newSupply
  },

  /**
   * Fetch payment entries for a doctor
   */
  async getPayments(labId: string, doctorId: string): Promise<DoctorPayment[]> {
    if (!isSupabaseConfigured) {
      const local = getLocalPayments()
      return local.filter((p) => p.doctor_id === doctorId && (p.lab_id === labId || !labId))
    }

    try {
      const { data, error } = await supabase
        .from('doctor_payments')
        .select('*')
        .eq('lab_id', labId)
        .eq('doctor_id', doctorId)
        .order('payment_date', { ascending: false })

      if (error || !data) {
        console.warn('Supabase getPayments fallback to local:', error)
        const local = getLocalPayments()
        return local.filter((p) => p.doctor_id === doctorId && (p.lab_id === labId || !labId))
      }

      return data.map((p) => ({
        id: p.id,
        lab_id: p.lab_id,
        doctor_id: p.doctor_id,
        payment_date: p.payment_date,
        amount: Number(p.amount) || 0,
        payment_mode: (p.payment_mode || 'Cash') as DoctorPayment['payment_mode'],
        remarks: p.remarks || '',
        created_at: p.created_at,
      }))
    } catch {
      const local = getLocalPayments()
      return local.filter((p) => p.doctor_id === doctorId && (p.lab_id === labId || !labId))
    }
  },

  /**
   * Delete a doctor and all associated data
   */
  async deleteDoctor(doctorId: string): Promise<void> {
    const local = getLocalDoctors()
    const updated = local.filter((d) => d.id !== doctorId)
    saveLocalDoctors(updated)

    if (isSupabaseConfigured) {
      try {
        await supabase.from('doctors').delete().eq('id', doctorId)
      } catch (err) {
        console.error('Supabase delete doctor error:', err)
      }
    }
  },

  /**
   * Delete a supply entry
   */
  async deleteSupply(supplyId: string): Promise<void> {
    const local = getLocalSupplies()
    const updated = local.filter((s) => s.id !== supplyId)
    saveLocalSupplies(updated)

    if (isSupabaseConfigured) {
      try {
        await supabase.from('doctor_supplies').delete().eq('id', supplyId)
      } catch (err) {
        console.error('Supabase delete supply error:', err)
      }
    }
  },

  /**
   * Add a new payment entry
   */
  async addPayment(
    labId: string,
    doctorId: string,
    paymentData: Omit<DoctorPayment, 'id' | 'lab_id' | 'doctor_id'>
  ): Promise<DoctorPayment> {
    const newPayment: DoctorPayment = {
      id: crypto.randomUUID(),
      lab_id: labId,
      doctor_id: doctorId,
      payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      amount: Number(paymentData.amount) || 0,
      payment_mode: paymentData.payment_mode || 'Cash',
      remarks: paymentData.remarks?.trim() || '',
      created_at: new Date().toISOString(),
    }

    const local = getLocalPayments()
    local.unshift(newPayment)
    saveLocalPayments(local)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('doctor_payments')
          .insert({
            id: newPayment.id,
            lab_id: newPayment.lab_id,
            doctor_id: newPayment.doctor_id,
            payment_date: newPayment.payment_date,
            amount: newPayment.amount,
            payment_mode: newPayment.payment_mode,
            remarks: newPayment.remarks,
          })
          .select()
          .single()

        if (error) {
          console.error('Supabase addPayment error:', error)
        } else if (data) {
          return {
            id: data.id,
            lab_id: data.lab_id,
            doctor_id: data.doctor_id,
            payment_date: data.payment_date,
            amount: Number(data.amount) || 0,
            payment_mode: (data.payment_mode || 'Cash') as DoctorPayment['payment_mode'],
            remarks: data.remarks || '',
            created_at: data.created_at,
          }
        }
      } catch (err) {
        console.error('Supabase addPayment exception:', err)
      }
    }

    return newPayment
  },
}
