import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    const { action, ...payload } = await req.json()

    // Verify the caller is an admin (optional, can be enforced via RLS/RPCS but here we trust the token if valid)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if requester is admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('profile')
      .eq('id', user.id)
      .single()

    if (profile?.profile !== 'Administrator') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result

    switch (action) {
      case 'invite': {
        const { email, name, profile, company_id } = payload
        const { data, error } =
          await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
              name,
              profile,
              company_id,
              status: 'Pending',
            },
            redirectTo: payload.redirectTo,
          })
        if (error) throw error
        result = data
        break
      }

      case 'update_status': {
        const { id, status } = payload

        // If blocking/deactivating, we ban the user in auth
        if (status === 'Inactive' || status === 'Blocked') {
          const { error } = await supabaseClient.auth.admin.updateUserById(id, {
            ban_duration: '876600h', // 100 years basically
          })
          if (error) throw error
          // Invalidate sessions
          await supabaseClient.auth.admin.signOut(id)
        } else if (status === 'Active') {
          const { error } = await supabaseClient.auth.admin.updateUserById(id, {
            ban_duration: 'none',
          })
          if (error) throw error
        }

        const { data, error } = await supabaseClient
          .from('user_profiles')
          .update({ status })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      case 'reset_password': {
        const { id, email, redirectTo } = payload
        // Trigger password reset email
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
          email,
          {
            redirectTo,
          },
        )
        if (error) throw error

        // Invalidate current sessions
        await supabaseClient.auth.admin.signOut(id)

        result = { success: true, message: 'Reset email sent' }
        break
      }

      case 'update_profile': {
        const { id, name, profile: newProfile } = payload
        const { data, error } = await supabaseClient
          .from('user_profiles')
          .update({ name, profile: newProfile })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Sync metadata
        await supabaseClient.auth.admin.updateUserById(id, {
          user_metadata: { name, profile: newProfile },
        })

        result = data
        break
      }

      default:
        throw new Error('Invalid action')
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
