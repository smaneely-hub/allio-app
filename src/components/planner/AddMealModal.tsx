import { useEffect, useMemo, useState } from 'react'
import { CatalogPickerModal } from './CatalogPickerModal'

type MealSource = 'generated' | 'catalog' | 'eat_out' | 'takeout' | 'delivery' | 'import'

type Member = {
  id: string
  name?: string
  label?: string
  dietary_restrictions?: string[]
  food_preferences?: string[]
  allergies?: string[]
}

export type GenerateParams = {
  effort: string
  attendees: string[]
  planningNotes: string
}

type Props = {
  open: boolean
  onClose: () => void
  dayKey: string
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  mealPlanId: string
  existingMealId?: string | null
  canGenerate?: boolean
  members?: Member[]
  defaultEffort?: string
  defaultAttendees?: string[]
  startOnGenerate?: boolean
  onGenerate: (params: GenerateParams) => void
  onSaveMeal: (input: {
    existingMealId?: string | null
    meal_source: MealSource
    source_recipe_id?: string | null
    place_name?: string | null
    source_note?: string | null
    mealSlot: string
    dayKey: string
    recipe?: { id: string; title: string; cuisine?: string | null; image_url?: string | null }
    title?: string
  }) => Promise<void>
}

function SparklesIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function BookOpenIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
}
function UtensilsIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M3 2v7c0 1.1.9 2 2 2h3V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v8c0 1.1.9 2 2 2h3Z" /></svg>
}
function ShoppingBagIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
}
function TruckIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M10 17h4V5H2v12h3" /><path d="M14 8h4l4 4v5h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
}
function ChevronRightIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function ChevronLeftIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

const EFFORT_OPTIONS = [
  { value: 'low', label: 'Easy' },
  { value: 'medium', label: 'Moderate' },
  { value: 'high', label: 'Involved' },
]

const diningMeta = {
  eat_out: { label: 'Eat Out', sublabel: 'Dining at a restaurant', icon: UtensilsIcon },
  takeout: { label: 'Takeout', sublabel: 'Picking up from a place', icon: ShoppingBagIcon },
  delivery: { label: 'Delivery', sublabel: 'Getting it delivered', icon: TruckIcon },
} as const

