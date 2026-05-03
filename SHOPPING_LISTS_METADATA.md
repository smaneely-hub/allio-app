# SHOPPING_LISTS_METADATA.md

## Query 1 — Indexes
SQL:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'shopping_lists';
```

Verbatim output:

```text
┌────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│             indexname              │                                                    indexdef                                                    │
├────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ shopping_lists_pkey                │ CREATE UNIQUE INDEX shopping_lists_pkey ON public.shopping_lists USING btree (id)                              │
│ shopping_lists_user_id_week_of_key │ CREATE UNIQUE INDEX shopping_lists_user_id_week_of_key ON public.shopping_lists USING btree (user_id, week_of) │
│ idx_shopping_lists_user_week       │ CREATE INDEX idx_shopping_lists_user_week ON public.shopping_lists USING btree (user_id, week_of)              │
│ unique_user_week                   │ CREATE UNIQUE INDEX unique_user_week ON public.shopping_lists USING btree (user_id, week_of)                   │
└────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

STDERR:
Initialising login role...
```

## Query 2 — Constraints
SQL:

```sql
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.shopping_lists'::regclass;
```

Verbatim output:

```text
┌────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
│              conname               │                                   def                                   │
├────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
│ shopping_lists_household_id_fkey   │ FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL │
│ shopping_lists_pkey                │ PRIMARY KEY (id)                                                        │
│ shopping_lists_user_id_fkey        │ FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE       │
│ shopping_lists_user_id_week_of_key │ UNIQUE (user_id, week_of)                                               │
│ unique_user_week                   │ UNIQUE (user_id, week_of)                                               │
└────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘

STDERR:
Initialising login role...
```

## Query 3 — RLS policies
SQL:

```sql
select polname, polcmd
from pg_policy
where polrelid = 'public.shopping_lists'::regclass;
```

Verbatim output:

```text
┌─────────────────────────────────────┬────────┐
│               polname               │ polcmd │
├─────────────────────────────────────┼────────┤
│ Users can view own shopping lists   │ r      │
│ Users can insert own shopping lists │ a      │
│ Users can update own shopping lists │ w      │
│ Users can delete own shopping lists │ d      │
└─────────────────────────────────────┴────────┘

STDERR:
Initialising login role...
```

## Query 4 — Triggers
SQL:

```sql
select tgname, pg_get_triggerdef(oid) as def
from pg_trigger
where tgrelid = 'public.shopping_lists'::regclass and not tgisinternal;
```

Verbatim output:

```text
STDERR:
Initialising login role...
```

## Query 5 — Sequences owned by columns on this table
SQL:

```sql
select s.relname as sequence_name, a.attname as column_name
from pg_class s
join pg_depend d on d.objid = s.oid
join pg_class t on d.refobjid = t.oid
join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
where s.relkind = 'S' and t.relname = 'shopping_lists' and t.relnamespace = 'public'::regnamespace;
```

Verbatim output:

```text
STDERR:
Initialising login role...
```

## Query 6 — Views or other objects referencing the table
SQL:

```sql
select dependent_view.relname as view_name
from pg_depend
join pg_rewrite on pg_depend.objid = pg_rewrite.oid
join pg_class dependent_view on pg_rewrite.ev_class = dependent_view.oid
join pg_class source_table on pg_depend.refobjid = source_table.oid
where source_table.relname = 'shopping_lists'
 and source_table.relnamespace = 'public'::regnamespace
 and dependent_view.oid <> source_table.oid;
```

Verbatim output:

```text
STDERR:
Initialising login role...
```
