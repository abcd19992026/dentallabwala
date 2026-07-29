import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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


    const { labId } = await req.json()

    if (!labId) {
      return new Response(
        JSON.stringify({ error: 'labId required' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }


    // deactivate lab
    const { error: updateError } =
      await supabaseAdmin
        .from('labs')
        .update({
          is_active: false
        })
        .eq('id', labId)


    if (updateError) {
      throw updateError
    }


    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client deactivated successfully'
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