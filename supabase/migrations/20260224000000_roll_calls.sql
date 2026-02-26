-- ============================================================
-- Student Tracker — Appello (Roll Calls)
-- Sprint 6 / T6.1
-- ============================================================


-- ============================================================
-- ROLL_CALLS
-- Una sessione di appello per gita; solo una attiva alla volta
-- ============================================================
create table public.roll_calls (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  started_at  timestamptz not null default now(),
  closed_at   timestamptz,
  constraint  one_active_per_trip unique nulls not distinct (trip_id, closed_at)
);

comment on table public.roll_calls is 'Sessioni di appello avviate dal docente durante una gita';

create index roll_calls_trip_id_idx on public.roll_calls(trip_id);


-- ============================================================
-- ROLL_CALL_RESPONSES
-- Una risposta per studente per sessione di appello
-- ============================================================
create table public.roll_call_responses (
  id              uuid primary key default gen_random_uuid(),
  roll_call_id    uuid not null references public.roll_calls(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  responded_at    timestamptz not null default now(),
  constraint      one_response_per_student unique (roll_call_id, student_id)
);

comment on table public.roll_call_responses is 'Risposte degli studenti alle sessioni di appello';

create index roll_call_responses_roll_call_id_idx on public.roll_call_responses(roll_call_id);


-- ============================================================
-- RLS
-- ============================================================
alter table public.roll_calls          enable row level security;
alter table public.roll_call_responses enable row level security;

-- roll_calls: solo il docente proprietario della gita può leggere/scrivere
create policy "roll_calls_teacher_all" on public.roll_calls
  for all
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- roll_calls: studenti possono leggere l'appello attivo della propria gita (per il subscribe)
create policy "roll_calls_student_read" on public.roll_calls
  for select
  to anon
  using (true);

-- roll_call_responses: il docente può leggere tutte le risposte dei propri appelli
create policy "roll_call_responses_teacher_read" on public.roll_call_responses
  for select
  to authenticated
  using (
    roll_call_id in (
      select id from public.roll_calls where teacher_id = auth.uid()
    )
  );

-- roll_call_responses: inserimento anonimo (studenti autenticati via token, non via auth.uid)
-- la validità viene garantita dalla RPC
create policy "roll_call_responses_student_insert" on public.roll_call_responses
  for insert
  to anon
  with check (true);


-- ============================================================
-- RPC: close_roll_call
-- Chiude l'appello attivo; solo il docente proprietario può farlo
-- ============================================================
create or replace function public.close_roll_call(p_roll_call_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.roll_calls
  set    closed_at = now()
  where  id = p_roll_call_id
    and  teacher_id = auth.uid()
    and  closed_at is null;

  if not found then
    raise exception 'Appello non trovato o non autorizzato';
  end if;
end;
$$;


-- ============================================================
-- RPC: respond_to_roll_call
-- Lo studente risponde all'appello; valida che student_id appartenga alla gita
-- ============================================================
create or replace function public.respond_to_roll_call(
  p_roll_call_id uuid,
  p_student_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_trip_id    uuid;
begin
  -- Risolve il token in student_id
  select id, trip_id into v_student_id, v_trip_id
  from   public.students
  where  token = p_student_token;

  if v_student_id is null then
    raise exception 'Token studente non valido';
  end if;

  -- Verifica che l'appello appartenga alla stessa gita dello studente
  if not exists (
    select 1 from public.roll_calls
    where  id = p_roll_call_id
      and  trip_id = v_trip_id
      and  closed_at is null
  ) then
    raise exception 'Appello non attivo per questa gita';
  end if;

  -- Inserisce la risposta (ignora duplicati)
  insert into public.roll_call_responses (roll_call_id, student_id)
  values (p_roll_call_id, v_student_id)
  on conflict (roll_call_id, student_id) do nothing;
end;
$$;
