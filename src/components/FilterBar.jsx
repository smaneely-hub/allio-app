/** Render a horizontal tag filter bar with selectable pills. */
export function FilterBar({ tags = [], selectedTags = [], onToggleTag }) {
  if (!tags.length) return null

  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-2">
        {tags.map((tag) => {
          const active = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap',
                active
                  ? 'border-primary-400 bg-primary-500 text-white shadow-sm'
                  : 'border-divider bg-white text-text-secondary hover:border-primary-200 hover:bg-primary-50'
              ].join(' ')}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
