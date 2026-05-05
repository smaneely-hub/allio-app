export function PlannerActionSheet({ title, subtitle, actions = [], isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />
        <div className="mb-4">
          <div className="text-lg font-semibold text-text-primary">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-text-secondary">{subtitle}</div> : null}
        </div>
        <div className="space-y-2 pb-3">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                onClose()
                action.onClick?.()
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${action.danger ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-divider bg-white text-text-primary hover:bg-warm-50'}`}
            >
              <span>{action.label}</span>
              {action.meta ? <span className="text-xs text-text-muted">{action.meta}</span> : null}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full cursor-pointer rounded-2xl bg-bg-primary px-4 py-3 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
          Cancel
        </button>
      </div>
    </div>
  )
}
