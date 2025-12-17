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

    // Verify the caller authentication
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
      return new Response(
        JSON.stringify({ error: 'Sessão expirada. Faça login novamente.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('profile, id')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.profile === 'Administrator'

    // Helper to log errors
    const logError = async (errorMsg: string, details: any) => {
      console.error(errorMsg, details)
      try {
        await supabaseClient.from('audit_logs').insert({
          action: action,
          entity: 'User Profile',
          user_id: user.id,
          details: {
            error: errorMsg,
            payload: details,
            timestamp: new Date().toISOString(),
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        })
      } catch (e) {
        console.error('Failed to log to audit_logs', e)
      }
    }

    let result

    try {
      switch (action) {
        case 'invite': {
          if (!isAdmin) throw new Error('Forbidden: Admins only')
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
          if (!isAdmin) throw new Error('Forbidden: Admins only')
          const { id, status } = payload
          if (status === 'Inactive' || status === 'Blocked') {
            const { error } = await supabaseClient.auth.admin.updateUserById(
              id,
              {
                ban_duration: '876600h',
              },
            )
            if (error) throw error
            await supabaseClient.auth.admin.signOut(id)
          } else if (status === 'Active') {
            const { error } = await supabaseClient.auth.admin.updateUserById(
              id,
              {
                ban_duration: 'none',
              },
            )
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
          if (!isAdmin) throw new Error('Forbidden: Admins only')
          const { id, email, redirectTo } = payload
          const { data, error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {
              redirectTo,
            })
          if (error) throw error
          await supabaseClient.auth.admin.signOut(id)
          result = { success: true, message: 'Reset email sent' }
          break
        }

        case 'update_profile': {
          if (!isAdmin) throw new Error('Forbidden: Admins only')
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
            await supabaseClient
              .from('user_companies')
              .delete()
              .eq('user_id', id)

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

        case 'update_own_profile': {
          // Allows user to update their own basic info
          const { name, email, password, is_2fa_enabled } = payload
          const id = user.id

          const updates: any = {}
          if (email) updates.email = email
          if (password) updates.password = password
          if (name) updates.data = { name } // Metadata update

          if (Object.keys(updates).length > 0) {
            const { error: authError } =
              await supabaseClient.auth.admin.updateUserById(id, updates)
            if (authError) throw authError
          }

          // Update profile table
          const tableUpdates: any = {}
          if (name) tableUpdates.name = name
          if (email) tableUpdates.email = email
          if (is_2fa_enabled !== undefined)
            tableUpdates.is_2fa_enabled = is_2fa_enabled

          if (Object.keys(tableUpdates).length > 0) {
            const { data, error } = await supabaseClient
              .from('user_profiles')
              .update(tableUpdates)
              .eq('id', id)
              .select()
              .single()

            if (error) throw error
            result = data
          } else {
            result = { success: true }
          }

          break
        }

        default:
          throw new Error('Invalid action')
      }
    } catch (err: any) {
      await logError(err.message, payload)
      throw err // Re-throw to be caught by outer catch and returned as response
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
