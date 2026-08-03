import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { WarrantyCard, WarrantyCardFormData } from '../types/warrantyCard.types'

export async function getWarrantyCardCounts(labIds: string[]): Promise<Record<string, { total: number; thisMonth: number }>> {
  if (!isSupabaseConfigured || labIds.length === 0) return {}

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('warranty_cards')
    .select('lab_id, created_at')
    .in('lab_id', labIds)

  if (error) throw error

  const result: Record<string, { total: number; thisMonth: number }> = {}
  for (const id of labIds) result[id] = { total: 0, thisMonth: 0 }

  for (const row of data || []) {
    const r = result[row.lab_id]
    if (r) {
      r.total++
      if (row.created_at && row.created_at.slice(0, 7) === monthPrefix) {
        r.thisMonth++
      }
    }
  }

  return result
}

export async function getGlobalWarrantyCardCounts(): Promise<{ total: number; thisMonth: number }> {
  if (!isSupabaseConfigured) return { total: 0, thisMonth: 0 }

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('warranty_cards')
    .select('created_at')

  if (error) throw error

  const cards = data || []
  const total = cards.length
  const thisMonth = cards.filter((c) => c.created_at?.slice(0, 7) === monthStart.slice(0, 7)).length

  return { total, thisMonth }
}

export async function getWarrantyCards(labId: string): Promise<WarrantyCard[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('warranty_cards')
    .select('*')
    .eq('lab_id', labId)
    .order('sl_no', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createWarrantyCard(
  labId: string,
  input: WarrantyCardFormData,
): Promise<WarrantyCard> {
  if (!labId) {
    throw new Error('lab_id is required and cannot be empty.')
  }

  // Compute next sl_no for this lab
  const { data: maxRow } = await supabase
    .from('warranty_cards')
    .select('sl_no')
    .eq('lab_id', labId)
    .order('sl_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSlNo = (maxRow?.sl_no ?? 0) + 1

  const { data, error } = await supabase
    .from('warranty_cards')
    .insert({
      lab_id: labId,
      sl_no: nextSlNo,
      lab_dentist: input.lab_dentist.trim(),
      patient_name: input.patient_name.trim(),
      tooth_no: input.tooth_no.trim(),
      reg_no: input.reg_no.trim(),
      issue_date: input.issue_date,
      valid_till: input.valid_till,
      warranty: input.warranty,
      authorised_code: input.authorised_code.trim(),
      clinic_name: input.clinic_name?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWarrantyCard(
  labId: string,
  cardId: string,
  input: WarrantyCardFormData,
): Promise<WarrantyCard> {
  if (!labId || !cardId) {
    throw new Error('lab_id and card id are required.')
  }

  const { data, error } = await supabase
    .from('warranty_cards')
    .update({
      lab_dentist: input.lab_dentist.trim(),
      patient_name: input.patient_name.trim(),
      tooth_no: input.tooth_no.trim(),
      reg_no: input.reg_no.trim(),
      issue_date: input.issue_date,
      valid_till: input.valid_till,
      warranty: input.warranty,
      authorised_code: input.authorised_code.trim(),
      clinic_name: input.clinic_name?.trim() || null,
    })
    .eq('id', cardId)
    .eq('lab_id', labId)
    .select()
    .single()

  if (error) throw error
  return data
}
