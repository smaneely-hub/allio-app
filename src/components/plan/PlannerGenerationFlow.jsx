import { useEffect, useState } from 'react'
import { SwipeDeck } from '../SwipeDeck'

function SparklesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

const EFFORT_OPTIONS = [
  { value: 'low', label: 'Easy' },
  { value: 'medium', label: 'Moderate' },
  { value: 'high', label: 'Involved' },
]

const DIETARY_OPTIONS = [
  { value: '', label: 'No restriction' },
  { value: 'low-carb', label: 'Low carb' },
  { value: 'high-protein', label: 'High protein' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten free' },
  { value: 'keto', label: 'Keto' },
]

/**
 * Full-screen generate → review loop for Planner slot generation.
 *
 * Phases:
 *   config     – user sets effort, attendees, notes, then fires generation
 *   generating – spinner while the edge function runs
 *   review     – SwipeCard with the generated meal; user accepts, tries another,
 *                tweaks (refine), or locks the meal in
 *
 * The modal stays mounted throughout all phases. Only onAccept / onLockAndAccept
 * return the user to the planner view. onClose is always available (except during
 * generation) and keeps whatever meal is already persisted.
 */
export function PlannerGenerationFlow({
  open,
  onClose,
  dayKey,
  mealSlot,
  members = [],
  defaultEffort = 'medium',
  defaultAttendees,
  onGenerate,       // async ({ effort, attendees, planningNotes, dietaryFocus }) => meal | null
  onTryAnother,     // async (meal) => meal | null
  onRefine,         // async (meal, text) => meal | null
  onAccept,         // (meal) => void
  onLockAndAccept,  // async (meal) => void
}) {
  const [phase, setPhase] = useState('config')
  const [meal, setMeal] = useState(null)
  const [effort, setEffort] = useState(defaultEffort || 'medium')
  const [attendees, setAttendees] = useState(() =>
    defaultAttendees?.length ? defaultAttendees : members.map((m) => m.id)
  )
  const [notes, setNotes] = useState('')
  const [dietaryFocus, setDietaryFocus] = useState('')
  const [tryingAnother, setTryingAnother] = useState(false)
  const [showRefine, setShowRefine] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)
  const [locking, setLocking] = useState(false)

  useEffect(() => {
    if (open) {
      setPhase('config')
      setMeal(null)
      setEffort(defaultEffort || 'medium')
      setAttendees(defaultAttendees?.length ? defaultAttendees : members.map((m) => m.id))
      setNotes('')
      setDietaryFocus('')
      setShowRefine(false)
      setRefineText('')
      setTryingAnother(false)
      setLocking(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const slotLabel = `${dayKey.toUpperCase()} · ${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)}`
  const canFireGenerate = members.length === 0 || attendees.length > 0

  const handleGenerate = async () => {
    setPhase('generating')
    try {
      const result = await onGenerate({ effort, attendees, planningNotes: notes, dietaryFocus })
      if (result) {
        setMeal(result)
        setPhase('review')
      } else {
        setPhase('config')
      }
    } catch {
      setPhase('config')
    }
  }

  const handleTryAnother = async () => {
    setTryingAnother(true)
    try {
      const newMeal = await onTryAnother(meal)
      if (newMeal) setMeal(newMeal)
    } catch {
      // caller surfaces error toast
    } finally {
      setTryingAnother(false)
    }
  }

  const handleRefineSubmit = async () => {
    if (!refineText.trim() || refining) return
    setRefining(true)
    try {
      const refined = await onRefine(meal, refineText.trim())
      if (refined) {
        setMeal(refined)
        setShowRefine(false)
        setRefineText('')
      }
    } catch {
      // caller surfaces error toast
    } finally {
      setRefining(false)
    }
  }

  const handleLockAndAccept = async () => {
    if (!meal || locking) return
    setLocking(true)
    try {
      await onLockAndAccept(meal)
    } finally {
      setLocking(false)
    }
  }

  const mealImage = meal
    ? { url: meal.image_url || meal.image || null, photographer: null, photographerUrl: null }
    : { url: null, photographer: null, photographerUrl: null }

  // Clear items while loading so SwipeDeck shows its built-in spinner
  const mealItems = tryingAnother ? [] : (meal ? [{ meal, image: mealImage }] : [])

  const isCloseable = phase !== 'generating' && !tryingAnother && !locking

  return (
    <div className="fixed inset-0 z-[160] flex flex-col bg-white">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-surface-muted bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">{slotLabel}</div>
          <div className="text-base font-semibold text-ink-primary">
            {phase === 'config' && 'Generate a meal'}
            {phase === 'generating' && 'Generating…'}
            {phase === 'review' && !tryingAnother && (meal?.name || 'New meal')}
            {phase === 'review' && tryingAnother && 'Finding another option…'}
          </div>
        </div>

        {/* Secondary actions — only visible during review */}
        {phase === 'review' && meal && !tryingAnother && (
          <>
            <button
              type="button"
              onClick={() => { setShowRefine((v) => !v); setRefineText('') }}
              className="rounded-full border border-surface-muted bg-white px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-stone-50"
            >
              Tweak
            </button>
            <button
              type="button"
              onClick={handleLockAndAccept}
              disabled={locking}
              title="Accept and lock this meal"
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {locking ? '…' : '🔒 Lock in'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={!isCloseable}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-tertiary transition hover:bg-stone-100 hover:text-ink-primary disabled:opacity-30"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* ── Config phase ───────────────────────────────────────── */}
      {phase === 'config' && (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-5">
              {/* Effort */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Effort</div>
                <div className="flex gap-2">
                  {EFFORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEffort(opt.value)}
                      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                        effort === opt.value
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'border border-surface-muted bg-white text-ink-secondary hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendees */}
              {members.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Cooking for</div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setAttendees(members.map((m) => m.id))}
                        className="cursor-pointer text-primary-600 hover:underline focus-visible:outline-none"
                      >
                        All
                      </button>
                      <span className="text-ink-tertiary">|</span>
                      <button
                        type="button"
                        onClick={() => setAttendees([])}
                        className="cursor-pointer text-primary-600 hover:underline focus-visible:outline-none"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => {
                      const isSelected = attendees.includes(member.id)
                      const hasRestrictions =
                        (member.dietary_restrictions?.length ?? 0) > 0 ||
                        (member.food_preferences?.length ?? 0) > 0 ||
                        (member.allergies?.length ?? 0) > 0
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            setAttendees((prev) =>
                              prev.includes(member.id)
                                ? prev.filter((x) => x !== member.id)
                                : [...prev, member.id]
                            )
                          }
                          title={hasRestrictions ? 'Has dietary restrictions or preferences' : undefined}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                            isSelected
                              ? 'border border-primary-300 bg-primary-100 text-primary-700'
                              : 'border border-surface-muted bg-white text-ink-secondary hover:border-primary-300'
                          }`}
                        >
                          {member.name || member.label || 'Member'}
                          {hasRestrictions && <span className="ml-1 text-xs opacity-70">*</span>}
                        </button>
                      )
                    })}
                  </div>
                  {attendees.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">Select at least one person to generate for.</p>
                  )}
                </div>
              )}

              {/* Dietary focus */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Dietary focus (optional)</div>
                <select
                  value={dietaryFocus}
                  onChange={(e) => setDietaryFocus(e.target.value)}
                  className="input w-full text-sm"
                >
                  {DIETARY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Notes (optional)</div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canFireGenerate) handleGenerate() }}
                  placeholder="e.g. something light, use chicken, no onions"
                  className="input w-full text-sm"
                />
                <p className="mt-1 text-xs text-ink-tertiary">AI will take this into account when picking a recipe.</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-surface-muted bg-white p-4">
            <button
              type="button"
              disabled={!canFireGenerate}
              onClick={handleGenerate}
              className="group flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4" />
              Generate {mealSlot}
            </button>
          </div>
        </>
      )}

      {/* ── Generating phase ───────────────────────────────────── */}
      {phase === 'generating' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
          <div className="text-base font-medium text-ink-primary">Finding a great {mealSlot} for you…</div>
          <div className="text-sm text-ink-secondary">This usually takes 10–20 seconds.</div>
        </div>
      )}

      {/* ── Review phase ───────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="relative flex-1 overflow-y-auto bg-surface-base">
          <div className="mx-auto w-full max-w-xl px-4 py-4">
            <SwipeDeck
              items={mealItems}
              batchLoading={tryingAnother}
              onAccept={() => meal && onAccept(meal)}
              onReject={handleTryAnother}
              onEdit={() => { setShowRefine((v) => !v); setRefineText('') }}
            />
          </div>

          {/* Refine overlay — slides up over the deck */}
          {showRefine && meal && (
            <div
              className="absolute inset-0 flex flex-col items-end justify-end bg-black/50"
              onClick={() => { setShowRefine(false); setRefineText('') }}
            >
              <div
                className="w-full rounded-t-3xl bg-white p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-base font-semibold text-ink-primary">Tweak this meal</div>
                <div className="mt-0.5 text-sm text-ink-secondary">{meal.name}</div>
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
                    What should change?
                  </label>
                  <input
                    type="text"
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && refineText.trim() && !refining) handleRefineSubmit() }}
                    placeholder="e.g. make it vegetarian, less spicy, use mushrooms"
                    className="input w-full"
                    autoFocus
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowRefine(false); setRefineText('') }}
                    className="flex-1 rounded-full border border-surface-muted py-2.5 text-sm font-medium text-ink-secondary hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRefineSubmit}
                    disabled={!refineText.trim() || refining}
                    className="flex-1 rounded-full bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    {refining ? 'Refining…' : 'Refine'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
