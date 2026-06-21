import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/security.ts'
import { createServiceClient, requireAdmin } from '../_shared/admin.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const TABLES = [
  { table: 'usage_tracking', column: 'user_id' },
  { table: 'user_preferences', column: 'user_id' },
  { table: 'meal_plans', column: 'user_id' },
  { table: 'recipes', column: 'user_id' },
  { table: 'shopping_list_items', column: 'user_id' },
  { table: 'shopping_lists', column: 'user_id' },
  { table: 'household_members', column: 'user_id' },
  { table: 'households', column: 'user_id' },
] as const

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

    if (userId === admin.user?.id) {
      return new Response(JSON.stringify({ error: 'Admins cannot delete their own account from this tool.' }), { status: 400, headers })
    }

    const supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    for (const { table, column } of TABLES) {
      const { error } = await supabase.from(table).delete().eq(column, userId)
      if (error && !error.message?.includes('does not exist') && !error.message?.includes('relation')) {
        console.error(`[admin-user-delete] failed to delete from ${table}:`, error.message)
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message || 'Failed to delete user' }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ success: true, userId }), { status: 200, headers })
  } catch (error) {
    console.error('[admin-user-delete] unexpected error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Admin user delete failed' }), {
      status: 500,
      headers,
    })
  }
})
