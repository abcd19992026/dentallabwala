import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase environment variables missing')
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        {
          status: 401,
          headers: corsHeaders,
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error } =
      await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: corsHeaders,
        }
      )
    }

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Caller profile not found.' }),
        {
          status: 403,
          headers: corsHeaders,
        }
      )
    }

    if (callerProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden. Only super_admin can reset client passwords.' }),
        {
          status: 403,
          headers: corsHeaders,
        }
      )
    }

    const { clientId, newPassword } = await req.json()

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'clientId required' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    const trimmedPassword = typeof newPassword === 'string' ? newPassword.trim() : ''

    if (trimmedPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long.' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    if (trimmedPassword.length > 72) {
      return new Response(
        JSON.stringify({ error: 'Password must be at most 72 characters long.' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    // Find the lab user's profile for this client
    const { data: labProfile, error: labProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('lab_id', clientId)
      .eq('role', 'lab_user')
      .single()

    if (labProfileErr || !labProfile) {
      return new Response(
        JSON.stringify({ error: 'Lab user not found for this client.' }),
        {
          status: 404,
          headers: corsHeaders,
        }
      )
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(labProfile.id, {
        password: trimmedPassword,
      })

    if (updateError) {
      throw updateError
    }

    // Revoke the lab user's active sessions so old logins are signed out
    // immediately instead of lasting until the access token expires.
    // The password is already changed at this point — if revocation fails we
    // log it but still report the password reset itself as successful.
    try {
      const { error: signOutErr } =
        await supabaseAdmin.auth.admin.signOut(labProfile.id, 'global')

      if (signOutErr) {
        console.error('Failed to revoke lab user sessions:', signOutErr)
      }
    } catch (revokeErr) {
      console.error('Failed to revoke lab user sessions:', revokeErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    )

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )

  }
})
