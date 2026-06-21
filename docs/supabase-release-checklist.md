# Supabase Production Release Checklist — Motasem OS

## 1. Schema Migrations

- [ ] All migrations are committed to git and present in `supabase/migrations/`
- [ ] Migration files are numbered sequentially (e.g., `20250101000000_initial.sql`)
- [ ] Every migration uses `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — idempotent on re-run
- [ ] `supabase db dump --schema public > schema.sql` produces a clean schema with no drift
- [ ] Running `supabase migration list` shows all local migrations applied and no conflicts
- [ ] Migration SQL has been reviewed: no `DROP`, no `TRUNCATE`, no destructive defaults on existing tables

## 2. Row-Level Security (RLS)

- [ ] `nova_user_docs` has RLS enabled: `ALTER TABLE nova_user_docs ENABLE ROW LEVEL SECURITY;`
- [ ] Policy exists on `nova_user_docs`: `FOR ALL USING (auth.uid() = user_id)`
- [ ] All `character_*` tables (13+) have a `user_id UUID NOT NULL` column referencing `auth.users(id)`
- [ ] All `character_*` tables have RLS enabled with policy: `USING (auth.uid() = user_id)`
- [ ] All `planner_*` tables (27+) have a `user_id UUID NOT NULL` column referencing `auth.users(id)`
- [ ] All `planner_*` tables have RLS enabled with policy: `USING (auth.uid() = user_id)`
- [ ] No table in `public` schema lacks an RLS policy (run `supabase db check` to verify)
- [ ] Authenticated role has no blanket `SELECT`, `INSERT`, `UPDATE`, or `DELETE` on any table — only via row-level policies

## 3. Indexes

- [ ] `nova_user_docs` has index on `(user_id, collection_name)` — covers collection listing queries
- [ ] `nova_user_docs` has index on `(user_id, collection_name, doc_id)` — covers the PK lookup pattern
- [ ] Every `character_*` table has an index on `user_id`
- [ ] Every `planner_*` table has an index on `user_id`
- [ ] High-query `character_*` and `planner_*` tables have composite index on `(user_id, status)` where applicable
- [ ] Index creation SQL is part of a migration (or `supabase/seed.sql`), not applied ad-hoc
- [ ] `EXPLAIN ANALYZE` has been run against the three most common query patterns to verify index usage

## 4. Service Role Key

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **not** present in any `.env`, `.env.local`, or frontend environment variable
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side code (`server/`) or Edge Functions
- [ ] No occurrence of `service_role` or `serviceRole` in any `src/` file (grepped and confirmed)
- [ ] Service role key is stored as a secret in Vercel (server) / Cloud Run, not in git
- [ ] All frontend clients use the anon/publishable key with RLS enforcing auth

## 5. Auth Providers — Google OAuth

- [ ] Google OAuth is enabled in Supabase Dashboard > Authentication > Providers
- [ ] Client ID and Client Secret are configured (no placeholder values)
- [ ] Authorized redirect URI in Google Cloud Console matches Supabase callback:
      `https://<project>.supabase.co/auth/v1/callback`
- [ ] Production Supabase project URL is used in callback (not `localhost` or preview branch URL)
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in Vercel environment (not in repo)
- [ ] Dev bypass (`localStorage.nova_dev_user_bypass`) is disabled or removed in production builds

## 6. Backup & Recovery

- [ ] Point-in-time recovery (PITR) is enabled in Supabase Dashboard > Database > Backups
- [ ] A manual backup has been taken immediately before the release:
      `supabase db dump --role-only --file backups/<date>-roles.sql`
      `supabase db dump --data-only --file backups/<date>-data.sql`
- [ ] Recovery procedure is documented (restore from backup, re-run migrations, verify row counts)
- [ ] PITR retention window is set to at least 7 days (longer for production)
- [ ] Backup files are stored outside the Supabase project (e.g., cloud storage, not git-lfs)

## 7. Seed Data

- [ ] `supabase/seed.sql` contains only idempotent inserts (`INSERT ... ON CONFLICT DO NOTHING`)
- [ ] Seed script does **not** delete, truncate, or overwrite existing user data
- [ ] Seed is scoped to reference/system data only (e.g., default categories, feature flags) — no fake user rows
- [ ] Running `supabase db reset` in production is **strictly forbidden** — seed is for local/preview only
- [ ] All seed statements explicitly check `WHERE NOT EXISTS (...)` before inserting

## 8. Migration Testing

- [ ] A preview/branch Supabase database was created: `supabase branch create release-check`
- [ ] All migrations applied cleanly on the preview branch with zero errors
- [ ] Key queries (`SELECT`, `INSERT`, `UPDATE` by `user_id`) execute correctly on the branch
- [ ] RLS policies were verified on the branch by authenticating as two different users and confirming data isolation
- [ ] App connected to the branch via `VITE_SUPABASE_URL` and all flows pass (login, data load, write)
- [ ] Branch was reset and migrations re-applied at least once to confirm idempotency
- [ ] Preview branch is deleted after verification: `supabase branch delete release-check`

## 9. Production vs Development Isolation

- [ ] Two **separate** Supabase projects exist: `nova-os-dev` and `nova-os-prod`
- [ ] Dev and prod use different `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values
- [ ] No migration has ever been run against production except through this checklist process
- [ ] `supabase/seed.sql` is excluded from prod deployment (no seed step in CI/CD pipeline)
- [ ] `.env` files (local dev) and Vercel environment variables (prod) reference different projects
- [ ] `supabase link --project-ref <prod-ref>` is only run during release, not during daily development
- [ ] CI/CD pipeline enforces that migrations only run against production after merge to `main`
- [ ] Production database URL is never hardcoded in any source file (verified by grep)
