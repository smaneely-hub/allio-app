import { useEffect, useState } from 'react'

type Props = {
  dayDate: string
  open: boolean
  onClose: () => void
  onClearDay: (dayDate: string) => void
}

export function DayActionsMenu({ dayDate, open, onClose, onClearDay }: Props) {
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!open) setConfirmClear(false)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-card shadow-2xl md:left-1/2 md:right-auto md:w-full md:max-w-md md:-translate-x-1/2" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-surface-muted" />
        <div className="pb-6">
          {!confirmClear ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="w-full cursor-pointer border-b border-surface-muted p-4 text-left text-red-600 transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              >
                Clear Day
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full cursor-pointer p-4 text-left text-ink-secondary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="px-4 py-2">
              <p className="mb-4 text-sm text-ink-secondary">Remove all meals for this day?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { onClearDay(dayDate); onClose() }}
                  className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
                >
                  Clear Day
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-full border border-surface-muted px-4 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
