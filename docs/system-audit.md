# Motasem OS — System Audit

## 1. Repository Architecture

```
nova-os/
├── src/                    # React 19 + Vite 8 + TypeScript 6 frontend (SPA)
│   ├── App.tsx             # Shell: hash router, cmd palette, auth guards
│   ├── main.tsx            # Entry: renders App or OAuthConsent
│   ├── index.css           # Global glassmorphism styles
│   ├── config/
│   │   └── branding.ts     # Centralized branding config (new)
│   ├── components/         # Page-level components (12 files)
│   ├── context/
│   │   ├── AppContext.tsx   # Global state (React Context + batch Supabase writes)
│   │   └── useApp.ts       # Context consumer hook
│   ├── features/           # Feature modules (11 directories)
│   │   ├── character/      # Character OS v2 (full domain model)
│   │   ├── planner/        # Full planning system
│   │   ├── work/           # Work Command Center (CRM, outreach, portfolio, Upwork, jobs)
│   │   ├── integrations/   # Integration control panel
│   │   ├── health/         # Health/energy display
│   │   ├── journal/        # Daily reflection
│   │   ├── strategist/     # Strategic advice
│   │   ├── mission-control/ # SMART goal planning
│   │   ├── opportunities/  # Opportunity scoring
│   │   ├── time/           # Time analysis
│   │   └── reports/        # Reporting
│   ├── lib/
│   │   ├── supabase/       # Supabase browser client
│   │   ├── ai/             # Local deterministic intelligence
│   │   ├── api/            # API client (cloudRunClient)
│   │   ├── env/            # Env validation
│   │   ├── firebase/       # Empty stubs (legacy)
│   │   ├── integrationStatus/ # Canonical status model
│   │   └── uiPersistence.ts # localStorage/sessionStorage hooks
│   └── pages/
│       └── OAuthConsent.tsx # OAuth consent page
├── server/                 # Express 5 backend (TypeScript)
│   ├── src/
│   │   ├── index.ts        # Express app: 70+ routes
│   │   ├── config.ts       # Env config + integration health checks
│   │   ├── agents/         # 8 agent roles
│   │   ├── channels/       # Telegram, WhatsApp, web chat adapters
│   │   ├── routes/         # CRM and planner route modules
│   │   ├── security/       # JWT verification + local dev bypass
│   │   └── services/       # 27+ service modules
│   ├── routes/             # Legacy JS routes (character, coach, dopamine)
│   └── lib/                # Legacy JS libs (supabase, llm)
├── supabase-schema.sql     # Canonical DB schema
├── supabase/               # Migration directory (mostly empty)
├── public/
│   ├── favicon.svg         # SVG favicon
│   └── icons.svg           # Social icon sprites
├── vercel.json             # Vercel SPA deployment
├── package.json            # Frontend dependencies & scripts
└── docs/                   # Documentation
```

## 2. Frontend-to-Backend Request Flow

```
Browser → Vite Dev Server (port 5173) → cloudRunClient.ts → Backend API (port 4000/8080)
                                                                    ↓
                                                          Express routes → Services → Supabase
```

- API client: `src/lib/api/cloudRunClient.ts`
- Auth header: Bearer token from Supabase session + `X-Nova-User-Id` header
- CORS: Backend validates `origin` against `CORS_ORIGIN` env var
- All data routes require `requireSupabaseUser` middleware

## 3. Authentication Flow

```
User opens app → Supabase getSession() → session exists? → render app
                                         → no session? → AuthScreen (Google OAuth)
                                         → dev bypass? → localStorage mock user
```

- Primary: Supabase Google OAuth via `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Dev bypass: `localStorage.nova_dev_user_bypass` with JSON user object
- Session state: React Context (`AppContext`)
- Server auth: JWT verification via Supabase Admin API

## 4. Hermes AI Request Flow

```
Frontend (/ai/command) → cloudRunClient → POST /ai/command
    → brainRouter.ts → intentDetector.ts → hermesProvider.ts
        → Hermes API (configured via HERMES_BASE_URL + HERMES_API_KEY)
        → Parse Zod output schema
        → Return structured response
```

- Primary AI provider
- 3 retries with timeout
- Typed Zod output schemas
- Context builder gathers user data before requests

## 5. Gemini Fallback Flow

```
hermesProvider.ts fails (all retries exhausted)
    → geminiProvider.ts (fallback)
        → Gemini API (configured via GEMINI_API_KEY)
        → Task-specific system instructions
        → Return structured response
```

- Fallback only for text generation
- Primary provider for embeddings (vector search)
- Second brain (`/ai/second-brain`) uses Gemini
- Configured in AI_ROUTING.md

## 6. Supabase Data Flow

```
Read:   AppContext → supabase.from('nova_user_docs').select() → grouped by collection_name → setState
Write:  queueWrite() → microtask batch → supabase.from('nova_user_docs').upsert()
Delete: Direct supabase.from('nova_user_docs').delete() call
```

- Single table: `nova_user_docs` with PK `(user_id, collection_name, doc_id)`
- Payload column stores JSON documents
- RLS scoped to `auth.uid()`
- Service role for backend operations

## 7. Google OAuth Flow

```
Frontend → GET /auth/google/url → returns Google OAuth URL (with state=userId)
User authorizes → redirected to GET /auth/google/callback
    → exchangeGoogleCode() → tokens stored encrypted in Secret Manager
    → Sync state written to nova_user_docs
