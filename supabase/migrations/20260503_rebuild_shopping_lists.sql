-- Drop legacy. Pre-launch, no data to preserve.
drop table if exists public.shopping_lists cascade;

-- New shopping_lists: user-named persistent lists
create table public.shopping_lists (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 is_default boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index shopping_lists_user_id_idx on public.shopping_lists(user_id);
create unique index shopping_lists_one_default_per_user
 on public.shopping_lists(user_id) where is_default;

alter table public.shopping_lists enable row level security;

create policy "Users select own shopping lists" on public.shopping_lists
 for select using (auth.uid() = user_id);
create policy "Users insert own shopping lists" on public.shopping_lists
 for insert with check (auth.uid() = user_id);
create policy "Users update own shopping lists" on public.shopping_lists
 for update using (auth.uid() = user_id);
create policy "Users delete own shopping lists" on public.shopping_lists
 for delete using (auth.uid() = user_id);

-- shopping_list_items: row per item
create table public.shopping_list_items (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.shopping_lists(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 quantity text,
 category text,
 checked boolean not null default false,
 source text not null default 'manual',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index shopping_list_items_list_id_idx on public.shopping_list_items(list_id);
create index shopping_list_items_user_list_idx on public.shopping_list_items(user_id, list_id);

alter table public.shopping_list_items enable row level security;

create policy "Users select own shopping list items" on public.shopping_list_items
 for select using (auth.uid() = user_id);
create policy "Users insert own shopping list items" on public.shopping_list_items
 for insert with check (auth.uid() = user_id);
create policy "Users update own shopping list items" on public.shopping_list_items
 for update using (auth.uid() = user_id);
create policy "Users delete own shopping list items" on public.shopping_list_items
 for delete using (auth.uid() = user_id);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger shopping_lists_set_updated_at
 before update on public.shopping_lists
 for each row execute function public.set_updated_at();

create trigger shopping_list_items_set_updated_at
 before update on public.shopping_list_items
 for each row execute function public.set_updated_at();

-- Preference fields for default list and ask-before-adding
alter table public.user_preferences
 add column if not exists default_shopping_list_id uuid
 references public.shopping_lists(id) on delete set null,
 add column if not exists always_ask_shopping_list boolean not null default false;
