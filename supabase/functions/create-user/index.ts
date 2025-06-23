
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { name, email, role, password } = await req.json()

    if (!name || !email || !role || !password) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email format
    if (!email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // First, ensure user is in approved list
    const { data: existingApproved } = await supabaseAdmin
      .from('approved_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (!existingApproved) {
      const { error: approvedError } = await supabaseAdmin
        .from('approved_users')
        .insert({
          email: email,
          role: role
        })

      if (approvedError) {
        console.error('Error adding to approved users:', approvedError)
        return new Response(
          JSON.stringify({ error: 'Failed to approve user' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Create user using admin API (this won't affect current session)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Skip email confirmation
      user_metadata: { 
        name: name,
        display_name: name
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update profile with display name
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ display_name: name })
      .eq('user_id', userData.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Don't fail the whole operation for this
    }

    // Set user role if not WAREHOUSE_STAFF (which is default)
    if (role !== 'WAREHOUSE_STAFF') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: role as any })
        .eq('user_id', userData.user.id)

      if (roleError) {
        console.error('Error setting user role:', roleError)
        // Don't fail the whole operation for this
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userData.user.id,
          email: userData.user.email,
          name: name,
          role: role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
