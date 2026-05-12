# Allio Multi-List Shopping and Sharing Plan

## Product direction

Allio should move from a single implicit grocery list to a persistent multi-list model closer to AnyList.

Users should be able to:
- create multiple named shopping lists
- choose which shopping list planned meals flow into
- combine planned and manually added items in the same list
- clearly see which items came from the planner versus manual entry
- share lists with family members
- later share meal plans with family members using the same household model

## Decisions

### 1) Lists are persistent, not week-bound

A shopping list is a durable named container, for example:
- Weekly groceries
n- Costco
- Trader Joe's
- Party list
- Vacation house

Planner output is sent into one selected list, rather than generating a separate week-locked list.

### 2) Planner items and manual items should coexist

The same list should hold both:
- planner-generated items
- manually added items

They should aggregate together when they refer to the same ingredient and compatible unit.

### 3) Item source must remain visible

Each item needs a visible source cue:
- `Planned` badge for planner-originated items
- `Manual` badge for user-added items
- future: `Shared` or contributor badge when another household member adds items

When a manual item merges with a planner item, the item should retain source metadata that tells us both origins contributed.

### 4) User preference for planner destination

Users need two related preferences:
- default shopping list
- always ask where planner items should go

Behavior:
- if always-ask is off, planner sends to default list automatically
- if always-ask is on, show a picker before planner sync

### 5) Sharing model should be household-based

For real collaboration, the long-term model should not duplicate lists across users.

Instead, lists should become household-shareable resources with membership and permissions.

Recommended roles later:
- owner
- editor
- viewer

## Recommended data model evolution

## Existing useful pieces

Already present:
- `shopping_lists`
- `shopping_list_items`
- `user_preferences.default_shopping_list_id`
- `user_preferences.always_ask_shopping_list`

## Required v1 additions

### shopping_list_items metadata

Add fields like:
- `source_label text` optional display label
- `source_count integer not null default 1`
- `source_flags jsonb not null default '[]'::jsonb`
- `planner_meal_refs jsonb not null default '[]'::jsonb`

Purpose:
- preserve whether an item came from planner, manual, or both
- show richer cue in UI without losing aggregation behavior
- later track which planned meals contributed to an item

A simpler v1 alternative is to keep `source` but allow values:
- `manual`
- `planner`
- `mixed`

That is enough to ship the user-facing cue quickly.

### shopping_lists shareability

Phase 2 additions:
- `household_id uuid references households(id)` nullable for now
- `visibility text default 'private' check (visibility in ('private','household'))`

### shopping_list_members table

Phase 2 collaborative sharing table:
- `id uuid primary key default gen_random_uuid()`
- `list_id uuid not null references shopping_lists(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null default 'editor'`
- `created_at timestamptz not null default now()`

This is the real basis for shared list collaboration.

## UX plan

### Shop page v1

Add:
- list switcher dropdown or segmented selector
- create new list action
- rename list action
- set as default action
- source badge on each item
- small helper copy that explains planner items and manual items merge here

### Planner flow v1

Before syncing grocery items from planner:
- read `default_shopping_list_id`
- if `always_ask_shopping_list` is false, send to default list
- if true, show simple modal picker with:
  - selected list
  - option to create a new list

### Item display cue

Examples:
- `Planned`
- `Manual`
- `Mixed`

Optional later enhancement:
- sublabel like `From Tue dinner, Thu lunch`

## Aggregation rules

1. Manual and planner items can merge if ingredient and unit are compatible.
2. If merged sources differ, resulting item becomes `mixed`.
3. Deleting a manually added mixed item deletes the whole row in v1.
4. Smarter partial source subtraction can come later once planner meal refs exist.

## Sharing roadmap

### Phase 1, now
- multiple named lists
- list picker
- planner destination preference
- planner/manual badges
- copy/share current list as text

### Phase 2
- household-shared lists
- list member permissions
- collaborator attribution on item rows
- real-time refresh for shared edits

### Phase 3
- shared meal plans
- assign meals or shopping sections to family members
- notifications for changes

## Implementation order

1. Frontend scaffold for multiple lists on Shop page
2. Utility layer for list CRUD and selected/default handling
3. Settings UI for default list and ask-before-sync behavior
4. Planner and Tonight flows use selected/default list correctly
5. Item source badges and mixed-source handling
6. Collaborative schema and RLS expansion later

## Recommendation

Ship the single-user multi-list model immediately, but structure the UI and schema so household sharing becomes an extension, not a rewrite. That keeps us fast now and avoids trapping planner sync logic inside a single-list assumption.
