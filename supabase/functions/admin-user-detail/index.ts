import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/security.ts'
import { createServiceClient, requireAdmin } from '../_shared/admin.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req)

  const blockedOrigin = rejectDisallowedOrigin(req)
  if (blockedOrigin) return blockedOrigin

  const origin = req.headers.get('origin')
  const headers = { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' }

  try {
    const admin = await requireAdmin(req, SUPABASE_URL, SUPABASE_ANON_KEY)
    if (admin.response) return admin.response

    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || '').trim()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers })
    }

    const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: userRes, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError) throw userError

    const [householdRes, membersRes, prefsRes, usageRes, plansRes, recipesRes] = await Promise.all([
      supabase.from('households').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('household_members').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('usage_tracking').select('action, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('meal_plans').select('id, created_at, status').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('recipes').select('id, title, created_at').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(10),
    ])

    if (householdRes.error) throw householdRes.error
    if (membersRes.error) throw membersRes.error
    if (prefsRes.error) throw prefsRes.error
    if (usageRes.error) throw usageRes.error
    if (plansRes.error) throw plansRes.error
    if (recipesRes.error) throw recipesRes.error

    return new Response(JSON.stringify({
      user: {
        id: userRes.user?.id,
        email: userRes.user?.email,
        created_at: userRes.user?.created_at,
        last_sign_in_at: userRes.user?.last_sign_in_at,
        email_confirmed_at: userRes.user?.email_confirmed_at,
      },
      household: householdRes.data,
      members: membersRes.data || [],
      preferences: prefsRes.data || null,
      usage: usageRes.data || [],
      recentPlans: plansRes.data || [],
      recentRecipes: recipesRes.data || [],
    }), { headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Admin user detail failed' }), {
      status: 500,
      headers,
    })
  }
})
