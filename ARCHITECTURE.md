# Nova OS Architecture

Nova OS is an AI-native personal operating system for a creator, freelancer, entrepreneur, motion graphics designer, and game developer.

## Runtime
- React 19 + Vite 8 + TypeScript 6 frontend served as SPA (Vercel, `/*` → `/index.html`)
- Node.js Express backend (`server/`) for trusted integrations, OAuth, AI calls, automations, and sync
- Supabase for auth (`auth.uid()`), persistent data (`nova_user_docs` table + dedicated tables), and RLS
- All AI communication routes through the authenticated backend — no keys in the browser

## Memory
All user data is normalized into `nova_user_docs` with PK `(user_id, collection_name, doc_id)`. RLS scoped to `auth.uid()`. The shared memory model covers ideas, notes, voice captures, client conversations, journal entries, goals, decisions, projects, and tasks. A batched write queue in AppContext handles upserts via microtask.

Channel messages live in a dedicated `channel_messages` table; audit logs live in `audit_logs`; AI conversations in `ai_conversations`/`ai_messages`.

## AI
Nova OS uses a two-tier AI architecture:
- **Hermes** (primary) — all text generation: agent reasoning, daily briefings, report generation, character coaching, channel responses
- **Gemini** (fallback) — text generation when Hermes is unavailable; also powers embeddings via `text-embedding-004`

The `aiGateway` (server/src/services/ai/aiGateway.ts) abstracts both providers behind a unified interface. Embeddings always go through Gemini since Hermes doesn't support them.

The frontend includes deterministic intelligence selectors so dashboard, planner, finance, CRM, and strategist pages remain useful when no AI is configured.

## Tool Registry
The backend exposes **46 domain tools** across 20 module owners (character, brain, workspace, channel, analytics, automation, notes, contacts, documents, social, planner, crm, finance, strategist, email, calendar, habits, identity, health, projects). Each tool has a typed Zod schema, risk level, and execute handler. Tools are registered in `toolRegistry.ts` and listed in the Hermes system prompt.

## Channels
Multi-channel input is normalized through a unified `channelRouter`:
- **Telegram** — webhook at `/telegram/webhook` with slash commands as fast paths, non-commands through Hermes
- **WhatsApp** — Meta Cloud API v21.0 webhook at `/whatsapp/webhook` with HMAC signature validation and sender allowlisting
- **Web Chat** — in-app bridge for the character coach and AI assistant

## Google Sync
Backend owns Google OAuth and calls Google APIs. The frontend never stores refresh tokens.

Supported services:
- Calendar
- Tasks
- Sheets
- Drive
- Docs
- Gmail
- People/Contacts

## Security
- Supabase JWT required on protected routes; `X-Nova-User-Id` header for dev bypass (Supabase JWT or locale)
- RLS on all Supabase tables restricts data to `auth.uid()`
- Google refresh tokens and AI API keys stay in server environment or encrypted storage
- Destructive Google sync uses soft-delete reconciliation before permanent deletion
- Telegram/WhatsApp webhooks use shared secrets and IP allowlisting
