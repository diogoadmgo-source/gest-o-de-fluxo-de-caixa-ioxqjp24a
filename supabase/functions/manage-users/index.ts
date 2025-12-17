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

    // Verify the caller is an admin
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
        const { email, name, profile, company_ids, status } = payload
        const { data, error } =
          await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
              name,
              profile,
              status: status || 'Pending',
              is_2fa_enabled: false,
            },
            redirectTo: payload.redirectTo,
          })
        if (error) throw error

        // Handle companies association
        if (company_ids && Array.isArray(company_ids) && data.user) {
          const companiesInsert = company_ids.map((cid: string) => ({
            user_id: data.user!.id,
            company_id: cid,
          }))
          const { error: companiesError } = await supabaseClient
            .from('user_companies')
            .insert(companiesInsert)
          if (companiesError) throw companiesError
        }

        result = data
        break
      }

      case 'update_status': {
        const { id, status } = payload
        if (status === 'Inactive' || status === 'Blocked') {
          const { error } = await supabaseClient.auth.admin.updateUserById(id, {
            ban_duration: '876600h',
          })
          if (error) throw error
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
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
          email,
          {
            redirectTo,
          },
        )
        if (error) throw error
        await supabaseClient.auth.admin.signOut(id)
        result = { success: true, message: 'Reset email sent' }
        break
      }

      case 'update_profile': {
        const {
          id,
          name,
          profile: newProfile,
          email,
          is_2fa_enabled,
          company_ids,
        } = payload

        // Update Auth User (Email)
        if (email) {
          const { error: emailError } =
            await supabaseClient.auth.admin.updateUserById(id, {
              email: email,
              email_confirm: true,
              user_metadata: { name, profile: newProfile, is_2fa_enabled },
            })
          if (emailError) throw emailError
        }

        // Update User Profile Table
        const { data, error } = await supabaseClient
          .from('user_profiles')
          .update({ name, profile: newProfile, email, is_2fa_enabled })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Update Company Associations
        if (company_ids && Array.isArray(company_ids)) {
          // Delete existing
          await supabaseClient.from('user_companies').delete().eq('user_id', id)

          // Insert new
          if (company_ids.length > 0) {
            const companiesInsert = company_ids.map((cid: string) => ({
              user_id: id,
              company_id: cid,
            }))
            const { error: companiesError } = await supabaseClient
              .from('user_companies')
              .insert(companiesInsert)
            if (companiesError) throw companiesError
          }
        }

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
