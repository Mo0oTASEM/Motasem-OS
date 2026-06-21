-- Nova OS Database Schema
-- Apply this migration via Supabase SQL Editor or `supabase db push`

-- ============================================================
-- Table: nova_user_docs
-- Canonical data store for all user collections.
-- Each row stores one document in a user-defined collection.
-- ============================================================
create table if not exists public.nova_user_docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_name text not null,
  doc_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection_name, doc_id)
);

create index if not exists nova_user_docs_user_collection_updated_idx
  on public.nova_user_docs (user_id, collection_name, updated_at desc);

-- Enable Row Level Security
alter table public.nova_user_docs enable row level security;

-- RLS: Users can SELECT only their own documents
create policy "Users can select their own docs"
  on public.nova_user_docs for select
  using (user_id = auth.uid());

-- RLS: Users can INSERT only their own documents
create policy "Users can insert their own docs"
  on public.nova_user_docs for insert
  with check (user_id = auth.uid());

-- RLS: Users can UPDATE only their own documents
create policy "Users can update their own docs"
  on public.nova_user_docs for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS: Users can DELETE only their own documents
create policy "Users can delete their own docs"
  on public.nova_user_docs for delete
  using (user_id = auth.uid());

-- ============================================================
-- Legacy table: nova_records
-- Previously used for generic record storage. Retained for
-- backward compatibility but no longer actively used.
-- ============================================================
create table if not exists public.nova_records (
  user_id text not null,
  collection_name text not null,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection_name, id)
);

create index if not exists nova_records_user_collection_updated_idx
  on public.nova_records (user_id, collection_name, updated_at desc);

alter table public.nova_records enable row level security;

create policy "Users can select their own records"
  on public.nova_records for select
  using (user_id = auth.uid()::text);

create policy "Users can insert their own records"
  on public.nova_records for insert
  with check (user_id = auth.uid()::text);

create policy "Users can update their own records"
  on public.nova_records for update
  using (user_id = auth.uid()::text);

create policy "Users can delete their own records"
  on public.nova_records for delete
  using (user_id = auth.uid()::text);

-- ============================================================
-- Note: The user_id type in nova_user_docs uses uuid to match
-- auth.users.id. Existing rows with text user_ids will need
-- to be migrated if you have production data.
-- ============================================================
