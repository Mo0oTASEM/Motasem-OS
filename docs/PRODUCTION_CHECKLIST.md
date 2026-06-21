# Motasem OS — Production Checklist

## Frontend Build Verification
- [ ] `npm run build` completes with zero TypeScript errors
- [ ] `npm run lint` passes with no warnings
- [ ] `npm test` passes all unit tests
- [ ] `dist/` output is under 2 MB (gzipped)
- [ ] All VITE_ env vars are set in Vercel project dashboard

## Backend Build Verification
- [ ] `cd server && npm run build` compiles without errors
- [ ] `npm test` in `server/` passes all tests
- [ ] Docker image builds and starts (`docker build -t motasem-os-api . && docker run -p 8080:8080 motasem-os-api`)
- [ ] `GET /health` returns 200 with `configOk: true`
- [ ] `GET /ready` returns 200 with `status: "ready"`
- [ ] All 7 required env vars are set on Cloud Run (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `APP_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`)
- [ ] `min-instances: 0` and `memory: 512Mi` are configured
- [ ] Logs show clean startup with no `[FATAL]` messages

## Database Verification
- [ ] All migration SQL files have been applied to Supabase
- [ ] `nova_user_docs` table exists with RLS policies enabled
- [ ] Character OS tables exist (6 tables from `character-schema.sql`)
- [ ] Planning schema tables exist (27 tables from `planning-schema.sql`)
- [ ] Supabase Google OAuth provider is enabled with correct Client ID/Secret

## Security Verification
- [ ] RLS policies are active on all user-data tables
- [ ] `SUPABASE_SERVICE_KEY` is only used server-side (never in frontend)
- [ ] `GOOGLE_CLIENT_SECRET` and `GOOGLE_TOKEN_ENCRYPTION_KEY` are set on Cloud Run only
- [ ] Rate limiting is active (100 req/15min for auth, 300 req/15min general)
- [ ] `helmet` middleware is loaded with default headers
- [ ] `.env`, `.env.local`, `server/.env`, `.nova-local/` are in `.gitignore`

## Integration Configuration
- [ ] `CORS_ORIGIN` on Cloud Run matches Vercel production domain
- [ ] Google OAuth redirect URIs added in Google Cloud Console
- [ ] Supabase Auth redirect URIs include production Vercel URL
- [ ] `VITE_API_BASE_URL` points to Cloud Run URL
- [ ] Telegram bot webhook is set and verified via `getWebhookInfo`
- [ ] WhatsApp webhook callback URL is configured in Meta App Dashboard

## Deployment
- [ ] Cloud Run service is deployed with `--allow-unauthenticated`
- [ ] Vercel rewrites `/*` → `/index.html` are configured
- [ ] `vercel.json` exists with SPA rewrites or configured in dashboard
- [ ] Google Cloud Build triggers are set for automated deploys (optional)

## Post-Deployment
- [ ] Frontend loads at production URL without console errors
- [ ] Google login flow completes end-to-end (redirect → consent → callback → connected)
- [ ] At least one API call from frontend to Cloud Run succeeds
- [ ] Telegram bot responds to a test message
- [ ] `GET /integrations/health` shows all expected integrations as `configured` or `connected`
