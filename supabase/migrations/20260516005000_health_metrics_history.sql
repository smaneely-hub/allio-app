begin;

create table if not exists public.health_metric_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_type text not null check (metric_type in ('weight_kg', 'body_fat_pct', 'waist_cm', 'steps', 'blood_pressure_systolic', 'blood_pressure_diastolic')),
  value numeric not null,
  recorded_on date not null default current_date,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'imported', 'device')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_health_metric_logs_user_metric_date on public.health_metric_logs(user_id, metric_type, recorded_on desc);

alter table public.health_metric_logs enable row level security;

drop policy if exists "Users can view own health metric logs" on public.health_metric_logs;
create policy "Users can view own health metric logs"
  on public.health_metric_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own health metric logs" on public.health_metric_logs;
create policy "Users can insert own health metric logs"
  on public.health_metric_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own health metric logs" on public.health_metric_logs;
create policy "Users can update own health metric logs"
  on public.health_metric_logs
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own health metric logs" on public.health_metric_logs;
create policy "Users can delete own health metric logs"
  on public.health_metric_logs
  for delete
  using (auth.uid() = user_id);

commit;
