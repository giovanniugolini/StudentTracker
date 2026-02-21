-- ============================================================
-- Student Token RPC
-- Sprint 1 / T1.4
-- Validates a student's magic link token and returns
-- student + trip info. Uses SECURITY DEFINER so the anon
-- role can call it without bypassing RLS on the tables.
-- ============================================================

create or replace function public.get_student_by_token(p_token text)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'student', row_to_json(s),
    'trip',    row_to_json(t)
  )
  into v_result
  from public.students s
  join public.trips    t on t.id = s.trip_id
  where s.token = p_token
    and t.status in ('draft', 'active');

  if v_result is null then
    raise exception 'TOKEN_INVALID'
      using hint = 'Token non valido o gita non attiva';
  end if;

  return v_result;
end;
$$;

-- Allow anon and authenticated roles to call this function
grant execute on function public.get_student_by_token(text) to anon, authenticated;
