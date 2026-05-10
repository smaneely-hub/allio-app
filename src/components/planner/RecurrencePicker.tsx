import { parseIsoLocalDate } from '../../lib/planner'

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

type Meal = {
  date?: string | null
  day_name?: string
  recurrence?: { type: RecurrenceType }
}

type Props = {
  open: boolean
  meal: Meal | null
  onClose: () => void
  onSelect: (type: RecurrenceType) => void
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function getOptionLabel(type: RecurrenceType, meal: Meal | null): { label: string; sub: string } {
  const anchor = meal?.date ? parseIsoLocalDate(meal.date) : null
  switch (type) {
    case 'none':
      return { label: 'Does not repeat', sub: '' }
    case 'daily':
      return { label: 'Daily', sub: 'Every day' }
    case 'weekdays':
      return { label: 'Weekdays', sub: 'Monday through Friday' }
    case 'weekly':
      return {
        label: 'Weekly',
        sub: anchor
          ? `Every ${anchor.toLocaleDateString('en-US', { weekday: 'long' })}`
          : 'Every week on the same day',
      }
    case 'monthly':
      return {
        label: 'Monthly',
        sub: anchor
          ? `Monthly on the ${ordinal(anchor.getDate())}`
          : 'Monthly on the same date',
      }
    case 'yearly':
      return {
        label: 'Yearly',
        sub: anchor
          ? `Annually on ${anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
          : 'Yearly on the same date',
      }
  }
}

const RECURRENCE_TYPES: RecurrenceType[] = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']

function RepeatIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 23l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RecurrencePicker({ open, meal, onClose, onSelect }: Props) {
  if (!open || !meal) return null

  const current = meal.recurrence?.type ?? 'none'
  const mealName = (meal as any).title || (meal as any).name || 'this meal'

  return (
    <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card p-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />

        <div className="mb-1 flex items-center gap-2">
          <RepeatIcon className="h-5 w-5 text-primary-500" />
          <div className="text-lg font-semibold text-ink-primary">Repeat</div>
        </div>
        <div className="mb-4 text-sm text-ink-secondary truncate">{mealName}</div>

        <div className="space-y-2 pb-3">
          {RECURRENCE_TYPES.map((type) => {
            const { label, sub } = getOptionLabel(type, meal)
            const active = type === current
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelect(type)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${
                  active
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-divider bg-white text-text-primary hover:bg-warm-50'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  {sub ? <div className="mt-0.5 text-xs text-ink-secondary">{sub}</div> : null}
                </div>
                {active ? (
                  <svg className="h-5 w-5 shrink-0 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full cursor-pointer rounded-2xl bg-bg-primary px-4 py-3 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
