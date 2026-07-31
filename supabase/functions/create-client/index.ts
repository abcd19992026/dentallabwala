import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface CreateClientInput {
  labName: string
  ownerName?: string
  email: string
  mobileNumber?: string
  address?: string
  studioCode?: string
  password: string
  templateAFrontUrl?: string
  templateABackUrl?: string
  templateBFrontUrl?: string
  templateBBackUrl?: string
  isActive?: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
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
        JSON.stringify({ error: 'Missing Authorization header. Provide a valid Bearer token.' }),
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
        JSON.stringify({ error: 'Forbidden. Only super_admin can create clients.' }),
        { headers: corsHeaders, status: 403 },
      )
    }

    const body: CreateClientInput = await req.json()
    const labName = body.labName?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!labName) {
      return new Response(
        JSON.stringify({ error: 'Validation error: labName is required.' }),
        { headers: corsHeaders, status: 400 },
      )
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Validation error: email is required.' }),
        { headers: corsHeaders, status: 400 },
      )
    }

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Validation error: password must be at least 6 characters.' }),
        { headers: corsHeaders, status: 400 },
      )
    }

    const ownerName = body.ownerName?.trim() || labName

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        role: 'lab_user',
      },
    })

    if (authError) {
      if (
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists') ||
        authError.message?.toLowerCase().includes('duplicate')
      ) {
        return new Response(
          JSON.stringify({ error: 'A client with this email address already exists.' }),
          { headers: corsHeaders, status: 409 },
        )
      }
      console.error('[create-client] Step 1 (createUser) failed:', authError.message)
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }),
        { headers: corsHeaders, status: 500 },
      )
    }

    const authUserId = authData.user?.id
    if (!authUserId) {
      console.error('[create-client] Step 1 (createUser) returned no user ID')
      return new Response(
        JSON.stringify({ error: 'Auth user created but no user ID was returned.' }),
        { headers: corsHeaders, status: 500 },
      )
    }

    try {
      // Step 2: Create Lab record
      const { data: labData, error: labError } = await supabase
        .from('labs')
        .insert({
          lab_name: labName,
          owner_name: ownerName,
          email,
          mobile: body.mobileNumber?.trim() || null,
          address: body.address?.trim() || null,
          studio_code: body.studioCode?.trim() || null,
          template_a_front: body.templateAFrontUrl || null,
          template_a_back: body.templateABackUrl || null,
          template_b_front: body.templateBFrontUrl || null,
          template_b_back: body.templateBBackUrl || null,
          is_active: body.isActive !== undefined ? body.isActive : true,
        })
        .select()
        .single()

      if (labError) {
        console.error('[create-client] Step 2 (create lab) failed:', labError.message)
        throw new Error(`Failed to create lab record: ${labError.message}`)
      }

      // Step 3 & 4: Update the auto-created profile with lab_id, full_name, role
      // The profile was auto-created by the on_auth_user_created trigger
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          lab_id: labData.id,
          full_name: ownerName,
          role: 'lab_user',
        })
        .eq('id', authUserId)

      if (profileUpdateError) {
        console.error('[create-client] Step 3/4 (update profile) failed:', profileUpdateError.message)
        throw new Error(`Failed to link profile with lab: ${profileUpdateError.message}`)
      }

      // Step 5: Create any required default records for the new client
      // (Currently no defaults are required; reserved for future use)

      // Step 6: Return success
      const responseData = {
        id: labData.id,
        labName: labData.lab_name,
        ownerName: labData.owner_name,
        email: labData.email,
        mobileNumber: labData.mobile,
        address: labData.address,
        isActive: labData.is_active,
        createdAt: labData.created_at,
      }

      console.log('[create-client] Client created successfully:', responseData.id)

      return new Response(
        JSON.stringify({ success: true, data: responseData }),
        { headers: corsHeaders, status: 200 },
      )
    } catch (err) {
      // Cleanup: if any step after user creation failed, remove the orphaned auth user
      const cleanupErr = await supabase.auth.admin.deleteUser(authUserId)
      if (cleanupErr.error) {
        console.error('[create-client] Cleanup failed for user', authUserId, cleanupErr.error.message)
      } else {
        console.log('[create-client] Cleaned up auth user', authUserId, 'after failure')
      }
      throw err
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('[create-client] Fatal error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: corsHeaders, status: 500 },
    )
  }
})
