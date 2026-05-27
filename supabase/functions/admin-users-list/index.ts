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
    const query = String(body?.query || '').trim().toLowerCase()
    const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (usersError) throw usersError

    const allUsers = usersData?.users || []
    const filteredUsers = query
      ? allUsers.filter((user) => {
          const email = String(user.email || '').toLowerCase()
          const id = String(user.id || '').toLowerCase()
          return email.includes(query) || id.includes(query)
        })
      : allUsers

    const userIds = filteredUsers.map((user) => user.id)

    const [householdsRes, membersRes, prefsRes, usageRes] = await Promise.all([
      userIds.length ? supabase.from('households').select('id, user_id, subscription_tier, created_at').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
      userIds.length ? supabase.from('household_members').select('id, user_id').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
      userIds.length ? supabase.from('user_preferences').select('user_id').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
      userIds.length ? supabase.from('usage_tracking').select('user_id, action, created_at').in('user_id', userIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ])

    if (householdsRes.error) throw householdsRes.error
    if (membersRes.error) throw membersRes.error
    if (prefsRes.error) throw prefsRes.error
    if (usageRes.error) throw usageRes.error

    const householdByUser = new Map((householdsRes.data || []).map((row) => [row.user_id, row]))
    const memberCounts = new Map()
    for (const row of (membersRes.data || [])) {
      memberCounts.set(row.user_id, (memberCounts.get(row.user_id) || 0) + 1)
    }
    const hasPrefs = new Set((prefsRes.data || []).map((row) => row.user_id))
    const latestUsage = new Map()
    for (const row of (usageRes.data || [])) {
      if (!latestUsage.has(row.user_id)) latestUsage.set(row.user_id, row)
    }

    const users = filteredUsers.map((user) => {
      const household = householdByUser.get(user.id)
      const memberCount = memberCounts.get(user.id) || 0
      const usage = latestUsage.get(user.id)
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        subscription: household?.subscription_tier || 'free',
        onboarding: hasPrefs.has(user.id) || household ? 'started' : 'not started',
        household: household ? `${memberCount || 0} member${memberCount === 1 ? '' : 's'}` : 'no household',
        recent_activity: usage ? `${usage.action} • ${usage.created_at}` : 'no recent tracked activity',
      }
    })

    return new Response(JSON.stringify({ users }), { headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Admin users list failed' }), {
      status: 500,
      headers,
    })
  }
})
