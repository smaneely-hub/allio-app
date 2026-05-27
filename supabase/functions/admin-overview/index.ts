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

    const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoIso = sevenDaysAgo.toISOString()

    const [
      usersRes,
      recentUsersRes,
      activeUsersRes,
      planGenRes,
      householdsRes,
      recipesRes,
    ] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from('usage_tracking').select('user_id', { count: 'exact', head: false }).gte('created_at', sevenDaysAgoIso),
      supabase.from('usage_tracking').select('id', { count: 'exact', head: true }).eq('action', 'plan_generated').gte('created_at', sevenDaysAgoIso),
      supabase.from('households').select('id', { count: 'exact', head: true }),
      supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('active', true),
    ])

    if (usersRes.error) throw usersRes.error
    if (recentUsersRes.error) throw recentUsersRes.error
    if (activeUsersRes.error) throw activeUsersRes.error
    if (planGenRes.error) throw planGenRes.error
    if (householdsRes.error) throw householdsRes.error
    if (recipesRes.error) throw recipesRes.error

    const allRecentUsers = recentUsersRes.data?.users || []
    const signup7d = allRecentUsers.filter((user) => user.created_at && new Date(user.created_at) >= sevenDaysAgo).length
    const active7dDistinct = new Set((activeUsersRes.data || []).map((row) => row.user_id).filter(Boolean)).size

    return new Response(JSON.stringify({
      metrics: {
        totalUsers: usersRes.data?.total ?? allRecentUsers.length,
        signups7d: signup7d,
        activeUsers7d: active7dDistinct,
        planGenerations7d: planGenRes.count ?? 0,
        households: householdsRes.count ?? 0,
        activeRecipes: recipesRes.count ?? 0,
      },
    }), { headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Admin overview failed' }), {
      status: 500,
      headers,
    })
  }
})
