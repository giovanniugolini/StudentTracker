-- ============================================================
-- delete_trip_positions: teacher-only deletion of all position
-- records for a trip (GDPR right to erasure).
-- ============================================================

create or replace function public.delete_trip_positions(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the trip owner may delete positions
  if not exists (
    select 1 from public.trips
    where id = p_trip_id and teacher_id = auth.uid()
  ) then
    raise exception 'UNAUTHORIZED';
  end if;

  delete from public.positions where trip_id = p_trip_id;
end;
$$;

grant execute on function public.delete_trip_positions to authenticated;

-- ============================================================
-- cleanup_old_positions: deletes positions older than 30 days.
-- Call manually or wire up to pg_cron / Edge Function cron.
-- Returns the number of rows deleted.
-- ============================================================

create or replace function public.cleanup_old_positions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.positions
  where "timestamp" < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_old_positions to service_role;
