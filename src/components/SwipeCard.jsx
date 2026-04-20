import { useRef, useState } from 'react'

export function SwipeCard({ meal, image, onAccept, onReject }) {
  const [drag, setDrag] = useState({ x: 0, dragging: false })
  const [exiting, setExiting] = useState(false)
  const [exitX, setExitX] = useState(0)
  const startRef = useRef(null)
  const cardRef = useRef(null)

  const handlePointerDown = (e) => {
    if (exiting) return
    startRef.current = { x: e.clientX }
    setDrag({ x: 0, dragging: true })
    cardRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!drag.dragging || !startRef.current || exiting) return
    setDrag({ x: e.clientX - startRef.current.x, dragging: true })
  }

  const handlePointerUp = () => {
    if (!drag.dragging || exiting) return
    const w = cardRef.current?.offsetWidth || 300
    const threshold = w * 0.33
    if (drag.x > threshold) {
      setExiting(true)
      setExitX(w * 1.6)
    } else if (drag.x < -threshold) {
      setExiting(true)
      setExitX(-w * 1.6)
    } else {
      setDrag({ x: 0, dragging: false })
    }
    startRef.current = null
  }

  const handleTransitionEnd = (e) => {
    if (!exiting || e.propertyName !== 'transform') return
    if (exitX > 0) onAccept()
    else onReject()
  }

  const displayX = exiting ? exitX : drag.x
  const rotation = displayX * 0.06
  const acceptOpacity = Math.max(0, Math.min(1, drag.x / 60))
  const rejectOpacity = Math.max(0, Math.min(1, -drag.x / 60))

  const totalTime = (meal.prep_time_minutes || 0) + (meal.cook_time_minutes || 0)
  const dietaryTags = (meal.recipeTags?.dietary || []).slice(0, 2)

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 overflow-hidden rounded-3xl border border-divider bg-white shadow-lg"
      style={{
        transform: `translateX(${displayX}px) rotate(${rotation}deg)`,
        transition: drag.dragging ? 'none' : 'transform 0.35s cubic-bezier(0.6, -0.05, 0.75, 1)',
        touchAction: 'pan-y',
        cursor: exiting ? 'default' : drag.dragging ? 'grabbing' : 'grab',
        willChange: 'transform',
        zIndex: 10,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Swipe indicators */}
      <div
        className="pointer-events-none absolute left-5 top-24 z-20 rotate-[-22deg] rounded-xl border-4 border-primary-500 px-3 py-1 text-xl font-black uppercase text-primary-600"
        style={{ opacity: acceptOpacity }}
      >
        Keep!
      </div>
      <div
        className="pointer-events-none absolute right-5 top-24 z-20 rotate-[22deg] rounded-xl border-4 border-red-400 px-3 py-1 text-xl font-black uppercase text-red-500"
        style={{ opacity: rejectOpacity }}
      >
        Next
      </div>

      <div className="h-full overflow-y-auto">
        {image?.url ? (
          <img
            src={image.url}
            alt={meal.name}
            className="h-48 w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-warm-100">
            <span className="text-6xl">🍽️</span>
          </div>
        )}

        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            {totalTime > 0 && (
              <span className="rounded-full bg-warm-100 px-2.5 py-1 text-xs font-medium text-text-secondary">
                ⏱ {totalTime} min
              </span>
            )}
            {meal.servings && (
              <span className="rounded-full bg-warm-100 px-2.5 py-1 text-xs font-medium text-text-secondary">
                {meal.servings} servings
              </span>
            )}
            {dietaryTags.map((tag) => (
              <span key={tag} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                {tag}
              </span>
            ))}
          </div>

          <h2 className="font-display text-2xl leading-tight text-text-primary">{meal.name}</h2>
          <p className="line-clamp-3 text-sm text-text-secondary">{meal.description || meal.reason}</p>

          {meal.why_this_meal && (
            <p className="rounded-2xl bg-primary-50 p-3 text-sm text-primary-800">{meal.why_this_meal}</p>
          )}
        </div>
      </div>
    </div>
  )
}
