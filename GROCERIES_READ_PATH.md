# GROCERIES_READ_PATH.md

## Section 1: The Groceries page component

### 1. Route definition and component import
I found the Groceries route in `src/App.jsx`.

Component import:

```jsx
import { ShopPage } from './pages/ShopPage'
```

Route definition:

```jsx
                <Route
                  path="/groceries"
                  element={
                    <ProtectedRoute>
                      <ShopPage />
                    </ProtectedRoute>
                  }
                />
```

There is also an alias redirect:

```jsx
                <Route path="/shopping-list" element={<Navigate to="/groceries" replace />} />
```

### 2. Full source of the Groceries page component
File: `src/pages/ShopPage.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { shareListAsText } from '../lib/aggregateShoppingList'
import { formatShoppingListEmail } from '../lib/formatShoppingListEmail'
import { EmptyState } from '../components/LoadingStates'
import { UpgradePrompt } from '../components/UpgradePrompt'
import { AdSlot } from '../components/AdSlot'
import { useShoppingList } from '../hooks/useShoppingList'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/shoppingListUtils'

const categoryColors = {
  produce: { border: '#22C55E', bg: 'bg-green-50' },
  dairy: { border: '#3B82F6', bg: 'bg-blue-50' },
  meat: { border: '#F97316', bg: 'bg-orange-50' },
  pantry: { border: '#EAB308', bg: 'bg-yellow-50' },
  frozen: { border: '#06B6D4', bg: 'bg-cyan-50' },
  bakery: { border: '#D97706', bg: 'bg-amber-50' },
  other: { border: '#6B7280', bg: 'bg-gray-50' },
}

/** Render the household shopping list with grouped aisle sections. */
export function ShopPage() {
  useDocumentTitle('Shopping List | Allio')
  const { user } = useAuth()
  const { isPremium, trackUsage } = useSubscription()
  const today = new Date().toISOString().split('T')[0]
  const { shoppingList, loading, saveItems } = useShoppingList(user?.id, today)
  const displayGroups = useMemo(() => {
    return CATEGORY_ORDER.reduce((acc, category) => {
      const items = (shoppingList?.items || [])
        .map((item, index) => ({ ...item, __itemKey: `${item.name}-${item.unit}-${index}` }))
        .filter((item) => (item.category || 'other') === category)
      if (items.length) acc[category] = items
      return acc
    }, {})
  }, [shoppingList])
  const [openCategories, setOpenCategories] = useState({})
  const [emailing, setEmailing] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  useEffect(() => {
    const categoriesWithItems = CATEGORY_ORDER.filter((category) => displayGroups[category]?.length)
    if (!categoriesWithItems.length) {
      setOpenCategories({})
      return
    }

    setOpenCategories((prev) => {
      const next = { ...prev }
      for (const category of categoriesWithItems) {
        if (!(category in next)) next[category] = true
      }
      return next
    })
  }, [displayGroups])

  const progress = useMemo(() => {
    const items = shoppingList?.items || []
    const checked = items.filter((item) => item.checked).length
    return {
      checked,
      total: items.length,
      percent: items.length > 0 ? Math.round((checked / items.length) * 100) : 0,
      label: `${items.length} items (${checked} checked)`
    }
  }, [shoppingList])

  const toggleItem = async (itemKey) => {
    const items = (shoppingList?.items || []).map((item, index) => {
      const key = `${item.name}-${item.unit}-${index}`
      return key === itemKey ? { ...item, checked: !item.checked } : item
    })
    await saveItems(items)
  }

  const clearAllChecks = async () => {
    const items = (shoppingList?.items || []).map((item) => ({ ...item, checked: false }))
    await saveItems(items)
    toast.success('All items unchecked')
  }

  const handleShare = async () => {
    if (!isPremium) {
      setUpgradeFeature('shopping_share')
      return
    }

    const text = shareListAsText(shoppingList?.items || [], today)
    await navigator.clipboard.writeText(text)
    toast.success('Shopping list copied!')
  }

  const handleEmailShop = async () => {
    if (!isPremium) {
      setUpgradeFeature('email_delivery')
      return
    }

    setEmailing(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email) {
        toast.error('Could not find your email')
        return
      }

      const weekLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const itemCount = shoppingList?.items?.length || 0
      const html = formatShoppingListEmail(shoppingList?.items || [], weekLabel, 'My Household')

      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: authUser.email, subject: `Your Allio shopping list — ${itemCount} items`, html }
      })

      if (error?.message?.includes('404') || error?.status === 404) {
        toast.error('Email feature coming soon!')
      } else if (error) {
        throw error
      } else {
        toast.success(`Shopping list sent to ${authUser.email}!`)
        await trackUsage('email_sent')
      }
    } catch (err) {
      console.error('[ShopPage] Email error:', err)
      toast.error("Couldn't send email. Try again.")
    } finally {
      setEmailing(false)
    }
  }

  if (loading) {
    return (
      <div className="px-3 pb-24 md:px-0 pt-2">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-primary-100 rounded"></div>
          <div className="h-4 w-48 bg-primary-100 rounded"></div>
          <div className="card p-4">
            <div className="h-6 w-24 bg-primary-100 rounded mb-3"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-primary-50 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!shoppingList?.items?.length) {
    return (
      <div className="px-3 pb-24 pt-2">
        <EmptyState
          emoji="🛒"
          headline="No shopping list yet"
          body="Generate a meal on Tonight's Meal to create your shopping list."
          ctaLabel="Generate meal"
          ctaLink="/tonight"
        />
      </div>
    )
  }

  return (
    <div className="px-3 pb-24 md:px-0 pt-2">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">Shopping List</h1>
            <p className="text-sm text-text-muted">Week of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <button
            type="button"
            onClick={handleEmailShop}
            disabled={emailing}
            className="text-sm text-primary-500 hover:bg-primary-50 rounded-lg px-3 py-1.5 transition-all duration-150 active:scale-[0.97]"
          >
            {emailing ? 'Sending...' : 'Share'}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-3 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-text-secondary">
              {progress.label}
            </div>
          </div>
          <button
            type="button"
            onClick={clearAllChecks}
            className="rounded-full border border-divider bg-white px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-warm-50"
          >
            Uncheck All
          </button>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary font-medium">{progress.checked} of {progress.total} checked</span>
          <span className="text-text-muted">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      {!isPremium && (
        <div className="mb-3">
          <AdSlot size="banner" position="shop_middle" />
        </div>
      )}

      {CATEGORY_ORDER.filter((category) => displayGroups[category]?.length).map((category) => {
        const items = displayGroups[category]
        const colors = categoryColors[category] || categoryColors.other
        const isOpen = openCategories[category] !== false
        const checkedCount = items.filter((item) => item.checked).length

        return (
          <div key={category} className="mb-3">
            <button
              type="button"
              onClick={() => setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))}
              className="w-full card p-3 flex items-center justify-between hover:shadow-md transition-shadow duration-200"
              style={{ borderLeft: `4px solid ${colors.border}` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-text-primary">{CATEGORY_LABELS[category] || 'Other'}</span>
                <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {items.length}
                </span>
              </div>
              <span className="text-text-muted text-sm font-medium">
                {checkedCount}/{items.length} ✓
              </span>
            </button>

            {isOpen && (
              <div className={`mt-1 rounded-xl ${colors.bg}`}>
                {items.map((item) => {
                    return (
                      <button
                        key={item.__itemKey}
                        type="button"
                        onClick={() => toggleItem(item.__itemKey)}
                        className={`w-full flex items-center gap-3 p-3 text-left border-b border-white/50 last:border-0 transition-all duration-150 ${
                          item.checked ? 'opacity-60' : 'opacity-100'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                          item.checked ? 'bg-green-500 border-green-500 scale-90' : 'border-warm-300'
                        }`}>
                          {item.checked && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-base font-semibold ${item.checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            {item.name}
                          </div>
                          {item.used_in?.length > 0 && (
                            <div className="text-xs text-text-muted capitalize">
                              {item.used_in.map((usage) => usage.replace('_', ' ')).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-warm-500 bg-warm-100 rounded-full px-2 flex-shrink-0">
                          {item.quantity} {item.unit}
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex gap-3 mt-4">
        <button type="button" onClick={handleShare} className="btn-primary flex-1">
          Copy list
        </button>
      </div>

      {!isPremium && (
        <div className="mt-4">
          <AdSlot size="banner" position="shop_bottom" />
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-divider">
        <div className="text-center mb-4">
          <div className="text-sm font-medium text-text-secondary mb-3">Shop these ingredients</div>
          <div className="flex justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">Kroger</div>
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">Instacart</div>
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">Walmart</div>
          </div>
        </div>
        <p className="text-xs text-text-muted text-center">Grocery ordering coming soon</p>
      </div>

      <UpgradePrompt
        feature={upgradeFeature}
        onClose={() => {
          setUpgradeFeature(null)
        }}
      />
    </div>
  )
}
```

