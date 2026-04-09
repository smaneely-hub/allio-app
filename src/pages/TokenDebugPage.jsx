import { useState } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../lib/supabase'

function decodeJwtClaims(token) {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized))
    const { iss, aud, role, exp, sub, aal, session_id, email, phone, ...rest } = decoded
    return {
      iss,
      aud,
      role,
      exp,
      sub,
      aal,
      session_id,
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      extraKeys: Object.keys(rest || {}),
    }
  } catch {
    return null
  }
}

export function TokenDebugPage() {
  useDocumentTitle('Token Debug | Allio')
  const [result, setResult] = useState(null)

  const inspectToken = async () => {
    const { data, error } = await supabase.auth.getSession()
    const session = data?.session
    setResult({
      error: error?.message || null,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      projectRef: (() => {
        try {
          return new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]
        } catch {
          return null
        }
      })(),
      sessionPresent: Boolean(session),
      tokenPresent: Boolean(session?.access_token),
      claims: session?.access_token ? decodeJwtClaims(session.access_token) : null,
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl text-text-primary">Token Debug</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Safe token diagnostics. This decodes claims only and never shows the raw token.
        </p>
        <button type="button" onClick={inspectToken} className="mt-4 rounded-full bg-slate-900 px-6 py-3 font-semibold text-white">
          Inspect Current Session Token
        </button>
      </div>
      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  )
}
