import { useEffect, useState } from 'react'

type Props = {
  dayDate: string
  open: boolean
  onClose: () => void
  onRegenerateDay: (dayDate: string) => void
  onCopyDay: (dayDate: string, targetDate: string) => void
  onInsertDay: (dayDate: string) => void
  onAddNote: (dayDate: string, note: string) => void
  onClearDay: (dayDate: string) => void
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
}: Props) {
  const [copyTarget, setCopyTarget] = useState('')
  const [note, setNote] = useState('')
  const [showCopy, setShowCopy] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopyTarget('')
      setNote('')
      setShowCopy(false)
      setShowNote(false)
      setShowClearConfirm(false)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-surface-muted" />
        <div className="pb-4">
          <button type="button" onClick={() => { onRegenerateDay(dayDate); onClose() }} className="w-full border-b border-surface-muted p-4 text-left text-ink-primary">Regenerate Day</button>
          <div className="border-b border-surface-muted p-4">
            <button type="button" onClick={() => setShowCopy((v) => !v)} className="w-full text-left text-ink-primary">Copy To...</button>
            {showCopy ? (
              <div className="mt-3 flex gap-2">
                <input type="date" value={copyTarget} onChange={(e) => setCopyTarget(e.target.value)} className="flex-1 rounded-lg border border-surface-muted px-3 py-2 text-sm" />
                <button type="button" onClick={() => { if (copyTarget) { onCopyDay(dayDate, copyTarget); onClose() } }} className="rounded-lg bg-accent-blue px-3 py-2 text-sm text-white">Copy</button>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => { onInsertDay(dayDate); onClose() }} className="w-full border-b border-surface-muted p-4 text-left text-ink-primary">Insert Blank Day</button>
          <div className="border-b border-surface-muted p-4">
            <button type="button" onClick={() => setShowNote((v) => !v)} className="w-full text-left text-ink-primary">Add Note</button>
            {showNote ? (
              <div className="mt-3 space-y-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" className="w-full rounded-lg border border-surface-muted px-3 py-2 text-sm" />
                <button type="button" onClick={() => { onAddNote(dayDate, note); onClose() }} className="rounded-lg bg-accent-blue px-3 py-2 text-sm text-white">Save note</button>
              </div>
            ) : null}
          </div>
          <div className="p-4">
            <button type="button" onClick={() => setShowClearConfirm((v) => !v)} className="w-full text-left text-red-600">Clear Day</button>
            {showClearConfirm ? (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => { onClearDay(dayDate); onClose() }} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">Confirm</button>
                <button type="button" onClick={() => setShowClearConfirm(false)} className="rounded-lg border border-surface-muted px-3 py-2 text-sm text-ink-primary">Cancel</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
