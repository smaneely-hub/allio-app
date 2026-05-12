import { useState, useEffect } from 'react'
import { parseIsoLocalDate } from '../../lib/planner'

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type Frequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type EndType = 'never' | 'date' | 'count'

export type RecurrenceRule = {
  frequency: Frequency
  interval: number
  byWeekday: WeekdayKey[]
  endType: EndType
  endDate: string | null
  endCount: number | null
  exdates: string[]
}

type Meal = {
  date?: string | null
  day_name?: string
  title?: string
  name?: string
  recurrence?: Partial<RecurrenceRule> & { type?: string }
}

type Props = {
  open: boolean
  meal: Meal | null
  onClose: () => void
  onSelect: (rule: RecurrenceRule) => void
}

const DOW_INDEX_TO_SHORT: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const LEGACY_FREQ_MAP: Record<string, Frequency> = {
  none: 'none', daily: 'daily', weekdays: 'weekly', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly',
}
const WEEKDAY_ORDER: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const WEEKDAY_DISPLAY: Record<WeekdayKey, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
}
const WEEKDAY_FULL: Record<WeekdayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

function unitLabel(freq: Frequency, n: number): string {
  const s = n === 1 ? '' : 's'
  switch (freq) {
    case 'daily': return 'day' + s
    case 'weekly': return 'week' + s
    case 'monthly': return 'month' + s
    case 'yearly': return 'year' + s
    default: return ''
  }
}

function initRule(meal: Meal | null): RecurrenceRule {
  const rec = meal?.recurrence
  const blank: RecurrenceRule = {
    frequency: 'none', interval: 1, byWeekday: [], endType: 'never', endDate: null, endCount: null, exdates: [],
  }
  if (!rec) return blank

  // Legacy Phase 1 format: { type: 'daily' }
  if ((rec as any).type && !(rec as any).frequency) {
    const legacyType = String((rec as any).type)
    const frequency = (LEGACY_FREQ_MAP[legacyType] as Frequency) || 'none'
    const byWeekday: WeekdayKey[] = legacyType === 'weekdays' ? ['mon', 'tue', 'wed', 'thu', 'fri'] : []
    return { ...blank, frequency, byWeekday }
  }

  return {
    frequency: (rec.frequency || 'none') as Frequency,
    interval: Math.max(1, rec.interval || 1),
    byWeekday: (rec.byWeekday || []) as WeekdayKey[],
    endType: (rec.endType || 'never') as EndType,
    endDate: rec.endDate || null,
    endCount: rec.endCount || null,
    exdates: rec.exdates || [],
  }
}

