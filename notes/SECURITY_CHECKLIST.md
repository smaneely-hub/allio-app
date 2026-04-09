# Allio Security Checklist for New Tables

## Overview
This checklist ensures every new table has proper Row Level Security (RLS) before deployment.

## For Every New Table, Answer These Questions:

### 1. RLS Status
- [ ] Is RLS enabled on this table?
- [ ] If NO, is there a documented reason why it's not needed?

### 2. Data Classification
What type of data does this table hold?
- [ ] **USER_OWNED** - User-specific data (households, meal_plans, shopping_lists)
- [ ] **PUBLIC_CATALOG** - Shared read-only data (recipes, static lookups)
- [ ] **INTERNAL_ONLY** - System/analytics data (feature_flags, usage_tracking)

### 3. Read Access
Who can read this table?
- [ ] Everyone (including unauthenticated)
- [ ] Authenticated users only
- [ ] Service role / admin only

### 4. Write Access
Who can write to this table?
- [ ] No one (read-only)
- [ ] Authenticated users (ownership-scoped)
- [ ] Service role / admin only

### 5. Policies
- [ ] SELECT policy exists and is correct
- [ ] INSERT policy exists and is correct  
- [ ] UPDATE policy exists and is correct
- [ ] DELETE policy exists and is correct

### 6. Foreign Key Relationships
- [ ] All foreign keys reference tables have RLS enabled
- [ ] Ownership chaining is correct (e.g., household_ id → households → user_ id)

---

## Table Classification Reference

### USER_OWNED Tables (auth.uid() = user_ id or household_id relationship)
- households
- household_members
- meal_plans
- weekly_schedules
- schedule_slots
- shopping_lists
- meal_instances
- meal_member_feedback
- saved_meals
- planned_meals
- planned_days

**Policy Template for USER_OWNED:**
```sql
-- SELECT: Users can only see their own data
CREATE POLICY "users_select_own" ON table_name FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can only insert their own data  
CREATE POLICY "users_insert_own" ON table_name FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own data
CREATE POLICY "users_update_own" ON table_name FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own data
CREATE POLICY "users_delete_own" ON table_name FOR DELETE USING (auth.uid() = user_id);
```

### PUBLIC_CATALOG Tables (read-only for authenticated)
- recipes

**Policy Template for PUBLIC_CATALOG:**
```sql
-- SELECT: Authenticated users can read
CREATE POLICY "auth_read_catalog" ON table_name FOR SELECT USING (auth.uid() IS NOT NULL);

-- ALL: Service role only for mutations
CREATE POLICY "service_manage_catalog" ON table_name FOR ALL USING (auth.role() = 'service_role');
```

### INTERNAL_ONLY Tables (service role only)
- feature_flags
- usage_tracking

**Policy Template for INTERNAL_ONLY:**
```sql
-- ALL: Only service role can access
CREATE POLICY "service_only" ON table_name FOR ALL USING (auth.role() = 'service_role');
```

---

## Verification Commands

```bash
# Check RLS status of all tables
SELECT schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public';

# Check existing policies
SELECT tablename, policyname, cmd, permissive
FROM pg_olicies
WHERE schemaname = 'public';
```

---

## Security Alert Response
If Supabase flags RLS issues:
1. Run verification query above
2. Identify tables with rowsecurity = false
3. Apply appropriate policy template
4. Test authenticated access still works
5. Verify no public write access exists
