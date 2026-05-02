# RECONCILIATION_REPORT_shopping_lists.md

## Section 1: Production schema (Supabase, project `rvgtmletsbycrbeycwus`)

I connected to production via `npx supabase db query --linked` with the linked project and ran read-only SQL only.

### 1. Does shopping_lists exist?
Raw output:

```text
┌────────────────┐
│  to_regclass   │
├────────────────┤
│ shopping_lists │
└────────────────┘
```

### 2. Full column definition
Raw output:

```text
┌──────────────┬──────────────────────────┬─────────────┬────────────────────┐
│ column_name  │        data_type         │ is_nullable │   column_default   │
├──────────────┼──────────────────────────┼─────────────┼────────────────────┤
│ id           │ uuid                     │ NO          │ uuid_generate_v4() │
│ user_id      │ uuid                     │ NO          │ NULL               │
│ household_id │ uuid                     │ YES         │ NULL               │
│ week_of      │ date                     │ NO          │ NULL               │
│ items        │ jsonb                    │ NO          │ '[]'::jsonb        │
│ partner_data │ jsonb                    │ NO          │ '{}'::jsonb        │
│ created_at   │ timestamp with time zone │ NO          │ now()              │
│ updated_at   │ timestamp with time zone │ NO          │ now()              │
└──────────────┴──────────────────────────┴─────────────┴────────────────────┘
```

### 3. Constraints, indexes, FKs
Raw output:

