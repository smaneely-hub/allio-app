import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { ensureDefaultShoppingList, getShoppingListItems } from '../lib/shoppingLists'
import { listUserRecipes } from '../hooks/useRecipeMutations'

function formatMemberRole(member) {
  if (member?.role) return member.role.charAt(0).toUpperCase() + member.role.slice(1)
  if (member?.age == null || member?.age === '') return 'Age not set'
  return `${member.age} years old`
}

function formatDayLabel(slot) {
  const day = String(slot?.day || '').slice(0, 3).toLowerCase()
  const meal = String(slot?.meal || '').replace(/_/g, ' ')
  const dayMap = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  }
  return `${dayMap[day] || 'Day'} • ${meal ? meal.charAt(0).toUpperCase() + meal.slice(1) : 'Meal'}`
}

function StatCard({ to, emoji, title, subtitle }) {
  return (
    <Link to={to} className="card h-full p-4 transition-shadow hover:shadow-md">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-3 text-sm font-medium text-text-primary">{title}</div>
      <div className="mt-1 text-xs text-text-muted">{subtitle}</div>
    </Link>
  )
}

export function DashboardPage() {
  useDocumentTitle('Home | Allio')

  const { user, loading: authLoading } = useAuth()
  const { household, members, loading: householdLoading } = useHousehold()
  const { schedule, slots, loading: scheduleLoading } = useSchedule()
  const [shoppingItems, setShoppingItems] = useState([])
  const [recipes, setRecipes] = useState([])

  useEffect(() => {
    let mounted = true

    async function loadShoppingList() {
      if (!user?.id) {
        if (mounted) setShoppingItems([])
        return
      }

      try {
        const defaultList = await ensureDefaultShoppingList(user.id)
        const data = await getShoppingListItems(defaultList?.id)
        if (mounted) setShoppingItems(data || [])
      } catch (error) {
        console.error('[DashboardPage] loadShoppingList error:', error)
        if (mounted) setShoppingItems([])
      }
    }

    loadShoppingList()
    return () => { mounted = false }
  }, [user?.id])

  useEffect(() => {
    let mounted = true

    async function loadRecipes() {
      if (!user?.id) {
        if (mounted) setRecipes([])
        return
      }

      try {
        const data = await listUserRecipes({ userId: user.id, sortBy: 'newest' })
        if (mounted) setRecipes(data || [])
      } catch (error) {
        console.error('[DashboardPage] loadRecipes error:', error)
        if (mounted) setRecipes([])
      }
    }

    loadRecipes()
    return () => { mounted = false }
  }, [user?.id])

  const loading = authLoading || householdLoading || scheduleLoading

  const checkedItems = shoppingItems.filter((item) => item.checked).length
  const totalItems = shoppingItems.length
  const favoriteRecipes = recipes.filter((recipe) => recipe.is_favorite).length
  const ratedRecipes = recipes.filter((recipe) => Number(recipe.rating) >= 4).length
  const activeSlots = useMemo(() => slots.filter((slot) => !slot.is_leftover), [slots])
  const nextPlannedMeals = activeSlots.slice(0, 3)
  const householdName = household?.name || household?.household_name || 'your household'

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4 py-6">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl text-text-primary md:text-4xl">
                Welcome back{householdName ? `, ${householdName}` : ''}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary md:text-base">
                This is your home base for tonight, the week ahead, your family details, and the recipe library.
              </p>
            </div>
            <div className="rounded-2xl border border-divider bg-white px-4 py-3 text-sm text-text-secondary shadow-sm">
              <div className="font-medium text-text-primary">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="mt-1">{members.length || household?.total_people || 0} people in your household</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard to="/tonight" emoji="🍲" title="Tonight" subtitle="Pick or refine dinner" />
          <StatCard to="/planner" emoji="🗓️" title="Planner" subtitle={schedule ? `${slots.length} slots this week` : 'Set up your week'} />
          <StatCard to="/recipes" emoji="📚" title="Recipes" subtitle={recipes.length ? `${recipes.length} saved recipes` : 'Build your catalog'} />
          <StatCard to="/groceries" emoji="🛒" title="Groceries" subtitle={totalItems ? `${checkedItems}/${totalItems} items checked` : 'No list yet'} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text-primary">Today at a glance</h2>
                <p className="mt-1 text-sm text-text-secondary">The fastest path back into planning.</p>
              </div>
              <Link to="/planner" className="text-sm font-medium text-primary-600">Open planner</Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-divider bg-surface p-4">
                <div className="text-xs uppercase tracking-wide text-text-muted">Tonight</div>
                <div className="mt-2 text-sm font-medium text-text-primary">{totalItems ? 'Shopping list is active' : 'No dinner list yet'}</div>
                <div className="mt-1 text-xs text-text-muted">Jump into Tonight’s Meal to generate or refine.</div>
              </div>
              <div className="rounded-2xl border border-divider bg-surface p-4">
                <div className="text-xs uppercase tracking-wide text-text-muted">Meal plan</div>
                <div className="mt-2 text-sm font-medium text-text-primary">{schedule ? `${slots.length} slots mapped` : 'Week not planned'}</div>
                <div className="mt-1 text-xs text-text-muted">{schedule ? 'You have a live schedule to work from.' : 'Set up your weekly rhythm.'}</div>
              </div>
              <div className="rounded-2xl border border-divider bg-surface p-4">
                <div className="text-xs uppercase tracking-wide text-text-muted">Recipe catalog</div>
                <div className="mt-2 text-sm font-medium text-text-primary">{recipes.length ? `${recipes.length} recipes saved` : 'Catalog is still empty'}</div>
                <div className="mt-1 text-xs text-text-muted">{favoriteRecipes} favorites, {ratedRecipes} rated 4★+</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {nextPlannedMeals.length > 0 ? nextPlannedMeals.map((slot) => (
                <div key={slot.id} className="rounded-2xl bg-primary-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-primary-600">{formatDayLabel(slot)}</div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">{slot.planning_notes || 'Meal slot ready for planning'}</div>
                  <div className="mt-1 text-xs text-text-secondary">Effort: {slot.effort_level || 'medium'}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-divider p-4 text-sm text-text-muted sm:col-span-3">
                  No planned meals yet. Build the week in Planner and your next meals will show up here.
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text-primary">Settings snapshot</h2>
                <p className="mt-1 text-sm text-text-secondary">Household profile and configuration at a glance.</p>
              </div>
              <Link to="/settings" className="text-sm font-medium text-primary-600">Manage</Link>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3">
                <span className="text-text-secondary">Household name</span>
                <span className="font-medium text-text-primary">{householdName}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3">
                <span className="text-text-secondary">Planning scope</span>
                <span className="font-medium capitalize text-text-primary">{household?.planning_scope || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3">
                <span className="text-text-secondary">Diet focus</span>
                <span className="font-medium capitalize text-text-primary">{household?.diet_focus || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3">
                <span className="text-text-secondary">Cooking comfort</span>
                <span className="font-medium capitalize text-text-primary">{household?.cooking_comfort || 'Not set'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr_1fr]">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text-primary">Family demographics</h2>
                <p className="mt-1 text-sm text-text-secondary">A quick read on who you’re planning for.</p>
              </div>
              <Link to="/household" className="text-sm font-medium text-primary-600">Edit family</Link>
            </div>

            <div className="mt-4 space-y-3">
              {members.length > 0 ? members.slice(0, 6).map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-2xl border border-divider bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{member.name || member.label || 'Household member'}</div>
                    <div className="mt-1 text-xs text-text-muted">{formatMemberRole(member)}</div>
                  </div>
                  {member.age != null && member.age !== '' ? (
                    <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">Age {member.age}</div>
                  ) : null}
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-divider p-4 text-sm text-text-muted">
                  Add household members to make servings, demographics, and planning smarter.
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text-primary">Recipe catalog</h2>
                <p className="mt-1 text-sm text-text-secondary">Your library, favorites, and recent additions.</p>
              </div>
              <Link to="/recipes" className="text-sm font-medium text-primary-600">Open catalog</Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-surface p-4">
                <div className="text-2xl font-display text-text-primary">{recipes.length}</div>
                <div className="mt-1 text-xs text-text-muted">Saved</div>
              </div>
              <div className="rounded-2xl bg-surface p-4">
                <div className="text-2xl font-display text-text-primary">{favoriteRecipes}</div>
                <div className="mt-1 text-xs text-text-muted">Favorites</div>
              </div>
              <div className="rounded-2xl bg-surface p-4">
                <div className="text-2xl font-display text-text-primary">{ratedRecipes}</div>
                <div className="mt-1 text-xs text-text-muted">Top rated</div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recipes.slice(0, 3).map((recipe) => (
                <Link key={recipe.id} to={`/recipes/${recipe.slug || recipe.id}`} className="block rounded-2xl border border-divider bg-white px-4 py-3 transition-colors hover:bg-primary-50">
                  <div className="text-sm font-medium text-text-primary">{recipe.title}</div>
                  <div className="mt-1 text-xs text-text-muted">
                    {recipe.cuisine || 'Cuisine not set'} • {recipe.total_time_minutes || recipe.prep_time_minutes || '—'} min
                  </div>
                </Link>
              ))}
              {recipes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-divider p-4 text-sm text-text-muted">
                  Start your homepage with a stronger catalog by importing a few favorite meals.
                </div>
              ) : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text-primary">Quick actions</h2>
                <p className="mt-1 text-sm text-text-secondary">The high-traffic paths, all from home.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { to: '/tonight', label: "Generate tonight's meal", detail: 'Fast dinner planning' },
                { to: '/planner', label: 'Build weekly meal plan', detail: 'Organize the week' },
                { to: '/groceries', label: 'Review shopping list', detail: 'Check what is left' },
                { to: '/settings', label: 'Update settings', detail: 'Profile, reminders, defaults' },
                { to: '/household', label: 'Edit family demographics', detail: 'People, ages, restrictions' },
              ].map((action) => (
                <Link key={action.to} to={action.to} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 transition-colors hover:bg-primary-50">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{action.label}</div>
                    <div className="mt-1 text-xs text-text-muted">{action.detail}</div>
                  </div>
                  <span className="text-text-muted">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
