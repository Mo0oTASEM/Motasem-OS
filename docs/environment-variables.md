# Motasem OS — Environment Variables Reference

## Frontend (VITE_ prefix)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | — | Supabase project URL (`https://<project>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | — | Supabase anon/publishable key |
| `VITE_API_BASE_URL` | No | `VITE_CLOUD_RUN_API_URL` | Backend API URL (Cloud Run or localhost) |
| `VITE_CLOUD_RUN_API_URL` | No | — | Fallback for `VITE_API_BASE_URL` |

## Backend — Required

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | — | Secret key (`sb_secret_...`) — replaces legacy service_role JWT (bypasses RLS, server-side only) |
| `APP_BASE_URL` | Yes | — | Frontend base URL (used for OAuth redirects, CORS fallback) |
| `GOOGLE_CLIENT_ID` | Yes | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | — | Google OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Yes | — | OAuth callback URL (`https://<host>/auth/google/callback`) |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Yes | — | AES-256 key for encrypting OAuth refresh tokens at rest |

## Backend — AI Provider

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | — | Gemini API key (embeddings + fallback text generation) |
| `HERMES_API_KEY` | No | — | Hermes API key (primary text generation agent) |
| `HERMES_BASE_URL` | No | — | Hermes API base URL |
| `HERMES_MODEL` | No | `hermes-3-llama-3.1-405b` | Hermes model name |

## Backend — Webhook

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | No | — | Shared secret for Telegram webhook verification |
| `TELEGRAM_ALLOWED_CHAT_IDS` | No | — | Comma-separated Telegram chat IDs allowed to interact |
| `WHATSAPP_PHONE_NUMBER_ID` | No | — | Meta Cloud API phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | No | — | Meta long-lived access token |
| `WHATSAPP_WEBHOOK_SECRET` | No | — | Meta app secret for webhook signature verification |
| `WHATSAPP_VERIFY_TOKEN` | No | — | Arbitrary token for WhatsApp webhook verification challenge |
| `WHATSAPP_ALLOWED_SENDERS` | No | — | Comma-separated phone numbers allowed to send messages |
| `GOOGLE_CALENDAR_WEBHOOK_URL` | No | — | Google Calendar push notification webhook URL |
| `GOOGLE_CALENDAR_WEBHOOK_SECRET` | No | — | Shared secret for calendar webhook authentication |

## Backend — Optional

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | No | `APP_BASE_URL` | Allowed CORS origin(s); comma-separated for multiple |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | No | `8080` | HTTP server port |
| `ALLOW_LOCAL_DEV_AUTH` | No | — | When `true`, enables `X-Nova-User-Id` header authentication (dev only) |
| `LOCAL_DEV_USER_ID` | No | — | Default user ID used when local dev auth bypass is active |
| `SUPABASE_PUBLISHABLE_KEY` | No | — | Anon key (used for health checks and server-side Supabase client init) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | No | — | Default Google Sheets spreadsheet ID for CRM export |
| `PAST_GOOGLE_SHEETS_IDS` | No | — | Comma-separated legacy spreadsheet IDs for data migration |

## Legacy (Firebase — no longer used)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | No | — | Firebase API key (legacy, replaced by Supabase) |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | — | Firebase auth domain (legacy, replaced by Supabase) |
| `VITE_FIREBASE_PROJECT_ID` | No | — | Firebase project ID (legacy, replaced by Supabase) |