export function AddMealModal({
  open,
  onClose,
  dayKey,
  mealSlot,
  existingMealId,
  canGenerate = true,
  members = [],
  defaultEffort = 'medium',
  defaultAttendees,
  startOnGenerate = false,
  onGenerate,
  onSaveMeal,
}: Props) {
  const [showCatalog, setShowCatalog] = useState(false)
  const [diningSource, setDiningSource] = useState<'eat_out' | 'takeout' | 'delivery' | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [savingDiningOut, setSavingDiningOut] = useState(false)

  // Generate panel state
  const [showGeneratePanel, setShowGeneratePanel] = useState(false)
  const [generateEffort, setGenerateEffort] = useState(defaultEffort)
  const [generateAttendees, setGenerateAttendees] = useState<string[]>(
    () => defaultAttendees?.length ? defaultAttendees : members.map((m) => m.id)
  )
  const [generateNotes, setGenerateNotes] = useState('')

  const subtitle = useMemo(() => {
    const day = dayKey.toUpperCase()
    const slot = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)
    return `${day} · ${slot}`
  }, [dayKey, mealSlot])

  useEffect(() => {
    if (open) {
      setShowGeneratePanel(Boolean(startOnGenerate))
    } else {
      setShowGeneratePanel(false)
    }
  }, [open, startOnGenerate])

  if (!open) return null

  const resetDiningFlow = () => {
    setDiningSource(null)
    setPlaceName('')
    setSourceNote('')
    setSavingDiningOut(false)
  }

  const toggleAttendee = (id: string) => {
    setGenerateAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const canFireGenerate = members.length === 0 || generateAttendees.length > 0

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={() => { resetDiningFlow(); setShowGeneratePanel(false); onClose() }}
      >
        <div
          className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card p-4 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Generate panel ─────────────────────────────── */}
          {showGeneratePanel ? (
            <>
              <button
                type="button"
                onClick={() => setShowGeneratePanel(false)}
                className="mb-3 flex items-center gap-1 text-sm text-ink-secondary transition-colors duration-150 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 rounded-md cursor-pointer"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back
              </button>

              <div className="text-lg font-semibold text-ink-primary">Generate a meal</div>
              <div className="mt-0.5 text-sm text-ink-secondary">{subtitle}</div>

              <div className="mt-4 space-y-5">
                {/* Effort */}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Effort</div>
                  <div className="flex gap-2">
                    {EFFORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGenerateEffort(opt.value)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer ${
                          generateEffort === opt.value
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
                          onClick={() => setGenerateAttendees(members.map((m) => m.id))}
                          className="text-primary-600 hover:underline cursor-pointer focus-visible:outline-none"
                        >
                          All
                        </button>
                        <span className="text-ink-tertiary">|</span>
                        <button
                          type="button"
                          onClick={() => setGenerateAttendees([])}
                          className="text-primary-600 hover:underline cursor-pointer focus-visible:outline-none"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => {
                        const isSelected = generateAttendees.includes(member.id)
                        const hasRestrictions =
                          (member.dietary_restrictions?.length ?? 0) > 0 ||
                          (member.food_preferences?.length ?? 0) > 0 ||
                          (member.allergies?.length ?? 0) > 0
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleAttendee(member.id)}
                            title={hasRestrictions ? 'Has dietary restrictions or preferences' : undefined}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer ${
                              isSelected
                                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                                : 'bg-white text-ink-secondary border border-surface-muted hover:border-primary-300'
                            }`}
                          >
                            {member.name || member.label || 'Member'}
                            {hasRestrictions && <span className="ml-1 text-xs opacity-70">*</span>}
                          </button>
                        )
                      })}
                    </div>
                    {generateAttendees.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-600">Select at least one person to generate for.</p>
                    )}
                  </div>
                )}

                {/* Planning notes */}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Notes (optional)</div>
                  <input
                    type="text"
                    value={generateNotes}
                    onChange={(e) => setGenerateNotes(e.target.value)}
                    placeholder="e.g. something light, use chicken, no onions"
                    className="input w-full text-sm"
                  />
                  <p className="mt-1 text-xs text-ink-tertiary">AI will take this into account when picking a recipe.</p>
                </div>
              </div>

              <button
                type="button"
                disabled={!canFireGenerate}
                onClick={() => {
                  onGenerate({ effort: generateEffort, attendees: generateAttendees, planningNotes: generateNotes })
                  onClose()
                }}
                className="mt-5 group flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SparklesIcon className="h-4 w-4" />
                Generate {mealSlot}
              </button>
            </>
          ) : !diningSource ? (
            /* ── Main choice view ──────────────────────────── */
            <>
              <div className="text-lg font-semibold text-ink-primary">Add meal</div>
              <div className="mt-1 text-sm text-ink-secondary">{subtitle}</div>

              {/* Generate with AI */}
              {canGenerate ? (
                <div className="mt-4 overflow-hidden rounded-xl bg-surface-card shadow-card">
                  <div className="border-b border-surface-muted px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Generate</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGeneratePanel(true)}
                    className="group flex min-h-14 w-full cursor-pointer items-center gap-3 bg-surface-card p-4 text-left transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                  >
                    <SparklesIcon className="h-5 w-5 text-primary-500 transition-colors duration-150 group-hover:text-primary-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">Generate with AI</div>
                      <div className="text-sm text-ink-secondary">Set effort, attendees, and notes, then generate</div>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-ink-tertiary transition-colors duration-150 group-hover:text-ink-primary" />
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Add household members to unlock AI generation.
                </div>
              )}

              {/* Catalog */}
              <div className="mt-3 overflow-hidden rounded-xl bg-surface-card shadow-card">
                <div className="border-b border-surface-muted px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Pick manually</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatalog(true)}
                  className="group flex min-h-14 w-full cursor-pointer items-center gap-3 bg-surface-card p-4 text-left transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  <BookOpenIcon className="h-5 w-5 text-accent-blue transition-colors duration-150 group-hover:text-primary-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">Catalog</div>
                    <div className="text-sm text-ink-secondary">Pick from your saved recipes</div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-ink-tertiary transition-colors duration-150 group-hover:text-ink-primary" />
                </button>
              </div>

              {/* Dining out */}
              <div className="mt-3 overflow-hidden rounded-xl bg-surface-card shadow-card">
                <div className="border-b border-surface-muted px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Dining out</div>
                </div>
                {(['eat_out', 'takeout', 'delivery'] as const).map((source, index) => {
                  const meta = diningMeta[source]
                  const Icon = meta.icon
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setDiningSource(source)}
                      className={`group flex min-h-14 w-full cursor-pointer items-center gap-3 bg-surface-card p-4 text-left transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${index > 0 ? 'border-t border-surface-muted' : ''}`}
                    >
                      <Icon className="h-5 w-5 text-accent-blue transition-colors duration-150 group-hover:text-primary-500" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">{meta.label}</div>
                        <div className="text-sm text-ink-secondary">{meta.sublabel}</div>
                      </div>
                      <ChevronRightIcon className="h-4 w-4 text-ink-tertiary transition-colors duration-150 group-hover:text-ink-primary" />
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            /* ── Dining details view ───────────────────────── */
            <div className="mt-4 rounded-2xl border border-surface-muted bg-white p-4 shadow-card">
              <div className="text-sm font-semibold text-ink-primary">{diningMeta[diningSource].label}</div>
              <div className="mt-1 text-sm text-ink-secondary">Add an optional place and note, then save when you're ready.</div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-primary">Where?</label>
                  <input
                    type="text"
                    value={placeName}
                    onChange={(event) => setPlaceName(event.target.value)}
                    placeholder="e.g. Joe's Pizza"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-primary">Note</label>
                  <input
                    type="text"
                    value={sourceNote}
                    onChange={(event) => setSourceNote(event.target.value)}
                    placeholder="e.g. Birthday dinner"
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  disabled={savingDiningOut}
                  onClick={async () => {
                    setSavingDiningOut(true)
                    try {
                      await onSaveMeal({
                        existingMealId,
                        meal_source: diningSource,
                        source_recipe_id: null,
                        place_name: placeName.trim() || null,
                        source_note: sourceNote.trim() || null,
                        title: diningMeta[diningSource].label,
                        mealSlot,
                        dayKey,
                      })
                      resetDiningFlow()
                      onClose()
                    } finally {
                      setSavingDiningOut(false)
                    }
                  }}
                  className="btn-primary cursor-pointer transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingDiningOut ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={savingDiningOut}
                  onClick={resetDiningFlow}
                  className="rounded-full border border-surface-muted px-4 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-stone-50 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CatalogPickerModal
        open={showCatalog}
        onClose={() => setShowCatalog(false)}
        onPick={async (recipe) => {
          await onSaveMeal({ existingMealId, meal_source: 'catalog', source_recipe_id: recipe.id, place_name: null, source_note: null, mealSlot, dayKey, recipe })
          setShowCatalog(false)
          onClose()
        }}
      />
    </>
  )
}