### 3. Every Supabase query in that component (and hooks it calls)

#### In `src/pages/ShopPage.jsx`

**File: `src/pages/ShopPage.jsx:95`**
- Table: none, auth API
- Operation: auth read
- Call: `supabase.auth.getUser()`
- Filters/columns: current authenticated user only
- Purpose: get email address for “Share” via email flow

**File: `src/pages/ShopPage.jsx:104`**
- Table: edge function, not a table query
- Operation: function invoke
- Call: `supabase.functions.invoke('send-email', ...)`
- Filters/columns: body contains `to`, `subject`, `html`
- Purpose: email the formatted shopping list

#### In hook `src/hooks/useShoppingList.js` called by `ShopPage`

**File: `src/hooks/useShoppingList.js:24`**
- Table: `shopping_lists`
- Operation: `select`
- Columns/filters: `.select('*').eq('user_id', userId).eq('week_of', weekOf).maybeSingle()`
- Purpose: load the single weekly shopping list row for the active user/date

**File: `src/hooks/useShoppingList.js:50`**
- Table: `shopping_lists`
- Operation: `update`
- Columns/filters: `.update({ items }).eq('id', shoppingList.id).select('*').single()`
- Purpose: save the mutated JSONB `items` array after checking/unchecking items

## Section 2: Confirm shopping_list_items existence

