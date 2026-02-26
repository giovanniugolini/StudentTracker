-- ============================================================
-- Aggiunge timeout_seconds a roll_calls
-- Sprint 6 / T6.1 addendum
-- ============================================================
alter table public.roll_calls
  add column timeout_seconds integer not null default 60
    check (timeout_seconds between 10 and 300);
