# Nova OS Architecture

Nova OS is an AI-native personal operating system for a creator, freelancer, entrepreneur, motion graphics designer, and game developer.

## Runtime
- React/Vite frontend for the operating surface.
- Cloud Run Node API for trusted integrations, OAuth, Gemini calls, automations, and sync.
- Firebase Auth, Firestore, Storage, and Hosting for identity, memory, files, and deployment.

## Memory
All synced and user-created data is normalized into user-scoped Firestore collections under `users/{userId}`. The shared memory model covers ideas, notes, voice captures, client conversations, journal entries, goals, decisions, projects, and tasks.

Frontend localStorage remains an offline bootstrap/fallback. Production sync should migrate local records into Firestore after authentication.

## AI
Gemini powers:
- Agent reasoning.
- Daily briefings.
- Report generation.
- Embeddings for semantic search.

The frontend also includes deterministic intelligence selectors so the dashboard, planner, finance, CRM, and strategist pages remain useful when Gemini is not configured.

## Google Sync
Cloud Run owns Google OAuth and calls Google APIs. The frontend never stores refresh tokens.

Supported services:
- Calendar
- Tasks
- Sheets
- Drive
- Docs
- Gmail
- People/Contacts

## Agents
All agents share one memory system:
- Chief of Staff
- Business Strategist
- Project Manager
- CRM Manager
- Finance Analyst
- Game Studio Advisor
- Motion Graphics Advisor
- Life Strategist

## Security
- Firebase ID token required on protected Cloud Run routes.
- Firestore and Storage rules restrict documents/files to `request.auth.uid`.
- Google refresh tokens and Gemini keys belong in Secret Manager or encrypted server storage.
- Destructive Google sync should use soft-delete reconciliation before permanent deletion.
