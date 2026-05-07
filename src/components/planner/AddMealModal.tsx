import { useMemo, useState } from 'react'
import { CatalogPickerModal } from './CatalogPickerModal'

type MealSource = 'generated' | 'catalog' | 'eat_out' | 'takeout' | 'delivery' | 'import'

type Props = {
  open: boolean
  onClose: () => void
  dayKey: string
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  mealPlanId: string
  existingMealId?: string | null
  canGenerate?: boolean
  onGenerate: () => void
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

const diningMeta = {
  eat_out: { label: 'Eat Out', sublabel: 'Dining at a restaurant', icon: UtensilsIcon },
  takeout: { label: 'Takeout', sublabel: 'Picking up from a place', icon: ShoppingBagIcon },
  delivery: { label: 'Delivery', sublabel: 'Getting it delivered', icon: TruckIcon },
} as const

export function AddMealModal({ open, onClose, dayKey, mealSlot, existingMealId, canGenerate = true, onGenerate, onSaveMeal }: Props) {
  const [showCatalog, setShowCatalog] = useState(false)
  const [diningSource, setDiningSource] = useState<'eat_out' | 'takeout' | 'delivery' | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [savingDiningOut, setSavingDiningOut] = useState(false)

  const subtitle = useMemo(() => {
    const day = dayKey.toUpperCase()
    const slot = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)
    return `${day} · ${slot}`
  }, [dayKey, mealSlot])

  if (!open) return null

  const resetDiningFlow = () => {
    setDiningSource(null)
    setPlaceName('')
    setSourceNote('')
    setSavingDiningOut(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => { resetDiningFlow(); onClose() }}>
        <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card p-4 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-semibold text-ink-primary">Add meal</div>
          <div className="mt-1 text-sm text-ink-secondary">{subtitle}</div>

          {!diningSource ? (
            <>
              {/* Generate with AI */}
              {canGenerate ? (
                <div className="mt-4 overflow-hidden rounded-xl bg-surface-card shadow-card">
                  <div className="border-b border-surface-muted px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Generate</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onGenerate(); onClose() }}
                    className="group flex min-h-14 w-full cursor-pointer items-center gap-3 bg-surface-card p-4 text-left transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                  >
                    <SparklesIcon className="h-5 w-5 text-primary-500 transition-colors duration-150 group-hover:text-primary-600" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">Generate with AI</div>
                      <div className="text-sm text-ink-secondary">AI picks a recipe for this slot</div>
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
