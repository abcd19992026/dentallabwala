import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import type { TemplateKey, FieldConfig } from '../types/templateConfig.types'
import { DEFAULT_FIELD_CONFIGS } from '../types/templateConfig.types'

export async function getTemplateConfig(
  labId: string,
  templateKey: TemplateKey,
): Promise<Record<string, FieldConfig>> {
  if (!isSupabaseConfigured) return DEFAULT_FIELD_CONFIGS

  const { data, error } = await supabase
    .from('template_configs')
    .select('config')
    .eq('lab_id', labId)
    .eq('template_key', templateKey)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch template config:', error)
    return DEFAULT_FIELD_CONFIGS
  }

  if (!data?.config?.fields) return DEFAULT_FIELD_CONFIGS

  // Merge saved config with defaults (in case new fields were added)
  const merged: Record<string, FieldConfig> = {}
  for (const [key, defaultConfig] of Object.entries(DEFAULT_FIELD_CONFIGS)) {
    merged[key] = { ...defaultConfig, ...(data.config.fields[key] || {}) }
  }
  return merged
}

export async function saveTemplateConfig(
  labId: string,
  templateKey: TemplateKey,
  fields: Record<string, FieldConfig>,
): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('template_configs')
    .upsert(
      {
        lab_id: labId,
        template_key: templateKey,
        config: { fields },
      },
      { onConflict: 'lab_id, template_key' },
    )

  if (error) throw error
}
