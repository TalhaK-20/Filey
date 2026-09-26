-- FILEY — Supabase Postgres schema
--
-- Run this once in the Supabase dashboard: Project → SQL Editor → New query → paste
-- this whole file → Run. Safe to re-run (uses IF NOT EXISTS / OR REPLACE throughout).

create extension if not exists pgcrypto; -- gen_random_uuid()
create extension if not exists pg_trgm;  -- fast ILIKE '%term%' substring search

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  stored_name text not null,
  storage_key text not null,
  storage_url text,
  storage_provider text not null check (storage_provider in ('local', 'supabase')),
  mime_type text not null,
  extension text not null,
  category text not null default 'Other'
    check (category in ('Documents', 'Images', 'Audio', 'Video', 'Archives', 'Software', 'Other')),
  size bigint not null,
  checksum text not null,
  description text default '',
  uploader_id uuid references users(id) on delete set null,
  uploader_name text default 'Anonymous',
  download_count integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'pending', 'removed', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_extension_idx on files (extension);
create index if not exists files_category_idx on files (category);
create index if not exists files_status_idx on files (status);
create index if not exists files_created_at_idx on files (created_at desc);
create index if not exists files_download_count_idx on files (download_count desc);
create index if not exists files_checksum_idx on files (checksum);
create index if not exists files_original_name_trgm_idx on files using gin (original_name gin_trgm_ops);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  reason text not null check (reason in ('copyright', 'malware', 'illegal-content', 'spam', 'other')),
  description text default '',
  reporter_ip text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_status_idx on reports (status);
create index if not exists reports_file_id_idx on reports (file_id);

-- express-session store (see config/sessionStore.js)
create table if not exists sessions (
  sid text primary key,
  sess jsonb not null,
  expire timestamptz not null
);

create index if not exists sessions_expire_idx on sessions (expire);

-- Atomic download-count increment (avoids a read-then-write race under concurrent
-- downloads of the same file).
create or replace function increment_download_count(file_id uuid)
returns void as $$
  update files set download_count = download_count + 1 where id = file_id;
$$ language sql;

-- These tables are only ever queried with the service_role key from the Express
-- server (never from the browser), so Row Level Security is left disabled — the
-- service_role key bypasses RLS regardless. If you want defense-in-depth anyway,
-- enable it and restrict access to that role, e.g.:
--   alter table files enable row level security;
--   create policy "service role only" on files using (auth.role() = 'service_role');
-- (repeat for users, reports, sessions)
