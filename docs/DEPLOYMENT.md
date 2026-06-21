# Motasem OS Deployment

## Architecture

```
Browser → Vercel (SPA) → Cloud Run API (Express) → Supabase (PostgreSQL + Auth)
                                                      ↕
                                            Google APIs (OAuth)
```

## A. Supabase Preparation

1. Create a Supabase project (separate prod/dev projects recommended)
2. Run migrations in order:
   - `supabase-schema.sql` — core `nova_user_docs` table with RLS
   - `server/db/schema.sql` — core storage (`nova_user_docs`, `nova_records`)
   - `server/db/character-schema.sql` — Character OS tables (6 tables)
   - `server/db/planning-schema.sql` — Planning system (14 enums, 27 tables)
3. Enable Google OAuth provider:
   - Supabase Dashboard → Authentication → Providers → Google
   - Copy Client ID + Secret from Google Cloud Console
   - Set auth callback URL: `https://<project>.supabase.co/auth/v1/callback`
4. Verify RLS policies — all tables use `auth.uid()` for row-level security
5. Add additional redirect URIs under Authentication → Providers → Google → Authorized redirect URIs

## B. Cloud Run Backend Deployment

```bash
cd server

# 1. Build and push Docker image
gcloud builds submit --tag gcr.io/{PROJECT_ID}/motasem-os-api

# 2. Deploy to Cloud Run
gcloud run deploy motasem-os-api \
  --image gcr.io/{PROJECT_ID}/motasem-os-api \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --memory 512Mi
```

### Recommended settings
| Setting | Value |
|---------|-------|
| Minimum instances | 0 (scale to zero) |
| Memory | 512Mi |
| CPU | 1 vCPU (default) |
| Concurrency | 80 |
| Timeout | 300s |
| Max instances | 10 (adjust based on load) |

## C. Cloud Run Environment Variables

### Database
| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (bypasses RLS) |

### Core
| Variable | Required | Purpose |
|----------|----------|---------|
| `APP_BASE_URL` | Yes | Frontend base URL for redirects (e.g. `https://motasemos.vercel.app`) |
| `NODE_ENV` | No | `production` for deployment (default: `development`) |
| `PORT` | No | Server port (default: `8080`) |
| `CORS_ORIGIN` | No | Override CORS allowed origin (defaults to `APP_BASE_URL`) |

### Google OAuth
| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | OAuth callback URL (`https://<cloud-run-url>/auth/google/callback`) |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Yes | AES-256 key for encrypting OAuth refresh tokens |

### AI Providers
| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | No | Gemini API key (embeddings + fallback text generation) |
| `HERMES_API_KEY` | No | Hermes API key (primary text generation) |
| `HERMES_BASE_URL` | No | Hermes API base URL |
| `HERMES_MODEL` | No | Hermes model name (default: `hermes-3-llama-3.1-405b`) |

### Telegram
| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | No | Bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | No | Shared secret for webhook verification |
| `TELEGRAM_ALLOWED_CHAT_IDS` | No | Comma-separated chat IDs allowed to interact |

### WhatsApp
| Variable | Required | Purpose |
|----------|----------|---------|
| `WHATSAPP_PHONE_NUMBER_ID` | No | Meta Cloud API phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | No | Long-lived access token |
| `WHATSAPP_WEBHOOK_SECRET` | No | App secret for signature verification |
| `WHATSAPP_VERIFY_TOKEN` | No | Arbitrary string for webhook verification |
| `WHATSAPP_ALLOWED_SENDERS` | No | Comma-separated phone numbers allowed |

### Security
| Variable | Required | Purpose |
|----------|----------|---------|
| `ALLOW_LOCAL_DEV_AUTH` | No | Enable `X-Nova-User-Id` header auth (dev only) |
| `LOCAL_DEV_USER_ID` | No | Default user ID for local dev auth bypass |

### Google Calendar Webhook
| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_CALENDAR_WEBHOOK_URL` | No | Calendar push notification webhook URL |
| `GOOGLE_CALENDAR_WEBHOOK_SECRET` | No | Calendar webhook shared secret |

### Google Sheets
| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | No | Default spreadsheet ID for CRM export |
| `PAST_GOOGLE_SHEETS_IDS` | No | Comma-separated legacy sheet IDs for migration |

## D. Backend URL Verification

```bash
# Health check
curl https://<cloud-run-url>/health
# Expected: {"ok":true,"service":"nova-os-api","environment":"production","configOk":true,...}

# Readiness check
curl https://<cloud-run-url>/ready
# Expected: {"ok":true,"status":"ready",...}

# CORS check
curl -H "Origin: https://<vercel-domain>" -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://<cloud-run-url>/health
# Expected: 200 with Access-Control-Allow-Origin header
```

## E. Vercel Frontend Setup

1. Import Git repository into Vercel
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variables:
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key
   - `VITE_API_BASE_URL` — Cloud Run API URL
6. Rewrites (vercel.json or Vercel UI):
   ```json
   { "source": "/(.*)", "destination": "/index.html" }
   ```

## F. CORS Update

Set `CORS_ORIGIN` on Cloud Run to the Vercel production domain:

```bash
gcloud run deploy motasem-os-api --image gcr.io/{PROJECT_ID}/motasem-os-api \
  --set-env-vars="CORS_ORIGIN=https://motasemos.vercel.app" \
  --region us-west1
```

Multiple origins can be comma-separated: `https://motasemos.vercel.app,http://localhost:5173`

## G. OAuth Callback Setup

### Google Cloud Console
- APIs & Services → Credentials → OAuth 2.0 Client
- Add to Authorized redirect URIs:
  - `https://<cloud-run-url>/auth/google/callback`
  - `https://<cloud-run-url>/planner/google-calendar/oauth/callback`

### Supabase
- Authentication → Providers → Google
- Add to Authorized redirect URIs:
  - `https://<vercel-domain>/**` (catch-all for frontend callback handling)

## H. Telegram Webhook Setup

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<cloud-run-url>/telegram/webhook/<USER_ID>?secret=<TELEGRAM_WEBHOOK_SECRET>"
```

Verify:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## I. WhatsApp Webhook Setup

1. Meta App Dashboard → WhatsApp → Configuration
2. Set callback URL: `https://<cloud-run-url>/whatsapp/webhook`
3. Set verify token: match `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to `messages` webhook field
5. Verify the webhook returns `hub.challenge` on GET verification

## J. Post-Deployment Smoke Tests

- [ ] `GET /health` returns 200 with `configOk: true`
- [ ] `GET /ready` returns 200
- [ ] Frontend loads at Vercel URL without console errors
- [ ] Supabase auth — Google login redirects and returns
- [ ] Create a `nova_user_docs` record via API
- [ ] `GET /integrations/health` returns all integration statuses
- [ ] `GET /auth/google/url` returns OAuth URL
- [ ] Gemini embeddings via memory search endpoint
- [ ] Telegram webhook responds to test message
- [ ] WhatsApp webhook verification challenge succeeds
- [ ] Frontend API calls reach Cloud Run (check CORS)
- [ ] Dashboard displays data from Supabase
- [ ] Character Coach endpoint returns a response
- [ ] Agent run completes without timeout
- [ ] Rate limiting returns 429 after excessive requests

## K. Rollback Procedure

See [ROLLBACK.md](./ROLLBACK.md) for detailed steps.

**Quick reference:**
- **Frontend:** Vercel Dashboard → Deployments → Promote previous
- **Backend:** `gcloud run services update-traffic motasem-os-api --to-revisions={REVISION}=100`
- **Database:** Point-in-time recovery or run DOWN migration
