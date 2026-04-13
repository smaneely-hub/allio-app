import { RecipeDetail } from '../RecipeDetail'

export function MealDetailModal({ meal, isOpen, onClose }) {
  if (!isOpen || !meal) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="absolute inset-0 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <RecipeDetail meal={meal} onClose={onClose} />
      </div>
    </div>
  )
}
