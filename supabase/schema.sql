-- ─────────────────────────────────────────────────────────────────────────────
-- Aestus LP Newsletter Tool — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── sessions ─────────────────────────────────────────────────────────────────
create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  user_email      text not null,
  fund_name       text not null check (fund_name in ('Aestus I', 'Aestus II', 'Aestus III')),
  prev_quarter_key text not null,
  curr_quarter_key text not null,
  interim_keys    text[] not null default '{}',
  status          text not null default 'uploading'
                  check (status in ('uploading', 'processing', 'ready', 'exported')),
  created_at      timestamptz not null default now()
);

-- ─── bullets ──────────────────────────────────────────────────────────────────
create table if not exists bullets (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id) on delete cascade,
  company_name    text not null,
  bullet_text     text not null,
  source_quote    text not null default '',
  confidence      text not null default 'medium'
                  check (confidence in ('high', 'medium', 'low')),
  flagged         boolean not null default false,
  approved        boolean not null default false,
  edited_text     text,
  edited_at       timestamptz,
  editor_email    text,
  created_at      timestamptz not null default now()
);

-- ─── audit_log ────────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id              uuid primary key default gen_random_uuid(),
  user_email      text not null,
  action          text not null
                  check (action in ('upload', 'generate', 'edit_bullet', 'approve_bullet', 'export')),
  details         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_bullets_session_id on bullets(session_id);
create index if not exists idx_audit_log_user_email on audit_log(user_email);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The app uses the service role key server-side (bypasses RLS).
-- Enable RLS as defence-in-depth to block any accidental anon access.
alter table sessions  enable row level security;
alter table bullets   enable row level security;
alter table audit_log enable row level security;

-- Block all anon/authenticated direct access (server uses service role)
create policy "Deny all anon" on sessions  for all using (false);
create policy "Deny all anon" on bullets   for all using (false);
create policy "Deny all anon" on audit_log for all using (false);