Ran on production:

```sql
select to_regclass('public.shopping_list_items');
```

Raw output / what I tried:
- I first ran a broader query bundle including `shopping_list_items` constraints, and production returned a `42P01 relation does not exist` error for `public.shopping_list_items`.
- I then ran safer existence checks only.

Raw evidence from production:

```text
unexpected status 400: {"message":"Failed to run sql query: ERROR:  42P01: relation \"public.shopping_list_items\" does not exist\nLINE 29: where conrelid = 'public.shopping_list_items'::regclass;\n                          ^\n"}
```

And the follow-up existence check showed no matching table in `information_schema.tables`:

```text
┌───────┐
│ total │
├───────┤
│ 0     │
└───────┘
```

Conclusion: `shopping_list_items` does **not** exist in production.

Because it is null/nonexistent, I did **not** run the extra column/count queries against `shopping_list_items` directly.

## Section 3: Legacy shopping_lists shape and sample

Ran on production:

```sql
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'shopping_lists'
order by ordinal_position;
```

Raw output:

```text
┌──────────────┬──────────────────────────┐
│ column_name  │        data_type         │
├──────────────┼──────────────────────────┤
│ id           │ uuid                     │
│ user_id      │ uuid                     │
│ household_id │ uuid                     │
│ week_of      │ date                     │
│ items        │ jsonb                    │
│ partner_data │ jsonb                    │
│ created_at   │ timestamp with time zone │
│ updated_at   │ timestamp with time zone │
└──────────────┴──────────────────────────┘
```

