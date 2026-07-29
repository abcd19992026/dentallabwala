import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

interface DeleteClientInput {
  labId: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { headers: corsHeaders, status: 405 },
    )
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        { headers: corsHeaders, status: 401 },
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }),
        { headers: corsHeaders, status: 401 },
      )
    }

    const { data: callerProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Caller profile not found.' }),
        { headers: corsHeaders, status: 403 },
      )
    }

    if (callerProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden. Only super_admin can delete clients.' }),
        { headers: corsHeaders, status: 403 },
      )
    }

    const body: DeleteClientInput = await req.json()
    const labId = body.labId?.trim()

    if (!labId) {
      return new Response(
        JSON.stringify({ error: 'Validation error: labId is required.' }),
        { headers: corsHeaders, status: 400 },
      )
    }

    // Fetch the lab record to get template URLs and find the auth user via profile
    const { data: labData, error: labFetchError } = await supabase
      .from('labs')
      .select('*')
      .eq('id', labId)
      .single()

    if (labFetchError || !labData) {
      return new Response(
        JSON.stringify({ error: 'Lab record not found.' }),
        { headers: corsHeaders, status: 404 },
      )
    }

    // Find the auth user via the profiles table
    const { data: profileData, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('lab_id', labId)
      .maybeSingle()

    if (profileFetchError) {
      console.error('[delete-client] Failed to fetch profile:', profileFetchError.message)
      throw new Error('Failed to fetch associated profile.')
    }

    const authUserId = profileData?.id || null

    // Step 1: Delete all template files from storage for this lab
    const { data: storageFiles, error: storageListError } = await supabase.storage
      .from('template')
      .list(labId)

    if (!storageListError && storageFiles && storageFiles.length > 0) {
      const storagePathsToDelete = storageFiles.map((f) => `${labId}/${f.name}`)
      const { error: storageDeleteError } = await supabase.storage
        .from('template')
        .remove(storagePathsToDelete)

      if (storageDeleteError) {
        console.warn('[delete-client] Failed to delete some storage files:', storageDeleteError.message)
      }
    }

    // Step 2: Delete the auth user (this cascades to profile deletion via FK ON DELETE CASCADE)
    if (authUserId) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUserId)
      if (authDeleteError) {
        console.error('[delete-client] Failed to delete auth user:', authDeleteError.message)
        throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)
      }
    }

    // Step 3: Delete the profile (explicitly in case cascade didn't fire)
    if (authUserId) {
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', authUserId)

      if (profileDeleteError) {
        console.warn('[delete-client] Failed to delete profile:', profileDeleteError.message)
      }
    }

    // Step 4: Delete the lab record
    const { error: labDeleteError } = await supabase
      .from('labs')
      .delete()
      .eq('id', labId)

    if (labDeleteError) {
      console.error('[delete-client] Failed to delete lab:', labDeleteError.message)
      throw new Error(`Failed to delete lab record: ${labDeleteError.message}`)
    }

    console.log('[delete-client] Client deleted successfully:', labId)

    return new Response(
      JSON.stringify({ success: true, data: { id: labId } }),
      { headers: corsHeaders, status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('[delete-client] Fatal error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: corsHeaders, status: 500 },
    )
  }
})
