import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'
import { InstructionText } from './TimerChip'

function formatNutrition(nutrition) {
  if (!nutrition) return []
  return [
    nutrition.calories ? `🔥 ${nutrition.calories} cal` : null,
    nutrition.protein ? `💪 ${nutrition.protein} protein` : null,
    nutrition.carbs ? `🌾 ${nutrition.carbs} carbs` : null,
    nutrition.fat ? `🥑 ${nutrition.fat} fat` : null,
  ].filter(Boolean)
}

export function SwipeCard({ meal, image, onAccept, onReject }) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [exitX, setExitX] = useState(0)
  const gestureRef = useRef({ startX: 0, startY: 0, deltaX: 0, direction: null, active: false })
  const cardRef = useRef(null)

  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal?.title || meal?.name,
    prepTime: meal?.prep_time_minutes,
    cookTime: meal?.cook_time_minutes,
    totalTime: meal?.total_time_minutes,
    ingredientGroups: meal?.ingredientGroups,
    instructionGroups: meal?.instructionGroups,
    ingredients: meal?.ingredients,
    instructions: meal?.instructions,
    substitutions: meal?.substitutions,
    nutrition: meal?.nutrition,
    tags: meal?.recipeTags,
    sourceNote: meal?.sourceNote,
  }), [meal])

  useEffect(() => {
    const node = cardRef.current
    if (!node) return undefined

    const resetGesture = () => {
      gestureRef.current = { startX: 0, startY: 0, deltaX: 0, direction: null, active: false }
      setDragging(false)
    }

    const handleTouchStart = (event) => {
      if (animating) return
      const touch = event.touches[0]
      if (!touch) return
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        deltaX: 0,
        direction: null,
        active: true,
      }
      setAnimating(false)
    }

    const handleTouchMove = (event) => {
      const touch = event.touches[0]
      const gesture = gestureRef.current
      if (!touch || !gesture.active || animating) return

      const dx = touch.clientX - gesture.startX
      const dy = touch.clientY - gesture.startY
      gesture.deltaX = dx

      if (!gesture.direction) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return
        gesture.direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }

      if (gesture.direction === 'horizontal') {
        event.preventDefault()
        setDragging(true)
        setDragX(dx)
      }
    }

    const commitOrReset = (dx) => {
      if (Math.abs(dx) > 100) {
        const width = cardRef.current?.offsetWidth || 320
        setAnimating(true)
        setExitX(dx > 0 ? width * 1.2 : -width * 1.2)
        setDragX(dx > 0 ? width * 1.2 : -width * 1.2)
      } else {
        setAnimating(true)
        setExitX(0)
        setDragX(0)
      }
      resetGesture()
    }

    const handleTouchEnd = () => {
      const gesture = gestureRef.current
      if (!gesture.active || animating) return
      if (gesture.direction === 'horizontal') {
        commitOrReset(gesture.deltaX)
      } else {
        resetGesture()
      }
    }

    node.addEventListener('touchstart', handleTouchStart, { passive: true })
    node.addEventListener('touchmove', handleTouchMove, { passive: false })
    node.addEventListener('touchend', handleTouchEnd)
    node.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      node.removeEventListener('touchstart', handleTouchStart)
      node.removeEventListener('touchmove', handleTouchMove)
      node.removeEventListener('touchend', handleTouchEnd)
      node.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [animating])

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'transform' || !animating) return
    if (exitX > 0) {
      onAccept()
      setExitX(0)
      setDragX(0)
    } else if (exitX < 0) {
      onReject()
      setExitX(0)
      setDragX(0)
    }
    setAnimating(false)
  }

  const displayX = dragX
  const rotation = displayX * 0.05
  const fade = Math.min(0.18, Math.max(0, (Math.abs(displayX) - 60) / 500))
  const acceptOpacity = Math.max(0, Math.min(1, displayX / 60))
  const rejectOpacity = Math.max(0, Math.min(1, -displayX / 60))
  const metaPills = [
    recipe.totalTime ? `⏱ ${recipe.totalTime} min` : null,
    recipe.yield || meal.servings ? `${recipe.yield || meal.servings}` : null,
    ...formatNutrition(recipe.nutrition).slice(0, 2),
  ].filter(Boolean)
  const tagPills = [
    recipe.tags?.cuisine,
    recipe.tags?.mealType,
    ...(recipe.tags?.dietary || []),
    ...(recipe.tags?.cookingMethod || []),
    recipe.tags?.season,
  ].filter(Boolean)

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 overflow-hidden rounded-3xl border border-divider bg-white shadow-lg"
      style={{
        transform: `translateX(${displayX}px) rotate(${rotation}deg)`,
        transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
        touchAction: 'pan-y',
        cursor: dragging ? 'grabbing' : 'grab',
        willChange: 'transform',
        zIndex: 10,
        opacity: 1 - fade,
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        className="pointer-events-none absolute left-5 top-24 z-20 rotate-[-22deg] rounded-xl border-4 border-primary-500 px-3 py-1 text-xl font-black uppercase text-primary-600"
        style={{ opacity: acceptOpacity }}
      >
        Cook this!
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
            className="h-56 w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-warm-100">
            <span className="text-6xl">🍽️</span>
          </div>
        )}

        <div className="space-y-5 p-5 pb-24">
          <div className="space-y-3">
            <h2 className="font-display text-3xl leading-tight text-text-primary">{meal.name}</h2>

            {tagPills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tagPills.map((tag) => (
                  <span key={tag} className="rounded-full border border-divider bg-white px-3 py-1 text-xs font-medium text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {meal.description || meal.reason ? (
              <p className="text-sm leading-7 text-text-secondary">{meal.description || meal.reason}</p>
            ) : null}

            {meal.why_this_meal ? (
              <p className="rounded-2xl bg-primary-50 p-4 text-sm leading-6 text-primary-800">{meal.why_this_meal}</p>
            ) : null}

            {metaPills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metaPills.map((pill) => (
                  <span key={pill} className="rounded-full bg-warm-100 px-3 py-1.5 text-xs font-medium text-text-secondary">
                    {pill}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {recipe.ingredientGroups?.length > 0 ? (
            <section className="space-y-4">
              <h3 className="font-display text-2xl text-text-primary">Ingredients</h3>
              <div className="space-y-5">
                {recipe.ingredientGroups.map((group, groupIndex) => (
                  <div key={`${group.label || 'ingredients'}-${groupIndex}`}>
                    {group.label ? <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div> : null}
                    <ul className="space-y-3">
                      {group.ingredients.map((ingredient, index) => (
                        <li key={`${groupIndex}-${index}-${ingredient.item}`} className="rounded-2xl bg-warm-50 px-4 py-3 text-sm leading-6 text-text-primary">
                          <strong>{[ingredient.amount, ingredient.unit].filter(Boolean).join(' ')}</strong>
                          {(ingredient.amount || ingredient.unit) ? ' ' : ''}
                          {ingredient.item}
                          {ingredient.note ? <span className="text-text-secondary"> ({ingredient.note})</span> : null}
                          {ingredient.optional ? <span className="text-text-muted"> (optional)</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {recipe.instructionGroups?.length > 0 ? (
            <section className="space-y-4">
              <h3 className="font-display text-2xl text-text-primary">Instructions</h3>
              <div className="space-y-6">
                {(() => {
                  let stepCounter = 0
                  return recipe.instructionGroups.map((group, groupIndex) => (
                    <div key={`${group.label || 'instructions'}-${groupIndex}`}>
                      {group.label ? <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div> : null}
                      <ol className="space-y-4">
                        {group.steps.map((step, index) => {
                          stepCounter += 1
                          return (
                            <li key={`${groupIndex}-${index}-${step.text}`} className="flex gap-4 rounded-2xl bg-white">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-100 text-sm font-semibold text-text-primary">{stepCounter}</div>
                              <div className="min-w-0 flex-1 pb-1">
                                <p className="break-words text-[15px] leading-7 text-text-primary [overflow-wrap:anywhere]"><InstructionText text={step.text} contextKey={`swipe-${meal.id || meal.name}-${groupIndex}-${index}`} /></p>
                                {step.tip ? (
                                  <div className="mt-2 rounded-2xl bg-[#f4efe6] px-4 py-3 text-sm leading-6 text-text-secondary">
                                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Tip</div>
                                    {step.tip}
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  ))
                })()}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-divider bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-full border border-divider bg-white px-4 py-3 text-sm font-semibold text-text-secondary transition hover:bg-warm-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-full border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            Cook this
          </button>
        </div>
      </div>
    </div>
  )
}
