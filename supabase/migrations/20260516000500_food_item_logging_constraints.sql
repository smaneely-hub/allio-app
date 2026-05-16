begin;

alter table public.meal_nutrition_logs
  drop constraint if exists meal_nutrition_logs_source_type_check;

alter table public.meal_nutrition_logs
  add constraint meal_nutrition_logs_source_type_check
  check (source_type in ('planner', 'manual', 'food_item'));

alter table public.meal_nutrition_logs
  drop constraint if exists meal_nutrition_logs_nutrition_source_check;

alter table public.meal_nutrition_logs
  add constraint meal_nutrition_logs_nutrition_source_check
  check (nutrition_source in ('recipe', 'manual', 'estimated', 'food_item'));

commit;
