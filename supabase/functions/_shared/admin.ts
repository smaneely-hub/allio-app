import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, requireAuth } from './security.ts'

const ADMIN_EMAILS = String(Deno.env.get('ADMIN_EMAILS') || Deno.env.get('VITE_ADMIN_EMAILS') || '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false
  return ADMIN_EMAILS.includes(String(email).trim().toLowerCase())
}

export async function requireAdmin(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  const auth = await requireAuth(req, supabaseUrl, supabaseAnonKey)
  if (auth.response) return auth

  const origin = req.headers.get('origin')
  const headers = { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' }

  if (!isAdminEmail(auth.user?.email)) {
    return {
      ...auth,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers,
      }),
    }
  }

  return auth
}

export function createServiceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey)
}