```text
┌────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
│              conname               │                          pg_get_constraintdef                           │
├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ shopping_lists_household_id_fkey   │ FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL │
│ shopping_lists_pkey                │ PRIMARY KEY (id)                                                        │
│ shopping_lists_user_id_fkey        │ FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE       │
│ shopping_lists_user_id_week_of_key │ UNIQUE (user_id, week_of)                                               │
│ unique_user_week                   │ UNIQUE (user_id, week_of)                                               │
└────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│             indexname              │                                                    indexdef                                                    │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ shopping_lists_pkey                │ CREATE UNIQUE INDEX shopping_lists_pkey ON public.shopping_lists USING btree (id)                              │
│ shopping_lists_user_id_week_of_key │ CREATE UNIQUE INDEX shopping_lists_user_id_week_of_key ON public.shopping_lists USING btree (user_id, week_of) │
│ idx_shopping_lists_user_week       │ CREATE INDEX idx_shopping_lists_user_week ON public.shopping_lists USING btree (user_id, week_of)              │
│ unique_user_week                   │ CREATE UNIQUE INDEX unique_user_week ON public.shopping_lists USING btree (user_id, week_of)                   │
└────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4. RLS policies on shopping_lists
Raw output:

```text
┌─────────────────────────────────────┬────────┬────────────────────────┬────────────────────────┐
│               polname               │ polcmd │       using_expr       │       check_expr       │
├─────────────────────────────────────┼────────┼────────────────────────┼────────────────────────┤
│ Users can view own shopping lists   │ r      │ (auth.uid() = user_id) │ NULL                   │
│ Users can insert own shopping lists │ a      │ NULL                   │ (auth.uid() = user_id) │
│ Users can update own shopping lists │ w      │ (auth.uid() = user_id) │ NULL                   │
│ Users can delete own shopping lists │ d      │ (auth.uid() = user_id) │ NULL                   │
└─────────────────────────────────────┴────────┴────────────────────────┴────────────────────────┘
```

### 5. Does shopping_list_items exist?
Raw output:

```text
select to_regclass('public.shopping_list_items');
```

The first combined attempt failed when I queried constraints against a nonexistent relation. Error returned verbatim:

```text
unexpected status 400: {"message":"Failed to run sql query: ERROR:  42P01: relation \"public.shopping_list_items\" does not exist\nLINE 29: where conrelid = 'public.shopping_list_items'::regclass;\n                          ^\n"}
```

I then retried with a safer existence check and information_schema query only. Raw output confirming nonexistence:

```text
┌───────┐
│ total │
├───────┤
│ 0     │
└───────┘
```

Interpretation: `public.shopping_list_items` does **not** exist in production.

### 6. Row counts and freshness
Raw output for `shopping_lists`:

```text
┌───────┬───────────────────────────────┐
│ total │          latest_row           │
├───────┼───────────────────────────────┤
│ 17    │ 2026-05-01 03:39:42.835254+00 │
└───────┴───────────────────────────────┘
```

For `shopping_list_items`, no table exists, so count/freshness query is unobtainable without error. I tried a combined query first, hit the `42P01` relation-not-exist error above, then switched to existence checks only.

### 7. One sanitized sample row from shopping_lists
Raw output:

```text
┌──────────────────────────────────────┬────────────────┬─────────────────────┬────────────┬────────────┬─────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────┬──────────────────────┬───────────────────────────────┬───────────────────────────────┐
│                  id                  │ user_id_masked │ household_id_masked │  week_of   │ items_type │ items_count │                                                                                                                                                                                                                                                    items_preview                                                                                                                                                                                                                                                     │ partner_data_type │ partner_data_preview │          created_at           │          updated_at           │
├──────────────────────────────────────┼────────────────┼─────────────────────┼────────────┼────────────┼─────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┼──────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 549acc94-f97f-4c3f-be40-7644afc246ed │ ***1860        │ ***06b1             │ 2026-05-01 │ array      │ 8           │ [{"name": "broccoli florets, fresh or frozen", "unit": "cups", "checked": false, "used_in": ["mon_dinner"], "category": "produce", "quantity": 2}, {"name": "butter", "unit": "tbsp", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quantity": 1}, {"name": "milk", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quantity": 1}, {"name": "shredded cheddar cheese", "unit": "cup", "checked": false, "used_in": ["mon_dinner"], "category": "dairy", "quan │ object            │ {}                   │ 2026-05-01 03:39:42.835254+00 │ 2026-05-01 03:39:42.835254+00 │
└──────────────────────────────────────┴────────────────┴─────────────────────┴────────────┴────────────┴─────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────┴──────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

Observed shape:
- `items` is a JSONB array of aggregated shopping items, with fields like `name`, `unit`, `checked`, `used_in`, `category`, `quantity`
- `partner_data` is currently a JSONB object and the sample row was `{}`

-----

## Section 2: Migration history vs. live state

### Files inspected by name search
I ran:

```bash
ls -1 supabase/migrations | sort | grep -Ei 'shopping|grocery|list'
```

Raw output:

```text
202604020001_shopping_lists_fix.sql
20260402171000_shopping_fix.sql
```

I also manually inspected the repo-wide shopping-related migration references with grep and found additional relevant files not returned by filename alone:
- `202603290001_premium_system.sql`
- `20260402170000_recipes_fix.sql`
- `20260402172000_force_fix.sql`

### 202604020001_shopping_lists_fix.sql
DDL summary (create/alter statements only):

```text
CREATE TABLE IF NOT EXISTS shopping_lists (
ALTER TABLE shopping_lists ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_of);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own shopping lists" ON shopping_lists;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists
DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists
DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_lists;
CREATE POLICY "Users can update own shopping lists" ON shopping_lists
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists
```

Applied in production: **YES / PARTIAL**

Evidence:
- Live table exists with weekly shape: `user_id`, `household_id`, `week_of`, `items`, `partner_data`
- Live RLS policies match the user-owned CRUD pattern
- Live index `idx_shopping_lists_user_week` exists
- Live unique constraint/index on `(user_id, week_of)` exists
- But production has duplicate uniqueness artifacts (`shopping_lists_user_id_week_of_key` and `unique_user_week`), which suggests multiple migrations stacked on top of each other, not a clean one-time create

### 20260402170000_recipes_fix.sql
DDL summary (shopping-related statements only):

```text
CREATE TABLE IF NOT EXISTS shopping_lists (
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own shopping lists" ON shopping_lists;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_lists;
CREATE POLICY "Users can update own shopping lists" ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);
```

Applied in production: **PARTIAL**

Evidence:
- The CRUD policies and `idx_shopping_lists_user_week` are live
- The table shape exists
- But I cannot attribute table creation specifically to this file because earlier/later migrations also define `shopping_lists`
- Live schema carries duplicate unique constraints that this file alone does not explain

### 20260402171000_shopping_fix.sql
DDL summary:

```text
ALTER TABLE shopping_lists ADD COLUMN week_of DATE;
ALTER TABLE shopping_lists ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE shopping_lists ADD COLUMN partner_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE shopping_lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE shopping_lists ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE shopping_lists ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_of);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own shopping lists" ON shopping_lists;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_lists;
CREATE POLICY "Users can update own shopping lists" ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists FOR DELETE USING (auth.uid() = user_id);
```

Applied in production: **YES / PARTIAL**

Evidence:
- Every listed column is present in production
- Household FK is present in production
- `partner_data` and `items` defaults match production
- The unique constraint/index pattern is present, but with duplicate artifacts, indicating repeated application/evolution rather than one clean final state

### 20260402172000_force_fix.sql
DDL summary (shopping-related statements only):

```text
DROP TABLE IF EXISTS shopping_lists CASCADE;
CREATE TABLE shopping_lists (
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists
CREATE POLICY "Users can update own shopping lists" ON shopping_lists
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists
CREATE INDEX idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);
```

Applied in production: **PARTIAL / UNCERTAIN**

Evidence:
- The resulting table shape is compatible with the live schema
- The policies/index named here are live
- But if this full file had executed as written after user data existed, it would have dropped and recreated the table. I cannot prove from read-only inspection whether that drop/recreate actually happened historically or whether this file was committed but never applied.
- Current production has 17 rows, so there is definitely live data now.

### 202603290001_premium_system.sql
DDL summary (shopping-related statement only):

```text
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS partner_data JSONB DEFAULT '{}';
```

Applied in production: **YES**

Evidence:
- `partner_data` exists in production as `jsonb not null default '{}'::jsonb`

### Other relevant migration files found by content search
I found shopping-related references in:
- `202604080003_security_fix.sql` — comments saying shopping_lists policies already exist and should be verified; no new shopping_lists DDL summary beyond verification comments

Applied in production: **N/A / observational**

-----

## Section 3: Codebase usage

I ran:

```bash
grep -RIn -C 2 "shopping_lists\|shopping_list_items\|from('shopping_lists'\|from(\"shopping_lists\"\|from('shopping_list_items'\|from(\"shopping_list_items\"" src supabase/functions
```

Grouped by file below.

### `src/hooks/useMealPlan.js`

**Line 339**
```text
src/hooks/useMealPlan.js-337-    const { error: mealPlanError } = await supabase.from('meal_plans').delete().eq('user_id', user.id).eq('schedule_id', scheduleId)
src/hooks/useMealPlan.js-338-    if (mealPlanError) throw mealPlanError
src/hooks/useMealPlan.js:339:    const { error: listError } = await supabase.from('shopping_lists').delete().eq('user_id', user.id).eq('week_of', new Date().toISOString().split('T')[0])
src/hooks/useMealPlan.js-340-    if (listError) console.error('[useMealPlan] Clear shopping list error:', listError)
src/hooks/useMealPlan.js-341-    setMealPlan(null)
```
What it is doing: **delete** current user's shopping list row for today’s `week_of` when clearing a meal plan.

### `src/hooks/useShoppingList.js`

**Line 24**
```text
src/hooks/useShoppingList.js-22-    try {
src/hooks/useShoppingList.js-23-      const { data, error: loadError } = await supabase
src/hooks/useShoppingList.js:24:        .from('shopping_lists')
src/hooks/useShoppingList.js-25-        .select('*')
src/hooks/useShoppingList.js-26-        .eq('user_id', userId)
```
What it is doing: **read** weekly shopping list row by `user_id` and `week_of`.

**Line 50**
```text
src/hooks/useShoppingList.js-48-
src/hooks/useShoppingList.js-49-    const { data, error: saveError } = await supabase
src/hooks/useShoppingList.js:50:      .from('shopping_lists')
src/hooks/useShoppingList.js-51-      .update({ items })
src/hooks/useShoppingList.js-52-      .eq('id', shoppingList.id)
```
What it is doing: **update** the JSONB `items` column on an existing shopping list row.

### `src/pages/TonightPage.jsx`

**Line 443**
```text
src/pages/TonightPage.jsx-441-
src/pages/TonightPage.jsx-442-    const { data: existingList, error: loadError } = await supabase
src/pages/TonightPage.jsx:443:      .from('shopping_lists')
src/pages/TonightPage.jsx-444-      .select('id, items')
src/pages/TonightPage.jsx-445-      .eq('user_id', user.id)
```
What it is doing: **read** the current user’s list row for today, then merge in meal ingredients in-memory.

### `src/pages/DashboardPage.jsx`

**Line 19**
```text
src/pages/DashboardPage.jsx-17-      if (!user) return
src/pages/DashboardPage.jsx-18-      const { data } = await supabase
src/pages/DashboardPage.jsx:19:        .from('shopping_lists')
src/pages/DashboardPage.jsx-20-        .select('*')
src/pages/DashboardPage.jsx-21-        .eq('user_id', user.id)
```
What it is doing: **read** shopping lists for dashboard display.

### `src/lib/tonightPersistence.js`

**Line 10**
```text
src/lib/tonightPersistence.js-8-export async function upsertShoppingListForDate({ userId, householdId, weekOf, items }) {
src/lib/tonightPersistence.js-9-  const { data: existingList, error: loadError } = await supabase
src/lib/tonightPersistence.js:10:    .from('shopping_lists')
src/lib/tonightPersistence.js-11-    .select('id')
src/lib/tonightPersistence.js-12-    .eq('user_id', userId)
```
What it is doing: **read** whether a weekly shopping list row already exists for the user/date.

**Line 20**
```text
src/lib/tonightPersistence.js-18-  if (existingList?.id) {
src/lib/tonightPersistence.js-19-    const { error } = await supabase
src/lib/tonightPersistence.js:20:      .from('shopping_lists')
src/lib/tonightPersistence.js-21-      .update({ household_id: householdId, items })
src/lib/tonightPersistence.js-22-      .eq('id', existingList.id)
```
What it is doing: **update** an existing weekly shopping list row’s `household_id` and `items`.

**Line 29**
```text
src/lib/tonightPersistence.js-27-
src/lib/tonightPersistence.js-28-  const { data, error } = await supabase
src/lib/tonightPersistence.js:29:    .from('shopping_lists')
src/lib/tonightPersistence.js-30-    .insert({
src/lib/tonightPersistence.js-31-      user_id: userId,
```
What it is doing: **insert** a new weekly shopping list row with `user_id`, `household_id`, `week_of`, and `items`.

### `supabase/functions/`
No matches for `shopping_lists` or `shopping_list_items` were returned in `supabase/functions/` by the grep I ran.

### `shopping_list_items` references summary
Repo grep across `src/` and `supabase/functions/` found **no live app references** to `shopping_list_items` table calls. The only shopping-list persistence calls in app code are against `shopping_lists`.

-----

## Section 4: The “add ingredients to shopping list” path

### Traced path
From the currently inspected code, the active “add ingredients to shopping list” flow is **not** a `shopping_list_items` insert path.

Relevant write path found:
1. `TonightPage.jsx` calls `mergeMealIntoShoppingList(targetMeal, successMessage)`
2. That function builds merged item objects in memory
3. It then calls `upsertShoppingListForDate({ userId, householdId, weekOf, items })`
4. `upsertShoppingListForDate` writes to `shopping_lists`

I did **not** find a current planner path writing to `shopping_list_items`, because that table does not exist in production and the active persistence utility is JSONB-based.

### What function is called?
`upsertShoppingListForDate`

### What table does it write to?
`shopping_lists`

### What columns does it write?
- On update: `household_id`, `items`
- On insert: `user_id`, `household_id`, `week_of`, `items`

### Is it writing to legacy shopping_lists.items JSONB or a separate shopping_list_items table?
It is writing to the **legacy `shopping_lists.items` JSONB column**.

### Relevant function source
```js
export async function upsertShoppingListForDate({ userId, householdId, weekOf, items }) {
  const { data: existingList, error: loadError } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('week_of', weekOf)
    .maybeSingle()

  if (loadError) throw loadError

  if (existingList?.id) {
    const { error } = await supabase
      .from('shopping_lists')
      .update({ household_id: householdId, items })
      .eq('id', existingList.id)

    if (error) throw error
    return existingList.id
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      user_id: userId,
      household_id: householdId,
      week_of: weekOf,
      items,
    })
    .select('id')
    .single()

  if (error) throw error
  return data?.id || null
}
```

And the caller that merges items first:

```js
async function mergeMealIntoShoppingList(targetMeal, successMessage = 'Added to shopping list ✓') {
  if (!user?.id || !targetMeal) return null

  const household = await getHousehold(user.id)
  const today = new Date().toISOString().split('T')[0]
  const nextItems = buildShoppingItemsFromMeal(targetMeal, staplesOnHand || household?.staples_on_hand || '')

  const { data: existingList, error: loadError } = await supabase
    .from('shopping_lists')
    .select('id, items')
    .eq('user_id', user.id)
    .eq('week_of', today)
    .maybeSingle()

  if (loadError) throw loadError

  const merged = new Map()
  for (const item of Array.isArray(existingList?.items) ? existingList.items : []) {
    const key = `${String(item?.name || '').trim().toLowerCase()}::${String(item?.unit || '').trim().toLowerCase()}`
    if (!key) continue
    merged.set(key, {
      ...item,
      quantity: Number(item?.quantity || 0),
      used_in: Array.isArray(item?.used_in) ? [...item.used_in] : [],
    })
  }

  for (const item of nextItems) {
    const key = `${String(item?.name || '').trim().toLowerCase()}::${String(item?.unit || '').trim().toLowerCase()}`
    if (!key) continue
    const existing = merged.get(key)
    if (existing) {
      const existingUsedIn = new Set(Array.isArray(existing.used_in) ? existing.used_in : [])
      const nextUsedIn = Array.isArray(item.used_in) ? item.used_in : []
      const isSameUsage = nextUsedIn.length > 0 && nextUsedIn.every((value) => existingUsedIn.has(value))
      if (!isSameUsage) {
        existing.quantity += Number(item.quantity || 0)
        for (const usage of nextUsedIn) existingUsedIn.add(usage)
        existing.used_in = Array.from(existingUsedIn)
      }
    } else {
      merged.set(key, {
        ...item,
        quantity: Number(item.quantity || 0),
        used_in: Array.isArray(item.used_in) ? [...item.used_in] : [],
      })
    }
  }

  const mergedItems = Array.from(merged.values())
  await upsertShoppingListForDate({
    userId: user.id,
    householdId: household?.id || null,
    weekOf: today,
    items: mergedItems,
  })
  setShoppingListItems(mergedItems)
  toast.success(successMessage)
  return mergedItems
}
```

-----

## Section 5: Your read of the situation

My read is that the current `shopping_lists` table is **not** a multi-list system at all. It is a **weekly snapshot / per-user-per-week container** that stores the entire shopping list as a single JSONB `items` array, keyed by `(user_id, week_of)`. There is real live production data in it now, at least 17 rows, with recent rows from 2026-05-01, so this is not dead schema and would need preservation or deliberate migration. The presence of `household_id` and `partner_data` reinforces that it has evolved as a weekly planning artifact, not as a user-named list registry. `shopping_list_items` does **not** exist in production, and I found no active app write paths using it. Right now the codebase’s real persistence model is legacy JSONB-in-`shopping_lists`, not a normalized list/items pair. The migration history is messy and layered, with duplicate uniqueness artifacts in prod, so any multi-list feature should start with a deliberate reconciliation/migration plan instead of trying to “just add one more table” on top.
