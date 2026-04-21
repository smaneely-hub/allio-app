import { useEffect, useState, useMemo, useRef } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'

// Screen wake lock — prevents device from sleeping while cooking.
// Fails silently on iOS < 16.4 or if permission is denied.
function useWakeLock() {
  useEffect(() => {
    let wakeLock = null
    const acquire = async () => {
      if (!('wakeLock' in navigator)) return
      try { wakeLock = await navigator.wakeLock.request('screen') } catch { /* intentionally empty - fails silently */ }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLock?.release().catch(() => {})
    }
  }, [])
}

// Detect the first meaningful timer in a step's text. Returns minutes or null.
function detectTimerMinutes(text) {
  // Hours
  let m = text.match(/(\d+)\s*h(?:our|r)s?/i)
  if (m) return Number(m[1]) * 60
  // Range "12–15 minutes" — use lower bound
  m = text.match(/(\d+)\s*(?:to|[-–])\s*\d+\s*min/i)
  if (m) return Number(m[1])
  // Plain minutes
  m = text.match(/(\d+)\s*min(?:utes?)?/i)
  if (m) {
    const val = Number(m[1])
    if (val >= 1 && val <= 120) return val
  }
  return null
}

// Web Audio API beep — no external assets needed, fails silently
function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.8)
  } catch { /* intentionally empty - fails silently */ }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CookingMode({ meal, onExit }) {
  useWakeLock()

  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal?.title || meal?.name,
    prepTime: meal?.prep_time_minutes,
    cookTime: meal?.cook_time_minutes,
    totalTime: meal?.total_time_minutes,
    ingredientGroups: meal?.ingredientGroups,
    instructionGroups: meal?.instructionGroups,
    substitutions: meal?.substitutions,
    nutrition: meal?.nutrition,
    tags: meal?.recipeTags,
    sourceNote: meal?.sourceNote,
  }), [meal])

  const allSteps = useMemo(() => {
    const steps = []
    for (const group of recipe.instructionGroups) {
      for (const step of group.steps) {
        steps.push({ ...step, groupLabel: group.label || null })
      }
    }
    return steps
  }, [recipe.instructionGroups])

  const [checkedSteps, setCheckedSteps] = useState(new Set())
  const [checkedIngredients, setCheckedIngredients] = useState({})
  const [showIngredients, setShowIngredients] = useState(false)
  const [timers, setTimers] = useState([])
  const alarmFiredRef = useRef(new Set())

  // Countdown tick — only active while at least one timer is running
  const hasActiveTimers = timers.some(t => !t.done)
  useEffect(() => {
    if (!hasActiveTimers) return
    const id = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (t.done) return t
        const next = t.remaining - 1
        if (next <= 0 && !alarmFiredRef.current.has(t.id)) {
          alarmFiredRef.current.add(t.id)
          setTimeout(playBeep, 0)
          return { ...t, remaining: 0, done: true }
        }
        return { ...t, remaining: Math.max(0, next) }
      }))
    }, 1000)
    return () => clearInterval(id)
  }, [hasActiveTimers])

  const toggleStep = (i) => setCheckedSteps(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const toggleIngredient = (key) =>
    setCheckedIngredients(prev => ({ ...prev, [key]: !prev[key] }))

  const timerIdRef = useRef(0)
  const startTimer = (stepIndex, minutes) => {
    const id = `${stepIndex}-${++timerIdRef.current}`
    setTimers(prev => [...prev, {
      id,
      label: `Step ${stepIndex + 1} · ${minutes} min`,
      total: minutes * 60,
      remaining: minutes * 60,
      done: false,
    }])
  }

  const dismissTimer = (id) => {
    alarmFiredRef.current.delete(id)
    setTimers(prev => prev.filter(t => t.id !== id))
  }

  if (allSteps.length === 0) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-text-secondary">No instructions found for this recipe.</p>
        <button type="button" onClick={onExit}
          className="rounded-full bg-primary-500 px-6 py-2 text-sm font-semibold text-white">
          Exit
        </button>
      </div>
    )
  }

  const doneCount = checkedSteps.size
  const totalCount = allSteps.length

  return (
    <div className="flex flex-col">
      {/* Scrollable area with sticky header inside */}
      <div className="overflow-y-auto" style={{ minHeight: 420, maxHeight: '68vh' }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white pb-3 border-b border-divider">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border border-divider bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-warm-50"
            >
              ← Exit
            </button>
            <div className="min-w-0 flex-1 px-3 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">Now cooking</div>
              <div className="truncate text-sm font-semibold text-text-primary">{recipe.title}</div>
            </div>
            <span className="shrink-0 text-xs font-medium text-text-muted tabular-nums">
              {doneCount}/{totalCount}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-warm-100">
            <div
              className="h-full rounded-full bg-primary-400 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Page content */}
        <div className="py-4 space-y-5">
          {/* Ingredients accordion */}
          <div className="rounded-2xl border border-divider overflow-hidden">
            <button
              type="button"
              onClick={() => setShowIngredients(s => !s)}
              className="flex w-full items-center justify-between px-4 py-3 bg-warm-50 hover:bg-warm-100 transition text-left"
            >
              <span className="text-sm font-semibold text-text-primary">Ingredients</span>
              <span className="text-xs text-text-muted">{showIngredients ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showIngredients && (
              <div className="p-4 space-y-4">
                {recipe.ingredientGroups.map((group, gi) => (
                  <div key={`${group.label || 'ig'}-${gi}`}>
                    {group.label && (
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
                    )}
                    <ul className="space-y-1">
                      {group.ingredients.map((ing, idx) => {
                        const key = `${gi}-${idx}`
                        const checked = Boolean(checkedIngredients[key])
                        return (
                          <li key={key}>
                            <button
                              type="button"
                              onClick={() => toggleIngredient(key)}
                              className={`flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left transition ${checked ? 'opacity-40' : 'hover:bg-warm-50'}`}
                            >
                              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition ${checked ? 'border-primary-500 bg-primary-500' : 'border-divider'}`} />
                              <span className={`text-sm ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                <strong>{[ing.amount, ing.unit].filter(Boolean).join(' ')}</strong>
                                {(ing.amount || ing.unit) && ' '}
                                {ing.item}
                                {ing.note && <span className="text-text-secondary"> ({ing.note})</span>}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All instructions — continuous scroll, checkable */}
          <div>
            <div className="mb-3 text-sm font-semibold text-text-primary">Instructions</div>
            <div className="space-y-2">
              {allSteps.map((step, i) => {
                const checked = checkedSteps.has(i)
                const timerMins = detectTimerMinutes(step.text)
                const showGroupLabel = step.groupLabel &&
                  (i === 0 || allSteps[i - 1].groupLabel !== step.groupLabel)
                return (
                  <div key={i}>
                    {showGroupLabel && (
                      <div className={`mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted ${i > 0 ? 'mt-4' : ''}`}>
                        {step.groupLabel}
                      </div>
                    )}
                    <div className={`rounded-xl border transition-colors ${checked ? 'border-primary-100 bg-primary-50' : 'border-divider bg-white'}`}>
                      <button
                        type="button"
                        onClick={() => toggleStep(i)}
                        className="flex w-full items-start gap-3 p-4 text-left"
                      >
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                          checked
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-divider bg-white text-text-muted'
                        }`}>
                          {checked ? '✓' : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-6 ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            {step.text}
                          </p>
                          {step.tip && !checked && (
                            <div className="mt-2 rounded-lg bg-primary-50 px-3 py-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Tip · </span>
                              <span className="text-xs text-primary-800">{step.tip}</span>
                            </div>
                          )}
                        </div>
                      </button>
                      {timerMins && !checked && (
                        <div className="px-4 pb-3">
                          <button
                            type="button"
                            onClick={() => startTimer(i, timerMins)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-warm-200 active:scale-95"
                          >
                            ⏱ Start {timerMins} min timer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sign-up nudge */}
          <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
            <p className="text-xs text-primary-800">
              Want this saved to your meal plan?{' '}
              <a href="/login" className="font-semibold underline">Create a free account →</a>
            </p>
          </div>
        </div>
      </div>

      {/* Timer tray — always visible outside scroll when timers exist */}
      {timers.length > 0 && (
        <div className="mt-3 rounded-2xl border border-divider overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-warm-50 border-b border-divider">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">⏱ Timers</span>
          </div>
          <div className="divide-y divide-divider">
            {timers.map(timer => (
              <div
                key={timer.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${timer.done ? 'bg-primary-50' : 'bg-white'}`}
              >
                <span className="flex-1 text-xs text-text-secondary truncate">{timer.label}</span>
                <span className={`font-mono text-sm font-bold tabular-nums ${timer.done ? 'text-primary-600 animate-pulse' : 'text-text-primary'}`}>
                  {timer.done ? 'Done!' : formatTime(timer.remaining)}
                </span>
                <button
                  type="button"
                  onClick={() => dismissTimer(timer.id)}
                  className="ml-1 text-xs text-text-muted hover:text-text-secondary transition leading-none"
                  aria-label="Dismiss timer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
