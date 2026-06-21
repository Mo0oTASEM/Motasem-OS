# Motasem OS Rollback

## Frontend (Vercel)

Vercel automatically retains all previous deployments. To roll back:

1. Go to [Vercel Dashboard](https://vercel.com) → Project → Deployments
2. Find the last known-good deployment
3. Click the context menu (`...`) → **Promote to Production**

Or via CLI:
```bash
vercel rollback
```

## Backend (Cloud Run)

Cloud Run keeps previous revisions for the configured revision retention period.

```bash
# List revisions
gcloud run revisions list --service motasem-os-api --region us-west1

# Route 100% traffic to a specific revision
gcloud run services update-traffic motasem-os-api \
  --to-revisions={REVISION_NAME}=100 \
  --region us-west1
```

Alternatively, redeploy with a previous Docker image tag:
```bash
gcloud run deploy motasem-os-api \
  --image gcr.io/{PROJECT_ID}/motasem-os-api:{PREVIOUS_TAG} \
  --region us-west1
```

## Database (Supabase)

- **Point-in-time recovery (PITR):** Available on Pro plan and above. Retention depends on plan tier (7 days Pro, 30 days Team).
- **Migration rollback:** If a migration was just applied, apply the corresponding DOWN migration (if available) to revert schema changes.
- **Backup restore:** For data corruption or catastrophic issues, restore from a Supabase backup:
  - Database → Backups → Restore (takes project offline during restore)

## Rollback Decision Matrix

| Scenario | Action |
|----------|--------|
| Bad frontend deployment (UI bugs, build failure) | Roll back Vercel only |
| Bad backend deployment (API errors, crashes) | Roll back Cloud Run only |
| Bad database migration (schema breakage) | Run DOWN migration or restore from backup |
| Data corruption (accidental delete, bad write) | Restore DB from backup + redeploy both frontend and backend |
| Security incident (exposed key, compromised dependency) | Rotate secrets + redeploy both + restore DB if needed |
| Integration broken (OAuth, webhook) | Roll back backend + reconfigure integration settings |
| Partial outage (some endpoints failing) | Roll back Cloud Run; investigate database independently |