```

- Scopes: calendar, tasks, sheets, drive, docs, gmail, contacts
- Redirect URI: configured via GOOGLE_REDIRECT_URI
- Separate flow for Planner Google Calendar

## 8. Messaging Webhook Flow

### Telegram
```
POST /telegram/webhook/:userId?secret=...
    → telegramAdapter.ts → telegramCommandService.ts
    → Parse commands (/todo, /note, /idea, etc.)
    → Respond with status
```

### WhatsApp
```
GET /whatsapp/webhook → Verification (hub.challenge)
POST /whatsapp/webhook → HMAC signature verification
    → whatsappAdapter.ts → handleWhatsAppWebhookMessage()
```

## 9. Integration Status Flow

```
GET /integrations/health → requireSupabaseUser → getDynamicIntegrationHealth(userId)
    → connectionStatusService.ts + integrationSettingsService.ts
    → Returns status per integration (connected/disconnected/error/missing_env)
```

Frontend: `IntegrationStatusBadge` from `src/components/system/States.tsx`
Canonical statuses in `src/lib/integrationStatus/shared.ts`

## 10. Background Sync Flow

```
POST /sync/google/full (manual trigger)
    → syncGoogleService() for each service (calendar, tasks, sheets, drive, docs, gmail, contacts)
POST /sync/google/:service (single service)
POST /sync/webhook/calendar (webhook - NOT IMPLEMENTED, returns 501)
POST /sync/webhook/gmail (webhook - stub, returns accepted)
```

- No scheduled/background sync jobs implemented
- Google Calendar push channels not deployed

## 11. Deployment Architecture

```
Frontend: Vercel (SPA, /* → /index.html)
  Build: npm run build (tsc -b && vite build)
  Output: dist/

Backend: Google Cloud Run (Docker)
  Build: tsc → node dist/index.js
  Port: 8080
  Dockerfile: server/Dockerfile

Database: Supabase PostgreSQL
  Tables: nova_user_docs, planner tables, CRM tables
```

## 12. Complete Environment Variable Inventory

### Frontend (VITE_ prefix)
| Variable | Required | Description |
|----------|----------|-------------|
| VITE_SUPABASE_URL | Yes | Supabase project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Yes | Supabase publishable key |
| VITE_API_BASE_URL | No | Backend API URL (defaults to empty) |

### Backend
| Variable | Required | Purpose |
|----------|----------|---------|
| PORT | No | Server port (default 8080) |
| NODE_ENV | No | Environment (development/production) |
| APP_BASE_URL | Yes | Frontend base URL for CORS/redirects |
| CORS_ORIGIN | No | Allowed origins (default: localhost:5173) |
| ALLOW_LOCAL_DEV_AUTH | No | Dev auth bypass (default: true) |
| LOCAL_DEV_USER_ID | No | Dev user UUID |
| SUPABASE_URL | Yes | Supabase project URL |
| SUPABASE_PUBLISHABLE_KEY | Yes | Supabase publishable key |
| SUPABASE_SERVICE_KEY | Yes | Service role JWT |
| GEMINI_API_KEY | No | Gemini fallback AI key |
| HERMES_API_KEY | No | Hermes primary AI key |
| HERMES_BASE_URL | No | Hermes API base URL |
| HERMES_MODEL | No | Hermes model name |
| GOOGLE_CLIENT_ID | Yes | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Yes | Google OAuth client secret |
| GOOGLE_REDIRECT_URI | Yes | OAuth redirect callback |
| GOOGLE_TOKEN_ENCRYPTION_KEY | Yes | Token encryption key (32+ chars) |
| GOOGLE_CALENDAR_WEBHOOK_URL | No | Calendar push webhook URL |
| GOOGLE_CALENDAR_WEBHOOK_SECRET | No | Calendar webhook secret |
| GOOGLE_SHEETS_SPREADSHEET_ID | No | Sheets spreadsheet ID |
| PAST_GOOGLE_SHEETS_IDS | No | Past sheets IDs |
| TELEGRAM_BOT_TOKEN | No | Telegram bot token |
| TELEGRAM_WEBHOOK_SECRET | No | Telegram webhook secret |
| TELEGRAM_ALLOWED_CHAT_IDS | No | Allowed Telegram chat IDs |
| WHATSAPP_PHONE_NUMBER_ID | No | WhatsApp phone number ID |
| WHATSAPP_ACCESS_TOKEN | No | WhatsApp access token |
| WHATSAPP_WEBHOOK_SECRET | No | WhatsApp app secret |
| WHATSAPP_VERIFY_TOKEN | No | Webhook verify token |
| WHATSAPP_ALLOWED_SENDERS | No | Allowed sender phone numbers |
| FIREBASE_PROJECT_ID | No | Firebase project (legacy) |
| FIREBASE_CLIENT_EMAIL | No | Firebase client email (legacy) |
| FIREBASE_PRIVATE_KEY | No | Firebase private key (legacy) |

## 13. Known Risks

| Risk | Severity | Description |
|------|----------|-------------|
| Dev bypass in production | P0 | `localStorage.nova_dev_user_bypass` allows auth bypass in DEV mode; if `import.meta.env.DEV` is misconfigured, production users could bypass auth |
| Firebase legacy stubs | P1 | Firebase libraries referenced but all stubs are empty; if called, they silently fail |
| Google Calendar push channels | P2 | Returns 501; no sync webhook implementation |
| Gmail webhook stub | P2 | Returns `{ accepted: true }` without processing |
| Memory tool executor | P2 | Partial tool implementations in toolExecutor.ts |
| Upwork/Telegram work features | P2 | Marked as `mock` and `placeholder` - not real integrations |
| Server-side env in .env.example | P2 | Env template committed without placeholders for secrets |
| Local dev auth bypass header | P2 | `X-Nova-User-Id` header bypasses auth in dev mode |
| server/.env with real credentials | P0 | Committed SUPABASE_SERVICE_KEY in git-tracked .env file |

## 14. Broken or Incomplete Features

| Feature | Status | Issue |
|---------|--------|-------|
| Google Calendar push webhook | ❌ Not implemented | Returns 501 |
| Gmail push webhook | ❌ Stub | Returns `{ accepted: true }` |
| Upwork integration | ❌ Mock only | Real RSS/API integration not implemented |
| Telegram bot (work feature) | ❌ Mock only | Uses fuzzy matching + mock results |
| WhatsApp Business | ⚠️ Partial | Webhook verification and message handling in place but untested |
| Firebase → Supabase migration | ❌ Incomplete | Firebase stubs empty, docs reference Firestore |
| Background sync jobs | ❌ Not implemented | No cron/scheduled tasks |
| Server-side Google OAuth exchange | ⚠️ Partial | POST route accepts code but returns placeholder |
| Finance → Apple Pay import | ⚠️ Partial | Pipeline endpoints defined but store not integrated |
| Automations | ❌ Stub | POST /automations/run returns queued status |
| Reports weekly/monthly | ⚠️ Partial | Uses hardcoded agent prompts |
| Legacy JS routes (character, coach, dopamine) | ⚠️ Orphaned | Both old JS and new TS implementations exist |

## 15. Security Concerns

| Issue | Severity | File | Description |
|-------|----------|------|-------------|
| SUPABASE_SERVICE_KEY in git | P0 | server/.env | Service role JWT committed to git |
| Dev bypass in production builds | P0 | src/context/AppContext.tsx | `import.meta.env.DEV` guard may not be reliable |
| X-Nova-User-Id spoofing | P1 | server/src/security/securityService.ts | Dev mode bypass allows any userId |
| No rate limiting | P2 | All routes | No rate limiting on API endpoints |
| Zod error details in production | P2 | server/src/index.ts | Error details exposed when NODE_ENV is not 'production' |
| OpenAI/Anthropic keys in localStorage | P3 | Sidebar.tsx | Legacy UI mentions key entry (currently disabled) |

## 16. Production Blockers

| Blocker | Priority | Description |
|---------|----------|-------------|
| SUPABASE_SERVICE_KEY exposed in git | P0 | Must revoke and rotate the service key |
| `server/.env` tracked by git | P0 | Secrets committed to repository |
| Firebase stubs with no migration complete | P1 | Firestore references will fail silently |
| Auth bypass in dev mode could leak to prod | P1 | Remove or gate behind strict check |
| Mock data in production paths | P2 | CRM seed data, Upwork mock data loaded as defaults |
| Legacy JS files in server/routes/ | P2 | Dead code, potential confusion |
| No comprehensive test suite | P2 | Only character coach and channel adapter tests exist |
| Build may fail due to strict TS config | P1 | verbatimModuleSyntax, noUnusedLocals, erasableSyntaxOnly |

## 17. Recommended Fix Order

1. **P0**: Remove server/.env from git, rotate exposed service key
2. **P0**: Fix dev bypass to never run in production
3. **P1**: Branding rename (Motasem OS) across all visible surfaces
4. **P1**: Fix TypeScript build issues
5. **P2**: Remove/isolate mock data from production paths
6. **P2**: Clean up Firebase stubs
7. **P2**: Add rate limiting
8. **P2**: Remove legacy JS server files or migrate to TS
9. **P3**: Update documentation
10. **P3**: Add tests

---

## Issue Classification

- **P0**: Security issue, data corruption risk, app cannot build, deployment blocker
- **P1**: Major feature failure or serious production reliability issue
- **P2**: Incorrect UX, incomplete integration, performance problem, maintainability risk
- **P3**: Cleanup, polish, documentation, low-risk improvement

*Generated: 2026-06-20*
