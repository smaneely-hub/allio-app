begin;

-- Deduplicate existing rows: keep the most recently updated entry per (user_id, metric_type, recorded_on)
delete from public.health_metric_logs
where id in (
  select id from (
    select id,
           row_number() over (
             partition by user_id, metric_type, recorded_on
             order by updated_at desc, created_at desc
           ) as rn
    from public.health_metric_logs
  ) ranked
  where rn > 1
);

-- Add unique constraint so upsert can use it as a conflict target
alter table public.health_metric_logs
  add constraint health_metric_logs_user_metric_date_key
  unique (user_id, metric_type, recorded_on);

commit;
