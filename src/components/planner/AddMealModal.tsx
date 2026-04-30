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
function ImportIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
}
function ChevronRightIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

const sourceMeta = {
  generated: { label: 'Generate', sublabel: 'AI creates a new recipe', icon: SparklesIcon },
  catalog: { label: 'Catalog', sublabel: 'Pick from your saved recipes', icon: BookOpenIcon },
  eat_out: { label: 'Eat Out', sublabel: 'Dining at a restaurant', icon: UtensilsIcon },
  takeout: { label: 'Takeout', sublabel: 'Picking up from a place', icon: ShoppingBagIcon },
  delivery: { label: 'Delivery', sublabel: 'Getting it delivered', icon: TruckIcon },
  import: { label: 'Import', sublabel: 'Bring in a recipe or link', icon: ImportIcon },
} as const

export function AddMealModal({ open, onClose, dayKey, mealSlot, existingMealId, canGenerate = true, onGenerate, onSaveMeal }: Props) {
  const [showCatalog, setShowCatalog] = useState(false)

  const subtitle = useMemo(() => `${dayKey.toUpperCase()} · ${mealSlot}`, [dayKey, mealSlot])
  const strategyHint = canGenerate ? 'Choose a meal strategy for this slot.' : 'Who is eating is not set for this slot yet. You can still choose catalog, import, eat out, takeout, or delivery.'

  if (!open) return null

  const rows: MealSource[] = ['generated', 'catalog', 'import', 'eat_out', 'takeout', 'delivery']

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose}>
        <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card p-4 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-lg font-semibold text-ink-primary">Add meal</div>
          <div className="mt-1 text-sm text-ink-secondary">{subtitle}</div>
          <div className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-sm text-ink-secondary">{strategyHint}</div>
          <div className="mt-4 overflow-hidden rounded-xl bg-surface-card shadow-card">
            {rows.map((source, index) => {
              const meta = sourceMeta[source]
              const Icon = meta.icon
              const disabled = source === 'generated' && !canGenerate
              return (
                <button
                  key={source}
                  type="button"
                  disabled={disabled}
                  onClick={async () => {
                    if (source === 'generated') {
                      if (!canGenerate) return
                      onGenerate()
                      onClose()
                    } else if (source === 'catalog') {
                      setShowCatalog(true)
                    } else if (source === 'import') {
                      await onSaveMeal({ existingMealId, meal_source: 'catalog', source_recipe_id: null, place_name: null, source_note: 'import_requested', title: 'Import', mealSlot, dayKey })
                      onClose()
                    } else {
                      await onSaveMeal({ existingMealId, meal_source: source, source_recipe_id: null, place_name: null, source_note: null, title: sourceMeta[source].label, mealSlot, dayKey })
                      onClose()
                    }
                  }}
                  className={`flex min-h-14 w-full items-center gap-3 bg-surface-card p-4 text-left ${index > 0 ? 'border-t border-surface-muted' : ''} ${disabled ? 'opacity-50' : ''}`}
                >
                  <Icon className="h-5 w-5 text-accent-blue" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink-primary">{meta.label}</div>
                    <div className="text-sm text-ink-secondary">{disabled ? 'Select household members first' : meta.sublabel}</div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-ink-tertiary" />
                </button>
              )
            })}
          </div>
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
