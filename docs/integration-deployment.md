# Integration & Deployment Configuration

> Production setup for OAuth and webhook integrations.
> Backend: Express on Cloud Run (`server/`). Frontend: Vite React SPA on Vercel (`src/`).

---

## 1. Google OAuth

### Configuration (Google Cloud Console)

| Field | Value |
|-------|-------|
| Authorized JavaScript origins | `https://{VERCEL_DOMAIN}` |
| Authorized redirect URIs | `https://{CLOUD_RUN_URL}/auth/google/callback` |

### Scopes

Defined in `server/src/config.ts`:

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/tasks`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/documents`
- `https://mail.google.com/` (gmail.modify, gmail.send)
- `https://www.googleapis.com/auth/contacts`

### Required Environment Variables

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_TOKEN_ENCRYPTION_KEY=<32+ character string for AES-256-GCM>
```

### Token Encryption

`GOOGLE_TOKEN_ENCRYPTION_KEY` must be at least 32 characters long. Used as the AES-256-GCM key to encrypt refresh/access tokens before storing in `nova_user_docs` (`google_tokens` collection).

### Disconnect Process

```
POST https://{CLOUD_RUN_URL}/integrations/google/disconnect
Authorization: Bearer <user_jwt>
```

Server-side steps:
1. Decrypt and revoke the Google refresh token via Google's revocation endpoint.
2. Delete the token record from `nova_user_docs` (`google_tokens` collection).
3. Return `204 No Content`.

### Verification Procedure

1. From the app frontend at `https://{VERCEL_DOMAIN}`, initiate Google sign-in.
2. Confirm the redirect goes to `https://{CLOUD_RUN_URL}/auth/google/callback?code=...`.
3. After callback, verify the user's tokens are persisted in `nova_user_docs` where `collection_name = 'google_tokens'`.
4. Call a protected Google API endpoint (e.g., `GET /integrations/google/calendar/events`) and confirm a `200` response with data.
5. Call `POST /integrations/google/disconnect` with a valid JWT and confirm the token record is removed.
6. Attempt the same API call again — confirm it returns `401`.

---

## 2. Telegram Webhook

### Webhook URL

```
https://{CLOUD_RUN_URL}/telegram/webhook/{userId}?secret={TELEGRAM_WEBHOOK_SECRET}
```

### Registration

Via BotFather or the Telegram Bot API:

```bash
curl -X POST \
  "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://{CLOUD_RUN_URL}/telegram/webhook/{userId}?secret={TELEGRAM_WEBHOOK_SECRET}"
```

### Required Environment Variables

```
TELEGRAM_BOT_TOKEN=<bot token from BotFather>
TELEGRAM_WEBHOOK_SECRET=<arbitrary string, validated server-side on every incoming update>
TELEGRAM_ALLOWED_CHAT_IDS=<comma-separated list of numeric chat IDs>
```

### Security

- Every webhook request must include the `secret` query parameter, validated against `TELEGRAM_WEBHOOK_SECRET`.
- Only messages from chat IDs in `TELEGRAM_ALLOWED_CHAT_IDS` are processed; all others are silently ignored.

### Verification Procedure

1. Set the webhook via the curl command above.
2. Confirm the webhook is active: `curl "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo"` — the response should show `url` matching the Cloud Run endpoint.
3. Send a message to the bot from an allowed chat ID.
4. Check Cloud Run logs for the incoming webhook payload — confirm `200 OK` is returned.
5. Send a message from a non-allowed chat ID — confirm the request is received but dropped (check logs for "ignored" or similar).

---

## 3. WhatsApp (Meta Cloud API)

### Webhook URL

```
https://{CLOUD_RUN_URL}/whatsapp/webhook
```

### Meta App Dashboard Configuration

| Field | Value |
|-------|-------|
| Callback URL | `https://{CLOUD_RUN_URL}/whatsapp/webhook` |
| Verify token | `{WHATSAPP_VERIFY_TOKEN}` |
| Webhook fields | `messages` |

### Verification Handshake (GET)

Meta sends `hub.mode`, `hub.verify_token`, `hub.challenge` via GET to the webhook URL. The server responds with `hub.challenge` if `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`.

### Required Environment Variables

```
WHATSAPP_PHONE_NUMBER_ID=<Meta-provided phone number ID>
WHATSAPP_ACCESS_TOKEN=<Meta-provided access token for sending messages>
WHATSAPP_VERIFY_TOKEN=<arbitrary string, used in the verification handshake>
WHATSAPP_WEBHOOK_SECRET=<app secret from Meta App dashboard, validates x-hub-signature-256>
```

### Signature Validation

Every incoming POST is validated by computing `HMAC-SHA256(WHATSAPP_WEBHOOK_SECRET, requestBody)` and comparing it against the `x-hub-signature-256` header. Requests that fail validation are rejected with `401`.

### Verification Procedure

1. In the Meta App dashboard, set the Callback URL and Verify Token.
2. Click "Verify and save" — Meta sends a GET to `https://{CLOUD_RUN_URL}/whatsapp/webhook`; the server should return the challenge.
3. Confirm the webhook status shows "Active" in the Meta dashboard.
4. Send a WhatsApp message to the business phone number.
5. Check Cloud Run logs — confirm the incoming `messages` webhook payload is received and `200 OK` is returned.
6. Send a forged POST with an incorrect `x-hub-signature-256` — confirm the server returns `401`.

---

## 4. GitHub & Vercel

### Status

These integrations have **partial or no backend implementation** yet. Documented here for future reference.

### GitHub OAuth (future)

**Required env vars:**

```
GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
```

**Callback URL:** `https://{CLOUD_RUN_URL}/auth/github/callback`

**Scopes to request when implemented:**

- `repo` — full control of private repositories
- `workflow` — update GitHub Actions workflows
- `read:user` — read user profile

**Rotation:** Refresh tokens are not available in GitHub OAuth; rotate via the GitHub OAuth App settings page. Disconnect by revoking the token server-side via `DELETE /applications/{client_id}/grant` and deleting the record from `nova_user_docs`.

### Vercel Integration (future)

**Required env vars:**

```
VERCEL_TOKEN=<Vercel personal access token>
VERCEL_TEAM_ID=<optional, for team-scoped deploys>
```

**Scopes / actions:** Trigger deployments, read environment variables, list preview deployments.

**Disconnect:** Delete the Vercel token from environment variables and revoke via Vercel's access token settings page.

### Verification (when implemented)

- For GitHub: authenticate via the OAuth flow, call a test API (e.g., list repos), confirm data is returned, then disconnect and verify token revocation.
- For Vercel: call the Vercel API to list deployments with the configured token, confirm a `200` response, then remove the token and confirm `401`.
