import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseUrl.startsWith('http')

if (!isConfigured) {
  console.warn(
    '[DENTIVO] Supabase is not configured.\n' +
    'Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local\n' +
    'See .env.example for reference.'
  )
}

// Use placeholder values during development — Supabase will not be functional
// until real credentials are provided in .env.local
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://aeafjsecniwwasqxhaae.supabase.co',
  isConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlYWZqc2Vjbml3d2FzcXhoYWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzI0OTIsImV4cCI6MjEwMDMwODQ5Mn0.',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

/** Whether Supabase is properly configured with real credentials */
export const isSupabaseConfigured = isConfigured
