import { useEffect, useMemo, useState } from 'react'

type Props = {
  dayDate: string
  open: boolean
  onClose: () => void
  onRegenerateDay: (dayDate: string) => void
  onCopyDay: (dayDate: string, targetDate: string) => void
  onInsertDay: (dayDate: string) => void
  onAddNote: (dayDate: string, note: string) => void
  onClearDay: (dayDate: string) => void
  visibleWeekDates?: string[]
}

export function DayActionsMenu({
  dayDate,
  open,
  onClose,
  onRegenerateDay,
  onCopyDay,
  onInsertDay,
  onAddNote,
  onClearDay,
  visibleWeekDates = [],
}: Props) {
  const [note, setNote] = useState('')
  const [showCopy, setShowCopy] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<'insert' | 'clear' | null>(null)

  useEffect(() => {
    if (!open) {
      setNote('')
      setShowCopy(false)
      setShowNote(false)
      setConfirmTarget(null)
    }
  }, [open])

  const copyTargets = useMemo(() => visibleWeekDates.filter((value) => value !== dayDate), [visibleWeekDates, dayDate])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card shadow-2xl md:left-1/2 md:right-auto md:w-full md:max-w-md md:-translate-x-1/2" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-surface-muted" />
        <div className="pb-4">
          <button type="button" onClick={() => { onRegenerateDay(dayDate); onClose() }} className="w-full border-b border-surface-muted p-4 text-left text-ink-primary">Regenerate Day</button>

          <div className="border-b border-surface-muted p-4">
            <button type="button" onClick={() => setShowCopy((value) => !value)} className="w-full text-left text-ink-primary">Copy to…</button>
            {showCopy ? (
              <div className="mt-3 space-y-2">
                {copyTargets.map((target) => (
                  <button key={target} type="button" onClick={() => { onCopyDay(dayDate, target); onClose() }} className="w-full rounded-2xl bg-surface-base px-3 py-3 text-left text-sm text-ink-primary">
                    {new Date(target).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-b border-surface-muted p-4">
            <button type="button" onClick={() => setConfirmTarget('insert')} className="w-full text-left text-ink-primary">Insert Blank Day</button>
            {confirmTarget === 'insert' ? (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => { onInsertDay(dayDate); onClose() }} className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-primary">Confirm</button>
                <button type="button" onClick={() => setConfirmTarget(null)} className="rounded-full border border-surface-muted px-4 py-2 text-sm text-ink-secondary">Cancel</button>
              </div>
            ) : null}
          </div>

          <div className="border-b border-surface-muted p-4">
            <button type="button" onClick={() => setShowNote((value) => !value)} className="w-full text-left text-ink-primary">Add note</button>
            {showNote ? (
              <div className="mt-3 space-y-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" rows={4} className="w-full rounded-2xl border border-surface-muted px-3 py-3 text-sm text-ink-primary" />
                <button type="button" onClick={() => { onAddNote(dayDate, note); onClose() }} className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-primary">Save note</button>
              </div>
            ) : null}
          </div>

          <button type="button" onClick={() => setConfirmTarget('clear')} className="w-full border-b border-surface-muted p-4 text-left text-ink-primary">Clear Day</button>
          {confirmTarget === 'clear' ? (
            <div className="px-4 pt-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => { onClearDay(dayDate); onClose() }} className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-primary">Confirm</button>
                <button type="button" onClick={() => setConfirmTarget(null)} className="rounded-full border border-surface-muted px-4 py-2 text-sm text-ink-secondary">Cancel</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
