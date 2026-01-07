-- Prevent appointment overlap at the database level (single source of truth)
-- Goal:
-- - For owner-only businesses (no staff_id) => treat capacity as 1, no overlaps per business/day
-- - For multi-staff businesses => no overlaps per staff/day
--
-- This uses an EXCLUDE constraint on a generated resource_id and a time range.
-- resource_id = COALESCE(staff_id, business_id)
--
-- NOTE:
-- If there are existing overlaps from previous buggy logic, we cancel the overlapping
-- newer appointments to allow the constraint to be created.

create extension if not exists btree_gist;

-- 1) Ensure end_time is present (so ranges can be computed reliably)
update public.appointments
set end_time = (start_time + (coalesce(duration_minutes, 30) || ' minutes')::interval)::time
where end_time is null
  and start_time is not null
  and date is not null;

-- 2) Generated columns for range constraints
alter table public.appointments
  add column if not exists resource_id uuid
    generated always as (coalesce(staff_id, business_id)) stored;

alter table public.appointments
  add column if not exists start_ts timestamp without time zone
    generated always as (
      case
        when date is null or start_time is null then null
        else (date + start_time)
      end
    ) stored;

alter table public.appointments
  add column if not exists end_ts timestamp without time zone
    generated always as (
      case
        when date is null or end_time is null then null
        else (date + end_time)
      end
    ) stored;

-- 3) Sanity check (end must be after start)
alter table public.appointments
  drop constraint if exists appointments_valid_time_range;

alter table public.appointments
  add constraint appointments_valid_time_range
  check (
    start_ts is null
    or end_ts is null
    or end_ts > start_ts
  );

-- 4) Cancel overlaps (data repair) so constraint can be created
-- We keep the earliest appointment and cancel any later appointment that overlaps it.
with ordered as (
  select
    id,
    resource_id,
    date,
    start_ts,
    end_ts,
    created_at,
    lag(end_ts) over (
      partition by resource_id, date
      order by start_ts asc nulls last, created_at asc
    ) as prev_end_ts
  from public.appointments
  where status in ('pending', 'confirmed', 'arrived', 'started', 'completed')
    and resource_id is not null
    and date is not null
    and start_ts is not null
    and end_ts is not null
),
to_cancel as (
  select id
  from ordered
  where prev_end_ts is not null
    and start_ts < prev_end_ts
)
update public.appointments
set status = 'cancelled'
where id in (select id from to_cancel);

-- 5) Exclusion constraint to prevent any future overlaps per resource (staff or business-owner-only)
alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    resource_id with =,
    tsrange(start_ts, end_ts, '[)') with &&
  )
  where (
    status in ('pending', 'confirmed', 'arrived', 'started', 'completed')
    and resource_id is not null
    and start_ts is not null
    and end_ts is not null
  );


