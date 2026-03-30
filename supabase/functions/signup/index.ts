import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create user with admin API (bypasses email confirmation)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        created_at: new Date().toISOString()
      }
    })

    if (error) {
      // If admin create fails (e.g., user already exists), try regular sign up
      if (error.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'An account with this email already exists. Try logging in or using a different email.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    // Create default household for new user
    if (data.user) {
      await supabase.from('households').insert({
        user_id: data.user.id,
        name: `${email.split('@')[0]}'s Household`,
        subscription_tier: 'free'
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data.user,
        message: 'Account created successfully!'
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})