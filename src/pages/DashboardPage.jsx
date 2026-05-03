import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { supabase } from '../lib/supabase'

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { household, members, loading: householdLoading } = useHousehold()
  const { schedule } = useSchedule()
  const [shoppingItems, setShoppingItems] = useState([])

  useEffect(() => {
    async function loadShoppingList() {
      if (!user) return

      const { data: defaultList } = await supabase
        .from('shopping_lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle()

      if (!defaultList?.id) {
        setShoppingItems([])
        return
      }

      const { data } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', defaultList.id)
        .order('created_at', { ascending: true })

      setShoppingItems(data || [])
    }
    loadShoppingList()
  }, [user])

  if (authLoading || householdLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  const checkedItems = shoppingItems.filter(i => i.checked).length || 0
  const totalItems = shoppingItems.length || 0

  return (
    <div className="px-3 pb-24 md:px-0 pt-2 space-y-4">
      {/* Welcome header */}
      <div>
        <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
        <h1 className="font-display text-2xl md:text-3xl text-text-primary">
          Welcome back{household?.household_name ? `, ${household.household_name}` : ''}!
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here's what's happening with your household today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/tonight" className="card hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🍲</div>
          <div className="text-sm font-medium text-text-primary">Tonight</div>
          <div className="text-xs text-text-muted">
            Quick meal
          </div>
        </Link>
        <Link to="/planner" className="card hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🍽️</div>
          <div className="text-sm font-medium text-text-primary">Meal Plan</div>
          <div className="text-xs text-text-muted">
            {schedule ? 'This week planned' : 'Set up your week'}
          </div>
        </Link>
        <Link to="/groceries" className="card hover:shadow-md transition-shadow">
          <div className="text-2xl mb-1">🛒</div>
          <div className="text-sm font-medium text-text-primary">Shopping</div>
          <div className="text-xs text-text-muted">
            {totalItems > 0 ? `${checkedItems}/${totalItems} items` : 'No list yet'}
          </div>
        </Link>
      </div>

      {/* Today's Summary */}
      <div className="card">
        <h2 className="font-display text-lg text-text-primary mb-3">Today</h2>
        
        <div className="text-center py-6 text-text-muted">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="border-t border-divider pt-4 mt-4">
          <p className="text-sm text-text-secondary">
            {members.length} household member{members.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {members.slice(0, 4).map(m => (
              <span key={m.id} className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-full">
                {m.name || m.label}
              </span>
            ))}
            {members.length > 4 && (
              <span className="text-xs text-text-muted">+{members.length - 4} more</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="font-display text-lg text-text-primary mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <Link 
            to="/tonight" 
            className="flex items-center justify-between p-3 rounded-xl bg-bg-primary hover:bg-primary-50 transition-colors min-h-[48px]"
          >
            <span className="text-sm text-text-primary">Tonight's Meal</span>
            <span className="text-text-muted">→</span>
          </Link>
          <Link 
            to="/planner" 
            className="flex items-center justify-between p-3 rounded-xl bg-bg-primary hover:bg-primary-50 transition-colors min-h-[48px]"
          >
            <span className="text-sm text-text-primary">Weekly Meal Plan</span>
            <span className="text-text-muted">→</span>
          </Link>
          <Link 
            to="/groceries" 
            className="flex items-center justify-between p-3 rounded-xl bg-bg-primary hover:bg-primary-50 transition-colors min-h-[48px]"
          >
            <span className="text-sm text-text-primary">Shopping List</span>
            <span className="text-text-muted">→</span>
          </Link>
          <Link 
            to="/settings" 
            className="flex items-center justify-between p-3 rounded-xl bg-bg-primary hover:bg-primary-50 transition-colors min-h-[48px]"
          >
            <span className="text-sm text-text-primary">Family & Demographics</span>
            <span className="text-text-muted">→</span>
          </Link>
        </div>
      </div>

      {/* Progress This Week */}
      {schedule && (
        <div className="card">
          <h2 className="font-display text-lg text-text-primary mb-3">This Week</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-400 rounded-full"
                  style={{ width: '50%' }}
                />
              </div>
            </div>
            <span className="text-sm text-text-muted">On track</span>
          </div>
        </div>
      )}
    </div>
  )
}