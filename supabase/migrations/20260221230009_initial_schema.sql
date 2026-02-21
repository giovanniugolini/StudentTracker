-- ============================================================
-- Student Tracker — Initial Schema
-- Sprint 1 / T1.2
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- TEACHERS
-- Linked 1:1 to auth.users (created on first login)
-- ============================================================
create table public.teachers (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  school_name text,
  device_token text,                      -- FCM token for push notifications
  created_at  timestamptz not null default now()
);

comment on table public.teachers is 'Docenti registrati, collegati a auth.users';


-- ============================================================
-- TRIPS (Gite)
-- ============================================================
create type public.trip_status as enum ('draft', 'active', 'completed', 'cancelled');

create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  name        text not null,
  date_start  timestamptz not null,
  date_end    timestamptz not null,
  radius_km   numeric(5,2) not null default 0.5
                check (radius_km between 0.1 and 5),
  status      public.trip_status not null default 'draft',
  created_at  timestamptz not null default now(),
  constraint  date_order check (date_end > date_start)
);

comment on table public.trips is 'Gite scolastiche create dai docenti';

create index trips_teacher_id_idx on public.trips(teacher_id);
create index trips_status_idx     on public.trips(status);


-- ============================================================
-- STUDENTS
-- One row per student per trip; token used for magic link auth
-- ============================================================
create table public.students (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  name              text not null,
  phone             text,
  emergency_contact text,
  consent_signed    boolean not null default false,
  token             text not null unique default encode(gen_random_bytes(24), 'hex'),
  device_token      text,                -- FCM token (set when student activates link)
  created_at        timestamptz not null default now()
);

comment on table public.students is 'Studenti per gita, con token univoco per magic link';

create index students_trip_id_idx on public.students(trip_id);
create index students_token_idx   on public.students(token);


-- ============================================================
-- POSITIONS
-- High-frequency insert; TTL 30 days via pg_cron or Supabase scheduled function
-- ============================================================
create table public.positions (
  id            bigint generated always as identity primary key,
  student_id    uuid not null references public.students(id) on delete cascade,
  trip_id       uuid not null references public.trips(id)    on delete cascade,
  lat           double precision not null,
  lng           double precision not null,
  accuracy      real,                    -- GPS accuracy in metres
  battery_level smallint check (battery_level between 0 and 100),
  timestamp     timestamptz not null default now()
);

comment on table public.positions is 'Posizioni GPS degli studenti (TTL 30gg)';

create index positions_student_trip_idx on public.positions(student_id, trip_id);
create index positions_timestamp_idx    on public.positions(timestamp desc);


-- ============================================================
-- ALERTS
-- ============================================================
create type public.alert_type as enum (
  'out_of_zone',
  'low_battery',
  'gps_lost',
  'disconnected'
);

create table public.alerts (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.students(id) on delete cascade,
  trip_id     uuid not null references public.trips(id)    on delete cascade,
  type        public.alert_type not null,
  distance_km numeric(8,3),              -- null for non-distance alerts
  resolved    boolean not null default false,
  resolved_at timestamptz,
  timestamp   timestamptz not null default now()
);

comment on table public.alerts is 'Log allerte: allontanamento, batteria, GPS perso';

create index alerts_trip_id_idx     on public.alerts(trip_id);
create index alerts_student_id_idx  on public.alerts(student_id);
create index alerts_resolved_idx    on public.alerts(resolved) where not resolved;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.teachers enable row level security;
alter table public.trips     enable row level security;
alter table public.students  enable row level security;
alter table public.positions enable row level security;
alter table public.alerts    enable row level security;


-- TEACHERS policies
create policy "Teacher can read own profile"
  on public.teachers for select
  using (auth.uid() = id);

create policy "Teacher can update own profile"
  on public.teachers for update
  using (auth.uid() = id);

create policy "Service role can insert teachers"
  on public.teachers for insert
  with check (true);


-- TRIPS policies
create policy "Teacher sees own trips"
  on public.trips for select
  using (teacher_id = auth.uid());

create policy "Teacher creates own trips"
  on public.trips for insert
  with check (teacher_id = auth.uid());

create policy "Teacher updates own trips"
  on public.trips for update
  using (teacher_id = auth.uid());

create policy "Teacher deletes own trips"
  on public.trips for delete
  using (teacher_id = auth.uid());


-- STUDENTS policies
create policy "Teacher sees students of own trips"
  on public.students for select
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );

create policy "Teacher manages students of own trips"
  on public.students for insert
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );

create policy "Teacher updates students of own trips"
  on public.students for update
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );

create policy "Teacher deletes students of own trips"
  on public.students for delete
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );


-- POSITIONS policies
create policy "Teacher sees positions for own trips"
  on public.positions for select
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );

create policy "Service role inserts positions"
  on public.positions for insert
  with check (true);


-- ALERTS policies
create policy "Teacher sees alerts for own trips"
  on public.alerts for select
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );

create policy "Teacher resolves alerts"
  on public.alerts for update
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.teacher_id = auth.uid()
    )
  );

create policy "Service role inserts alerts"
  on public.alerts for insert
  with check (true);


-- ============================================================
-- TRIGGER: create teacher profile on auth.users insert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.teachers (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
