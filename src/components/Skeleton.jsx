export function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-lg bg-warm-200 ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export function MealCardSkeleton() {
  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4">
      <Skeleton className="h-36 w-full mb-4 rounded-xl" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}