Ran on production:

```sql
select count(*) from shopping_lists;
```

Raw output:

```text
┌───────┬───────────────────────────────┐
│ total │          latest_row           │
├───────┼───────────────────────────────┤
│ 17    │ 2026-05-01 03:39:42.835254+00 │
└───────┴───────────────────────────────┘
```

Note: the live query I had already run returned `count(*)` together with `max(created_at) as latest_row`, so the raw output includes both.

One sanitized sample row from production (user_id and household_id masked):

```text
┌──────────────────────────────────────┬────────────────┬─────────────────────┬────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│                  id                  │ user_id_masked │ household_id_masked │  week_of   │                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              items_preview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               │          created_at           │          updated_at           │
├──────────────────────────────────────┼────────────────┼─────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 549acc94-f97f-4c3f-be40-7644afc246ed │ ***1860        │ ***06b1             │ 2026-05-01 │ [{"name": "broccoli florets, fresh or frozen", "unit": "cups", "checked": false, "used_in": ["mon_dinner"], "category": "produce", "quantity": 2}, {"name": "butter", "unit": "tbsp", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quantity": 1}, {"name": "milk", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quantity": 1}, {"name": "shredded cheddar cheese", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quantity": 1}, {"name": "shredded mozzarella cheese", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quantity": 0.5}, {"name": "cooked chicken, shredded or diced", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "meat", "quantity": 1}, {"name": "all-purpose flour", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "pantry", "quantity": 0.25}, {"name": "panko breadcrumbs", "unit": "cup", "checked": false, "used_in": ["mo │ 2026-05-01 03:39:42.835254+00 │ 2026-05-01 03:39:42.835254+00 │
└──────────────────────────────────────┴────────────────┴─────────────────────┴────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

Observed `items` JSONB shape today:
- array of objects
- each item looks like:
  - `name`
  - `unit`
  - `checked`
  - `used_in` (array of meal-slot refs like `mon_dinner`)
  - `category`
  - `quantity`

So this is **not** a flat string array. It is an aggregated structured JSON item list stored inside one `shopping_lists.items` column.

## Section 4: Writers to legacy shopping_lists

I ran a recursive grep across `src/` and `supabase/functions/` for `shopping_lists`, then filtered to the writes/mutations.

### 1. `src/hooks/useMealPlan.js:339`
Context:

```text
src/hooks/useMealPlan.js-334-
src/hooks/useMealPlan.js-335-  const clearMealPlan = useCallback(async () => {
src/hooks/useMealPlan.js-336-    if (!user || !scheduleId) throw new Error('Schedule is required before clearing a meal plan.')
src/hooks/useMealPlan.js-337-    const { error: mealPlanError } = await supabase.from('meal_plans').delete().eq('user_id', user.id).eq('schedule_id', scheduleId)
src/hooks/useMealPlan.js-338-    if (mealPlanError) throw mealPlanError
src/hooks/useMealPlan.js:339:    const { error: listError } = await supabase.from('shopping_lists').delete().eq('user_id', user.id).eq('week_of', new Date().toISOString().split('T')[0])
src/hooks/useMealPlan.js-340-    if (listError) console.error('[useMealPlan] Clear shopping list error:', listError)
src/hooks/useMealPlan.js-341-    setMealPlan(null)
src/hooks/useMealPlan.js-342-    return true
src/hooks/useMealPlan.js-343-  }, [scheduleId, user])
```

Plain-English trigger:
- Called when the user clears a meal plan.
- It deletes the legacy weekly `shopping_lists` row for the current user and today’s date.

### 2. `src/hooks/useShoppingList.js:50`
Context:

```text
src/hooks/useShoppingList.js-45-
src/hooks/useShoppingList.js-46-  const saveItems = useCallback(async (items) => {
src/hooks/useShoppingList.js-47-    if (!shoppingList?.id) return null
src/hooks/useShoppingList.js-48-
src/hooks/useShoppingList.js-49-    const { data, error: saveError } = await supabase
src/hooks/useShoppingList.js:50:      .from('shopping_lists')
src/hooks/useShoppingList.js-51-      .update({ items })
src/hooks/useShoppingList.js-52-      .eq('id', shoppingList.id)
src/hooks/useShoppingList.js-53-      .select('*')
src/hooks/useShoppingList.js-54-      .single()
src/hooks/useShoppingList.js-55-
```

Plain-English trigger:
- Called when the Groceries page checks/unchecks items or clears all checks.
- It updates the legacy `items` JSONB column on the existing `shopping_lists` row.

### 3. `src/lib/tonightPersistence.js:20`
Context:

```text
src/lib/tonightPersistence.js-16-  if (loadError) throw loadError
src/lib/tonightPersistence.js-17-
src/lib/tonightPersistence.js-18-  if (existingList?.id) {
src/lib/tonightPersistence.js-19-    const { error } = await supabase
src/lib/tonightPersistence.js:20:      .from('shopping_lists')
src/lib/tonightPersistence.js-21-      .update({ household_id: householdId, items })
src/lib/tonightPersistence.js-22-      .eq('id', existingList.id)
src/lib/tonightPersistence.js-23-
src/lib/tonightPersistence.js-24-    if (error) throw error
src/lib/tonightPersistence.js-25-    return existingList.id
```

Plain-English trigger:
- Called when Tonight meal persistence upserts a shopping list for a date and a row already exists.
- It updates `household_id` and replaces the `items` JSONB payload for that weekly row.

### 4. `src/lib/tonightPersistence.js:29`
Context:

```text
src/lib/tonightPersistence.js-27-
src/lib/tonightPersistence.js-28-  const { data, error } = await supabase
src/lib/tonightPersistence.js:29:    .from('shopping_lists')
src/lib/tonightPersistence.js-30-    .insert({
src/lib/tonightPersistence.js-31-      user_id: userId,
src/lib/tonightPersistence.js-32-      household_id: householdId,
src/lib/tonightPersistence.js-33-      week_of: weekOf,
src/lib/tonightPersistence.js-34-      items,
```

Plain-English trigger:
- Called when Tonight meal persistence needs to create the first weekly shopping list row for that user/date.
- It inserts a new legacy `shopping_lists` row with `user_id`, `household_id`, `week_of`, and `items`.

### 5. `src/pages/TonightPage.jsx:443` is a read-before-write precursor
Context:

```text
src/pages/TonightPage.jsx-438-    const household = await getHousehold(user.id)
src/pages/TonightPage.jsx-439-    const today = new Date().toISOString().split('T')[0]
src/pages/TonightPage.jsx-440-    const nextItems = buildShoppingItemsFromMeal(targetMeal, staplesOnHand || household?.staples_on_hand || '')
src/pages/TonightPage.jsx-441-
src/pages/TonightPage.jsx-442-    const { data: existingList, error: loadError } = await supabase
src/pages/TonightPage.jsx:443:      .from('shopping_lists')
src/pages/TonightPage.jsx-444-      .select('id, items')
src/pages/TonightPage.jsx-445-      .eq('user_id', user.id)
src/pages/TonightPage.jsx-446-      .eq('week_of', today)
src/pages/TonightPage.jsx-447-      .maybeSingle()
```

Plain-English trigger:
- This runs when Tonight generates or merges ingredients into the shopping list.
- It does not write directly here, but it is part of the path that loads the current weekly JSONB list before merging and handing off to `upsertShoppingListForDate`, which performs the actual update/insert.

### 6. `supabase/functions/`
I did not find any direct writers to `shopping_lists` in `supabase/functions/` from the grep I ran.

## Section 5: Your one-line summary

Today the Groceries page renders the single weekly `shopping_lists` row for the current user/date, and that data exists because meal generation/persistence flows, especially Tonight’s meal flow, create or update the legacy JSONB `items` array in `shopping_lists`.
