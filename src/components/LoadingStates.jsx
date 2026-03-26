// Empty state component for pages with no data yet
export function EmptyState({ emoji, headline, body, ctaLabel, ctaLink, onCtaClick }) {
  return (
    <div className="card text-center py-12">
      <div className="text-6xl mb-6">{emoji}</div>
      <h2 className="font-display text-2xl text-warm-900 mb-3">{headline}</h2>
      <p className="text-warm-700 max-w-md mx-auto mb-6">{body}</p>
      {ctaLabel && (ctaLink || onCtaClick) && (
        ctaLink ? (
          <a href={ctaLink} className="btn-primary inline-block">
            {ctaLabel}
          </a>
        ) : (
          <button onClick={onCtaClick} className="btn-primary">
            {ctaLabel}
          </button>
        )
      )}
    </div>
  )
}

// Skeleton form fields for onboarding
export function OnboardingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="h-5 w-32 bg-warm-200 animate-pulse rounded"></div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-warm-200 animate-pulse rounded"></div>
            <div className="h-12 w-full bg-warm-200 animate-pulse rounded-xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-warm-200 animate-pulse rounded"></div>
            <div className="h-12 w-full bg-warm-200 animate-pulse rounded-xl"></div>
          </div>
        </div>
      </div>
      <div className="space-y-4 pt-6">
        <div className="h-5 w-32 bg-warm-200 animate-pulse rounded"></div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-24 bg-warm-200 animate-pulse rounded"></div>
            <div className="h-8 w-24 bg-warm-200 animate-pulse rounded-full"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-10 bg-warm-200 animate-pulse rounded-xl"></div>
            <div className="h-10 bg-warm-200 animate-pulse rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton for 7-column schedule grid
export function ScheduleSkeleton() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="grid gap-4 md:grid-cols-7">
      {days.map((day) => (
        <div key={day} className="card p-4">
          <div className="h-4 w-12 bg-warm-200 animate-pulse rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-warm-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton for meal card
export function MealCardSkeleton() {
  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4">
      <div className="h-36 bg-warm-100 animate-pulse rounded-t-2xl -mx-4 -mt-4 mb-4"></div>
      <div className="h-5 w-3/4 bg-warm-200 animate-pulse rounded mb-2"></div>
      <div className="h-3 w-1/2 bg-warm-200 animate-pulse rounded"></div>
    </div>
  )
}

// Skeleton for 7-column plan grid
export function PlanSkeleton() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  return (
    <div className="grid gap-4 md:grid-cols-7">
      {days.map((day) => (
        <div key={day} className="card p-4">
          <div className="h-4 w-12 bg-warm-200 animate-pulse rounded mb-4"></div>
          <div className="space-y-3">
            <MealCardSkeleton />
            <MealCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton for shopping list
export function ShopSkeleton() {
  const categories = ['Produce', 'Protein', 'Dairy', 'Pantry']
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="h-6 w-32 bg-warm-200 animate-pulse rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-warm-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Plan generation loading state - different from skeleton
export function PlanGenerationLoading() {
  return (
    <div className="card text-center py-16">
      <div className="text-6xl mb-6 animate-pulse">🧑‍🍳</div>
      <h2 className="font-display text-2xl text-warm-900 mb-3">Planning your week...</h2>
      <p className="text-warm-700 mb-6">This usually takes 5-15 seconds</p>
      <div className="flex justify-center gap-2">
        <span className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  )
}