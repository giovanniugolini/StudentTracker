-- ============================================================
-- upsert_position: called by the student client (anon key).
-- Validates the student belongs to the trip, then inserts
-- a new position row (all history is kept for playback).
-- SECURITY DEFINER bypasses RLS so anon can write to positions.
-- ============================================================

create or replace function public.upsert_position(
  p_student_id  uuid,
  p_trip_id     uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_accuracy    real             default null,
  p_battery     smallint         default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate student belongs to the trip
  if not exists (
    select 1 from public.students
    where id = p_student_id and trip_id = p_trip_id
  ) then
    raise exception 'STUDENT_NOT_IN_TRIP';
  end if;

  insert into public.positions (student_id, trip_id, lat, lng, accuracy, battery_level)
  values (p_student_id, p_trip_id, p_lat, p_lng, p_accuracy, p_battery);
end;
$$;

grant execute on function public.upsert_position to anon, authenticated;
