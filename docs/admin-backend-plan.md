# Allio Admin Backend Plan

## Why now

Allio has grown past the point where ad hoc production debugging is enough. We need an internal admin surface that lets us understand account state, support users safely, and track product health without touching raw tables by hand.

## Goals for v1

1. Give operators a safe way to inspect users and household state.
2. Expose core product metrics without opening Supabase directly.
3. Keep the first version narrow, auditable, and secure.
4. Avoid coupling admin reads to unsafe client-side broad table access.

## Non-goals for v1

- Full BI warehouse or event pipeline
- Rich cohort analysis
- Arbitrary SQL execution
- Bulk destructive admin actions
- Direct editing of every table

## Recommended architecture

### 1) Separate admin surface in the web app

Add a dedicated `/admin` section inside the existing React app.

Initial pages:
- `/admin` dashboard overview
- `/admin/users` user explorer
- `/admin/users/:userId` user detail

This keeps delivery fast and lets us reuse the existing auth shell.

### 2) Hard gate access with explicit admin claims

Do **not** rely on a client-visible `is_admin` boolean alone as the long-term control plane.

Recommended access ladder:
- **v1 scaffold:** read a small allowlist from `VITE_ADMIN_EMAILS` for UI access only, so we can stand the surface up quickly.
- **production hardening:** move to a server-verified admin table or auth claim checked by Edge Functions.

Important: the browser should never get unrestricted cross-user table access through anon credentials. The UI gate is just a convenience layer. Real privileged data must come from privileged server-side endpoints.

### 3) Use Supabase Edge Functions for admin data

Admin dashboard data should come from service-role-backed Edge Functions that:
- authenticate the caller
- verify admin status server-side
- return a limited shaped payload
- optionally write audit logs for sensitive actions

Suggested first functions:
- `admin-overview`
- `admin-users-list`
- `admin-user-detail`

### 4) Add admin audit logging

Create `admin_audit_logs` to capture:
- actor user id
- action type
- target user id if applicable
- metadata JSON
- timestamp

Any future write action, impersonation, subscription override, or support action should log here.

## Data we should show in v1

### Admin overview dashboard

Core cards:
- total users
- users created in last 7 days
- active users in last 7 days
- households created
- meal plans generated in last 7 days
- shopping list activity in last 7 days

Useful health tables:
- recent signups
- recent plan generation activity
- recent errors or empty-state failure signals if we expose them later

### User explorer

Columns:
- user id
- email
- created at
- household created?
- member count
- subscription tier
- onboarding complete?
- recent activity date

Filters:
- email search
- created recently
- has household / missing household
- premium / free
- active / inactive

### User detail page

Sections:
- account summary
- household summary
- household members
- preferences summary
- recent usage events
- recent meal plans count
- recent shopping list count
- support notes placeholder

## Safe admin actions for phase 2

After read-only v1 is working:
- mark user for support follow-up
- soft suspend access
- grant/revoke premium override
- trigger password reset email via normal auth flow
- support impersonation via time-boxed signed token flow

## Security rules

1. No direct service-role secrets in frontend code.
2. No broad cross-user browser queries with anon auth.
3. Every privileged endpoint must verify admin status server-side.
4. Every write action must create an audit log row.
5. Default to read-only until the audit path is proven.
6. Never expose raw PII beyond what support actually needs.

## Delivery plan

### Phase 1, scaffold now
- add `/admin` route
- add frontend admin guard
- add admin layout
- add dashboard skeleton with placeholder metrics
- add users table shell and user detail shell
- document required backend functions and tables

### Phase 2, secure backend
- add `admin_roles` or equivalent secure admin identity source
- add admin Edge Functions
- wire real metrics and real user lookup
- add audit log table and writes

### Phase 3, support tooling
- add safe actions
- add support notes
- add subscription controls
- add impersonation if truly needed

## Proposed schema additions

### `admin_roles`

Purpose: secure source of truth for who is an admin.

Suggested fields:
- `user_id uuid primary key references auth.users(id)`
- `role text not null default 'admin'`
- `created_at timestamptz not null default now()`
- `created_by uuid references auth.users(id)`

### `admin_audit_logs`

Suggested fields:
- `id uuid primary key default gen_random_uuid()`
- `actor_user_id uuid not null references auth.users(id)`
- `action text not null`
- `target_user_id uuid references auth.users(id)`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

## Metrics source notes

Given the current schema, likely v1 sources are:
- signups: `auth.users`
- households: `public.households`
- member counts: `public.household_members`
- plan generation/activity: `public.usage_tracking`, `public.meal_plans`
- shopping activity: `public.shopping_lists`, `public.shopping_list_items`
- preferences/onboarding hints: `public.user_preferences`, household existence, member existence

## Frontend implementation notes

- Reuse the current card styling and app shell.
- Keep the admin navigation hidden unless the user is an admin.
- Show clear empty states that explain whether data is placeholder, unavailable, or access-blocked.
- Prefer a typed admin API client wrapper in `src/lib/adminApi.js`.

## Decision

Build the UI bones immediately, but treat all cross-user data as server-owned from day one of real usage. That is the line between a helpful internal tool and a future security incident.