function RepeatIcon(props: React.SVGProps<SVGSVGElement>) {
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
  const [rule, setRule] = useState<RecurrenceRule>(() => initRule(meal))

  useEffect(() => {
    if (open) setRule(initRule(meal))
  }, [open, meal])

  if (!open || !meal) return null

  const mealName = meal.title || meal.name || 'this meal'
  const anchorDate = meal.date ? parseIsoLocalDate(meal.date) : null
  const anchorDow: WeekdayKey | null = anchorDate ? DOW_INDEX_TO_SHORT[anchorDate.getDay()] : null

  const handleFreqChange = (freq: Frequency) => {
    setRule((prev) => {
      const next: RecurrenceRule = { ...prev, frequency: freq }
      // Default byWeekday to anchor's weekday when switching to weekly with nothing set
      if (freq === 'weekly' && prev.byWeekday.length === 0 && anchorDow) {
        next.byWeekday = [anchorDow]
      }
      return next
    })
  }

  const toggleWeekday = (day: WeekdayKey) => {
    setRule((prev) => ({
      ...prev,
      byWeekday: prev.byWeekday.includes(day)
        ? prev.byWeekday.filter((d) => d !== day)
        : [...prev.byWeekday, day],
    }))
  }

  const handleEndTypeChange = (et: EndType) => {
    setRule((prev) => ({
      ...prev,
      endType: et,
      // Seed defaults when switching to a new end type
      endCount: et === 'count' && prev.endCount == null ? 10 : prev.endCount,
    }))
  }

  const handleSave = () => {
    const finalRule: RecurrenceRule = {
      ...rule,
      exdates: rule.exdates || [],
    }
    // If weekly with no days selected, default to anchor's weekday
    if (finalRule.frequency === 'weekly' && finalRule.byWeekday.length === 0 && anchorDow) {
      finalRule.byWeekday = [anchorDow]
    }
    // Ensure endCount is set when endType is 'count'
    if (finalRule.endType === 'count' && (finalRule.endCount == null || finalRule.endCount < 1)) {
      finalRule.endCount = 10
    }
    onSelect(finalRule)
  }

  const { frequency: freq, interval } = rule

  return (
    <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface-card p-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />

        {/* Header */}
        <div className="mb-1 flex items-center gap-2">
          <RepeatIcon className="h-5 w-5 text-primary-500" />
          <div className="text-lg font-semibold text-ink-primary">Repeat</div>
        </div>
        <div className="mb-4 truncate text-sm text-ink-secondary">{mealName}</div>

        {/* Frequency pills */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Frequency</div>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFreqChange(value)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${
                  freq === value
                    ? 'border-primary-400 bg-primary-500 text-white'
                    : 'border-divider bg-white text-ink-primary hover:bg-warm-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {freq !== 'none' && (
          <>
            {/* Interval stepper */}
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
                Repeat every
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={interval <= 1}
                  onClick={() => setRule((prev) => ({ ...prev, interval: Math.max(1, prev.interval - 1) }))}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-divider bg-white text-ink-primary transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="Decrease interval"
                >
                  –
                </button>
                <span className="min-w-[2ch] text-center text-sm font-semibold text-ink-primary">
                  {interval}
                </span>
                <button
                  type="button"
                  disabled={interval >= 99}
                  onClick={() => setRule((prev) => ({ ...prev, interval: Math.min(99, prev.interval + 1) }))}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-divider bg-white text-ink-primary transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="Increase interval"
                >
                  +
                </button>
                <span className="text-sm text-ink-secondary">{unitLabel(freq, interval)}</span>
              </div>
            </div>

            {/* Weekday picker (weekly only) */}
            {freq === 'weekly' && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
                  On days
                </div>
                <div className="flex gap-1.5">
                  {WEEKDAY_ORDER.map((day) => {
                    const active = rule.byWeekday.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        title={WEEKDAY_FULL[day]}
                        onClick={() => toggleWeekday(day)}
                        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                          active
                            ? 'border-primary-400 bg-primary-500 text-white'
                            : 'border-divider bg-white text-ink-primary hover:bg-warm-50'
                        }`}
                      >
                        {WEEKDAY_DISPLAY[day]}
                      </button>
                    )
                  })}
                </div>
                {rule.byWeekday.length === 0 && anchorDow && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No day selected — will default to {WEEKDAY_FULL[anchorDow]}.
                  </p>
                )}
              </div>
            )}

            {/* End condition */}
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
                Ends
              </div>
              <div className="space-y-2">
                {/* Never */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-divider bg-white px-3 py-2.5 transition hover:bg-warm-50">
                  <input
                    type="radio"
                    name="endType"
                    value="never"
                    checked={rule.endType === 'never'}
                    onChange={() => handleEndTypeChange('never')}
                    className="accent-primary-500"
                  />
                  <span className="text-sm text-ink-primary">Never</span>
                </label>

                {/* On date */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-divider bg-white px-3 py-2.5 transition hover:bg-warm-50">
                  <input
                    type="radio"
                    name="endType"
                    value="date"
                    checked={rule.endType === 'date'}
                    onChange={() => handleEndTypeChange('date')}
                    className="accent-primary-500"
                  />
                  <span className="flex-1 text-sm text-ink-primary">On date</span>
                  {rule.endType === 'date' && (
                    <input
                      type="date"
                      value={rule.endDate || ''}
                      min={meal.date || undefined}
                      onChange={(e) =>
                        setRule((prev) => ({ ...prev, endDate: e.target.value || null }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg border border-divider px-2 py-1 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  )}
                </label>

                {/* After N occurrences */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-divider bg-white px-3 py-2.5 transition hover:bg-warm-50">
                  <input
                    type="radio"
                    name="endType"
                    value="count"
                    checked={rule.endType === 'count'}
                    onChange={() => handleEndTypeChange('count')}
                    className="accent-primary-500"
                  />
                  <span className="text-sm text-ink-primary">After</span>
                  {rule.endType === 'count' && (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={rule.endCount ?? 10}
                        onChange={(e) =>
                          setRule((prev) => ({
                            ...prev,
                            endCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 rounded-lg border border-divider px-2 py-1 text-center text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                      <span className="text-sm text-ink-primary">occurrences</span>
                    </>
                  )}
                  {rule.endType !== 'count' && (
                    <span className="text-sm text-ink-secondary">N occurrences</span>
                  )}
                </label>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-2xl bg-bg-primary px-4 py-3 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 cursor-pointer rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
