import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const ALLOWED_ORIGINS = new Set([
  'https://allio.life',
  'https://www.allio.life',
])

type HeaderMap = Record<string, string>

export function buildCorsHeaders(origin: string | null, extraHeaders: HeaderMap = {}): HeaderMap {
  const headers: HeaderMap = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    ...extraHeaders,
  }

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

export function handleCorsPreflight(req: Request, extraHeaders: HeaderMap = {}): Response {
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', {
      status: 403,
      headers: { Vary: 'Origin' },
    })
  }

  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin, extraHeaders),
  })
}

export function rejectDisallowedOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Vary': 'Origin',
      },
    })
  }

  return null
}

export async function requireAuth(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  const origin = req.headers.get('origin')
  const headers = { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' }
  const authorization = req.headers.get('authorization') || req.headers.get('Authorization')

  if (!authorization) {
    return {
      user: null,
      authorization: null,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      }),
    }
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  })

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      authorization,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      }),
    }
  }

  return {
    user,
    authorization,
    response: null,
  }
}
