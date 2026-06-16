import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/security.ts'

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
    // Authenticate the calling user from their JWT
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    }

    const userId = user.id
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Delete user data in dependency order (children before parents)
    const tables: Array<{ table: string; column: string }> = [
      { table: 'usage_tracking', column: 'user_id' },
      { table: 'user_preferences', column: 'user_id' },
      { table: 'meal_plans', column: 'user_id' },
      { table: 'recipes', column: 'user_id' },
      { table: 'shopping_list_items', column: 'user_id' },
      { table: 'shopping_lists', column: 'user_id' },
      { table: 'household_members', column: 'user_id' },
      { table: 'households', column: 'user_id' },
    ]

    for (const { table, column } of tables) {
      const { error } = await serviceClient.from(table).delete().eq(column, userId)
      // Ignore "table not found" errors — not all tables may exist in all deployments
      if (error && !error.message?.includes('does not exist') && !error.message?.includes('relation')) {
        console.error(`[delete-account] failed to delete from ${table}:`, error.message)
      }
    }

    // Delete the auth user (this is irreversible)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Failed to delete account. Please contact support.' }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  } catch (err) {
    console.error('[delete-account] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers })
  }
})
