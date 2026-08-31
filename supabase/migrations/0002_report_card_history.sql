-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_report_card_history.sql — append-only report card history
--
-- Run by hand in the Supabase SQL editor.
--
-- Today clinic_report_cards keeps ONE row per (clinic, report_type) — the
-- latest card overwrites the previous one. That stays exactly as it is; the
-- dashboard's current view still reads it.
--
-- This table is purely ADDITIVE: every time a card is saved, the app also
-- appends a snapshot row here. Nothing updates or deletes these rows, so the
-- dashboard can draw a score-over-time trend once two or more snapshots exist.
--
-- NO SCORES ARE STORED (same rule as clinic_report_cards). Rows hold the raw
-- extracted analysis; every score on the trend is recomputed on read by
-- lib/compliance.js so there is one source of truth.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists public.clinic_report_card_history (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  report_type         text not null,        -- cap | psr | pepper | cahps | qapi
  analysis            jsonb,                -- the extracted values, exactly as saved to the card
  report_date         date,                 -- period-end date printed ON the document
  report_period_label text,                 -- human-readable period, as printed
  source_doc_id       uuid,                 -- clinic_documents row it came from, when known
  created_at          timestamptz not null default now()
);

-- The trend query: all history for one clinic, oldest first.
create index if not exists clinic_report_card_history_clinic_idx
  on public.clinic_report_card_history (clinic_id, created_at);

alter table public.clinic_report_card_history enable row level security;

-- Members of a clinic (via profiles.clinic_id) read their own clinic's history.
drop policy if exists "report_history_select_own_clinic" on public.clinic_report_card_history;
create policy "report_history_select_own_clinic"
  on public.clinic_report_card_history for select
  to authenticated
  using (
    clinic_id in (select clinic_id from public.profiles where id = auth.uid())
  );

-- Members of a clinic append history rows for their own clinic only.
drop policy if exists "report_history_insert_own_clinic" on public.clinic_report_card_history;
create policy "report_history_insert_own_clinic"
  on public.clinic_report_card_history for insert
  to authenticated
  with check (
    clinic_id in (select clinic_id from public.profiles where id = auth.uid())
  );

-- Append-only on purpose: no UPDATE and no DELETE policies for authenticated.
