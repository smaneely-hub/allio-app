import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

function decodeJwtClaims(token) {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const decoded = JSON.parse(atob(padded))
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
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function normalizeInvokeError(error) {
  return {
    message: error?.message || null,
    name: error?.name || null,
    context: error?.context || null,
    status: error?.status || null,
  }
}

async function runDirectFunctionFetch(path, accessToken, body) {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  const parsed = await response.json().catch(() => null)
  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  }
}

function buildPayload(household, members, slotOverrides = {}) {
  const slot = {
    day: slotOverrides.day || 'mon',
    meal: slotOverrides.meal || 'dinner',
    attendees: slotOverrides.attendees?.length ? slotOverrides.attendees : members.map((m) => m.id).filter(Boolean),
    effort_level: slotOverrides.effort_level || household?.cooking_comfort || 'medium',
    planning_notes: slotOverrides.planning_notes || '',
    is_leftover: false,
    leftover_source: '',
  }

  return {
    household: {
      total_people: household?.total_people,
      diet_focus: household?.diet_focus,
      budget_sensitivity: household?.budget_sensitivity,
      adventurousness: household?.adventurousness,
      staples_on_hand: household?.staples_on_hand,
      planning_priorities: household?.planning_priorities,
      cooking_comfort: household?.cooking_comfort,
    },
    members: members.map((member) => ({
      id: member.id,
      label: member.name || member.label,
      role: member.role,
      age: member.age,
      restrictions: member.restrictions,
      preferences: member.preferences,
      dietary_restrictions: member.dietary_restrictions || [],
      food_preferences: member.food_preferences || [],
      health_considerations: member.health_considerations || [],
    })),
    slots: [slot],
    week_notes: slotOverrides.week_notes || '',
    locked_meals: [],
  }
}

export function PlannerTestPage() {
  useDocumentTitle('Planner Test | Allio')
  const { user } = useAuth()
  const { household, members, loading } = useHousehold()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [diagnosticResult, setDiagnosticResult] = useState(null)
  const [openRouterTestResult, setOpenRouterTestResult] = useState(null)
  const [plannerGenerateTestResult, setPlannerGenerateTestResult] = useState(null)
  const [requestInfo, setRequestInfo] = useState(null)
  const [day, setDay] = useState('mon')
  const [meal, setMeal] = useState('dinner')
  const [notes, setNotes] = useState('')

  const payload = useMemo(() => buildPayload(household, members, { day, meal, planning_notes: notes }), [household, members, day, meal, notes])

  const runGenerate = async () => {
    if (!user) {
      toast.error('You need to be logged in.')
      return
    }
    if (!household) {
      toast.error('Household not loaded yet.')
      return
    }
    if (!members.length) {
      toast.error('Add at least one household member first.')
      return
    }

    setRunning(true)
    setResult(null)
    const startedAt = Date.now()

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError
      if (!session?.access_token) throw new Error('No active session token available')

      setRequestInfo({
        hasSession: true,
        userId: user.id,
        startedAt: new Date(startedAt).toISOString(),
        tokenClaims: decodeJwtClaims(session.access_token),
        payload,
      })

      setDiagnosticResult(null)
      setOpenRouterTestResult(null)
      setPlannerGenerateTestResult(null)

      const diagnosticDirect = await runDirectFunctionFetch('planner-diagnostic', session.access_token, { ping: true })
      setDiagnosticResult(diagnosticDirect)

      const { data: openRouterData, error: openRouterError } = await supabase.functions.invoke('openrouter-test', {
        body: { ping: true },
      })
      setOpenRouterTestResult({
        ok: !openRouterError,
        status: openRouterError?.status || 200,
        body: openRouterError ? normalizeInvokeError(openRouterError) : openRouterData,
      })

      const plannerGenerateDirect = await runDirectFunctionFetch('planner-generate-test', session.access_token, payload)
      setPlannerGenerateTestResult(plannerGenerateDirect)

      const generatePlanDirect = await runDirectFunctionFetch('generate-plan', session.access_token, payload)
      setResult({
        ...generatePlanDirect,
        elapsed_ms: Date.now() - startedAt,
      })

      if (!generatePlanDirect.ok) {
        throw new Error(generatePlanDirect?.body?.error || generatePlanDirect?.body?.message || `HTTP ${generatePlanDirect.status}`)
      }

      toast.success('Planner test returned successfully.')
    } catch (err) {
      setResult((current) => current || {
        ok: false,
        status: null,
        elapsed_ms: Date.now() - startedAt,
        body: { error: err?.message || 'Unknown error' },
      })
      toast.error(err?.message || 'Planner test failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl text-text-primary">Planner Test</h1>
        <p className="mt-2 text-sm text-text-secondary">
          One-button test for live meal generation using your current household and member preferences.
          Default behavior: generate a meal from the current household context when you press the button.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-700">Day</span>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="input w-full">
              <option value="mon">Monday</option>
              <option value="tue">Tuesday</option>
              <option value="wed">Wednesday</option>
              <option value="thu">Thursday</option>
              <option value="fri">Friday</option>
              <option value="sat">Saturday</option>
              <option value="sun">Sunday</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-700">Meal</span>
            <select value={meal} onChange={(e) => setMeal(e.target.value)} className="input w-full">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </label>

          <div className="rounded-xl bg-bg-primary p-4 text-sm text-text-secondary">
            <div><strong>Household:</strong> {household?.name || '—'}</div>
            <div><strong>Members:</strong> {members.length}</div>
            <div><strong>User:</strong> {user?.email || user?.id || '—'}</div>
          </div>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-text-700">Planning notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" placeholder="Optional test note" />
        </label>

        <button
          type="button"
          onClick={runGenerate}
          disabled={running || loading}
          className="mt-5 rounded-full bg-gradient-to-r from-green-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {running ? 'Generating…' : 'Generate Test Meal'}
        </button>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Request Snapshot</h2>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">{JSON.stringify(requestInfo, null, 2)}</pre>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Diagnostic Result</h2>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">{JSON.stringify(diagnosticResult, null, 2)}</pre>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">OpenRouter Test Result</h2>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">{JSON.stringify(openRouterTestResult, null, 2)}</pre>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Planner Generate Test Result</h2>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">{JSON.stringify(plannerGenerateTestResult, null, 2)}</pre>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Result</h2>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs text-stone-100">{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  )
}
