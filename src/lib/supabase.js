import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing')
}

let browserAwareFetch = undefined

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  browserAwareFetch = async (input, init) => {
    const response = await window.fetch(input, init)
    if (response.type === 'opaqueredirect') {
      throw new TypeError(`Unexpected redirect while requesting ${typeof input === 'string' ? input : input?.url || 'resource'}`)
    }
    return response
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: browserAwareFetch ? { fetch: browserAwareFetch } : undefined,
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
