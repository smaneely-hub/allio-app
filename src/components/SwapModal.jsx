import { useState, useCallback } from 'react'

export function SwapModal({ isOpen, onClose, onSwap, mealName, loading = false }) {
  const [suggestion, setSuggestion] = useState('')
  
  if (!isOpen) return null
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    await onSwap(suggestion)
    setSuggestion('')
  }
  
  const quickOptions = [
    'Something vegetarian',
    'Quick and easy',
    'Something with chicken',
    'Something Mexican',
    'Something Italian',
    'Lighter meal',
  ]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          ✕
        </button>
        
        <h3 className="font-display text-xl text-text-primary mb-2">
          Swap Meal
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Replace "{mealName}" with something else
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="What would you like instead?"
            className="input w-full mb-4"
            autoFocus
          />
          
          {/* Quick options */}
          <div className="mb-4">
            <p className="text-xs text-text-muted mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSuggestion(option)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? 'Swapping...' : 'Swap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Hook to manage swap modal state
export function useSwapModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingMeal, setPendingMeal] = useState(null)
  
  const openSwap = useCallback((meal) => {
    setPendingMeal(meal)
    setIsOpen(true)
  }, [])
  
  const closeSwap = useCallback(() => {
    setIsOpen(false)
    setPendingMeal(null)
  }, [])
  
  return {
    isOpen,
    pendingMeal,
    openSwap,
    closeSwap,
  }
}