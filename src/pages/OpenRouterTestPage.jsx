import { useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../lib/supabase'

export function OpenRouterTestPage() {
  useDocumentTitle('OpenRouter Test | Allio')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const runTest = async () => {
    setLoading(true)
    setResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('openrouter-test', {
        body: {},
      })

      if (error) throw error
      setResult(data)
      toast.success('OpenRouter test returned successfully.')
    } catch (err) {
      const message = err?.message || 'OpenRouter test failed.'
      setResult({ ok: false, error: message, details: err })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl text-text-primary">OpenRouter Test</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Temporary diagnostic endpoint. This page does one thing: call a minimal edge function that calls OpenRouter and returns a minimal success payload.
        </p>
        <button
          type="button"
          onClick={runTest}
          disabled={loading}
          className="mt-4 rounded-full bg-gradient-to-r from-green-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {loading ? 'Testing…' : 'Run OpenRouter Test'}
        </button>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Result</h2>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  )
}
