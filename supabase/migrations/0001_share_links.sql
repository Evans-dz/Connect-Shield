-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_share_links.sql — shareable read-only score snapshots
--
-- Run by hand in the Supabase SQL editor.
--
-- A share link is a random token that maps to one CCN. The public page
-- /s/<token> looks the token up with the SERVICE ROLE key (server-side only),
-- then renders the published CMS SSVI data for that CCN. No clinic documents,
-- no report cards, no PHI — only data CMS has already published.
--
-- RLS: signed-in users can create and see their OWN links. There is no public
-- SELECT policy on purpose — anonymous visitors can never enumerate tokens.
-- The snapshot page bypasses RLS with the service role for exactly one token.
-- ─────────────────────────────────────────────────────────────────────────────

-- gen_random_uuid() lives in pgcrypto (enabled by default on Supabase, but be safe).
create extension if not exists pgcrypto;

create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,          -- URL-safe random string, generated server-side
  ccn         text not null,                 -- the CMS Certification Number the snapshot shows
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,                   -- null = never expires
  revoked     boolean not null default false -- flip to true to kill a link immediately
);

-- Look up links a user has created (dashboard "your links" listing, future).
create index if not exists share_links_created_by_idx
  on public.share_links (created_by, created_at desc);

alter table public.share_links enable row level security;

-- Signed-in users create links attributed to themselves.
drop policy if exists "share_links_insert_own" on public.share_links;
create policy "share_links_insert_own"
  on public.share_links for insert
  to authenticated
  with check (created_by = auth.uid());

-- Users see (and can later revoke) only their own links.
drop policy if exists "share_links_select_own" on public.share_links;
create policy "share_links_select_own"
  on public.share_links for select
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "share_links_update_own" on public.share_links;
create policy "share_links_update_own"
  on public.share_links for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- NOTE: no anon policy. Public resolution happens server-side via service role.
