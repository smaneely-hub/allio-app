create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand text,
  category text not null default 'general',
  source text not null default 'seeded',
  serving_label text not null default '1 serving',
  serving_amount numeric(10,2) not null default 1,
  calories integer not null default 0,
  protein_g numeric(10,2) not null default 0,
  carbs_g numeric(10,2) not null default 0,
  fat_g numeric(10,2) not null default 0,
  verified boolean not null default false,
  search_terms text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists food_items_name_idx on public.food_items using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'')));
create index if not exists food_items_search_terms_idx on public.food_items using gin (search_terms);

alter table public.food_items enable row level security;

drop policy if exists "Food items are viewable by authenticated users" on public.food_items;
create policy "Food items are viewable by authenticated users"
  on public.food_items
  for select
  to authenticated
  using (true);

drop policy if exists "Food items are manageable by service role" on public.food_items;
create policy "Food items are manageable by service role"
  on public.food_items
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.user_saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, food_item_id)
);

create index if not exists user_saved_foods_user_idx on public.user_saved_foods(user_id);

alter table public.user_saved_foods enable row level security;

drop policy if exists "Users can view saved foods" on public.user_saved_foods;
create policy "Users can view saved foods"
  on public.user_saved_foods
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert saved foods" on public.user_saved_foods;
create policy "Users can insert saved foods"
  on public.user_saved_foods
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete saved foods" on public.user_saved_foods;
create policy "Users can delete saved foods"
  on public.user_saved_foods
  for delete
  using (auth.uid() = user_id);

insert into public.food_items (slug, name, brand, category, source, serving_label, serving_amount, calories, protein_g, carbs_g, fat_g, verified, search_terms)
values
  ('kraft-mac-cheese', 'Mac & Cheese', 'Kraft', 'packaged', 'seeded', '1 cup prepared', 1, 350, 9, 47, 13, true, array['mac and cheese','mac & cheese','kraft dinner']),
  ('mcdonalds-hamburger', 'Hamburger', 'McDonald''s', 'restaurant', 'seeded', '1 burger', 1, 250, 12, 31, 9, true, array['mcdonalds hamburger','mcdonald''s hamburger','burger']),
  ('poptart-strawberry', 'Frosted Strawberry Pop-Tarts', 'Pop-Tarts', 'packaged', 'seeded', '2 pastries', 1, 370, 4, 69, 9, true, array['poptart','pop tart','strawberry poptart','pop-tarts']),
  ('banana-medium', 'Banana', null, 'produce', 'seeded', '1 medium banana', 1, 105, 1.3, 27, 0.3, true, array['banana','fruit']),
  ('egg-large', 'Egg', null, 'protein', 'seeded', '1 large egg', 1, 72, 6.3, 0.4, 4.8, true, array['egg','eggs']),
  ('greek-yogurt-plain', 'Greek Yogurt, Plain', null, 'dairy', 'seeded', '1 cup', 1, 130, 23, 9, 0, true, array['greek yogurt','yogurt']),
  ('oatmeal-cooked', 'Oatmeal, cooked', null, 'breakfast', 'seeded', '1 cup', 1, 154, 5, 27, 3, true, array['oatmeal','oats']),
  ('chicken-breast-cooked', 'Chicken Breast, cooked', null, 'protein', 'seeded', '4 oz', 1, 187, 35, 0, 4, true, array['chicken breast','chicken']),
  ('white-rice-cooked', 'White Rice, cooked', null, 'grain', 'seeded', '1 cup', 1, 205, 4.3, 45, 0.4, true, array['rice','white rice']),
  ('broccoli-steamed', 'Broccoli, steamed', null, 'vegetable', 'seeded', '1 cup', 1, 55, 3.7, 11.2, 0.6, true, array['broccoli']),
  ('peanut-butter', 'Peanut Butter', null, 'pantry', 'seeded', '2 tbsp', 1, 190, 7, 8, 16, true, array['peanut butter']),
  ('whole-wheat-bread', 'Whole Wheat Bread', null, 'bakery', 'seeded', '2 slices', 1, 160, 8, 28, 2, true, array['bread','whole wheat bread'])
on conflict (slug) do update set
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  source = excluded.source,
  serving_label = excluded.serving_label,
  serving_amount = excluded.serving_amount,
  calories = excluded.calories,
  protein_g = excluded.protein_g,
  carbs_g = excluded.carbs_g,
  fat_g = excluded.fat_g,
  verified = excluded.verified,
  search_terms = excluded.search_terms,
  updated_at = timezone('utc', now());