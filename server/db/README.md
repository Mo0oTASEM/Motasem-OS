# Nova OS Database Schema

## Schema Files

- `schema.sql` — Core tables (`nova_user_docs`, `nova_records`)
- `character-schema.sql` — Character system (6 tables)
- `planning-schema.sql` — Planning system (14 enum types, 27 tables)

## Creating Tables

Paste each file into Supabase Dashboard → SQL Editor and run.

The files are idempotent (`create table if not exists`) — safe to re-run.

## RLS Policies

Each table has row-level security policies that restrict access to the owning user via `auth.uid()`. Service role (`SUPABASE_SERVICE_KEY`) bypasses RLS for admin operations.
