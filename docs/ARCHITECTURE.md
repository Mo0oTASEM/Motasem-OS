# Motasem OS — Architecture Audit

This document records the current project shape before new feature work. It is an audit of what exists today, not a redesign or implementation plan.

## Runtime Stack

- Frontend: React 19, TypeScript, Vite, lucide-react, Recharts.
- Backend: Express API with Firebase Admin/Auth helpers, Google APIs, Gemini SDK usage, Telegram webhook handling, and local JSON fallback storage.
- Persistence: browser `localStorage` / `sessionStorage` for the app prototype; Firestore plus `server/.nova-local` fallback for backend memory, sync state, and Google token state.
- Routing: no React Router. `src/App.tsx` owns `currentView`, stores shell state, and mirrors the active view into `window.location.hash`.

## Frontend Structure

- `src/App.tsx`: app shell, valid view registry, hash restore, command palette, slash commands.
- `src/context/AppContext.tsx`: core local models, seed data, localStorage hydration, CRUD actions.
- `src/components/Sidebar.tsx`: navigation, focus status, operator settings, browser-stored OpenAI/Anthropic keys.
- `src/components/Dashboard.tsx`: local executive dashboard.
- `src/components/NovaCore.tsx`: chat surface, local slash commands, direct browser OpenAI/Anthropic calls, simulated fallback.
- `src/components/ProjectManager.tsx`: local project CRUD, templates, task/assets UI.
- `src/components/Work.tsx`: Work Command Center for CRM, outreach, content, portfolio, Upwork, reports, Telegram simulation, approval logs, settings.
- `src/components/FinanceManager.tsx`: separate monthly JOD budget dashboard stored outside `AppContext.finances`.
- `src/components/SecondBrain.tsx`: local notes, memory graph preview, Google Sheets/contact import, brain Q&A.
- `src/components/FocusZone.tsx`: stopwatch/Pomodoro focus and old finance ledger billing.
- `src/features/*`: planner, mission control, journal, health, opportunities, time, strategist, integrations, and Work submodules.
- `src/lib/api/cloudRunClient.ts`: frontend API client for the backend.
- `src/lib/firebase/*`: Firebase client bootstrap and collection sync helper.
- `src/lib/uiPersistence.ts`: reusable local/session storage helpers.

## Views And Hash Routes

- `#/dashboard` -> `Dashboard`
- `#/copilot` -> `NovaCore`
- `#/projects` -> `ProjectManager`
- `#/crm` -> `Work`
- `#/finances` -> `FinanceManager`
- `#/wiki` -> `SecondBrain`
- `#/mission` -> `MissionControl`
- `#/planner` -> `DailyPlanner`
- `#/journal` -> `Journal`
- `#/health` -> `Health`
- `#/opportunities` -> `OpportunityRadar`
- `#/time` -> `TimeIntelligence`
- `#/strategist` -> `LifeStrategist`
- `#/integrations` -> `Integrations`
- `#/focus` -> `FocusZone`

## Context Models

`AppContext` defines and locally persists:

- `Project`, `ChecklistItem`, `ProjectAsset`
- `Client`
- `FinanceEntry`
- `WikiNote`
- `OSBaseEntity`
- `MemoryItem`, `MemoryEdge`
- `Goal`
- `CalendarEvent`
- `PlannerTask`
- `JournalEntry`
- `HealthEntry`
- `Opportunity`
- `TimeBlock`
- `AgentRun`
- `SyncState`
- `FocusSession`
- `AIConfig`

The Work Command Center also has feature-local models under `src/features/work/*` for leads, outreach, content, portfolio, Upwork, Telegram simulations, and automation approvals.

## Current Data Flow

Most user-facing flows are local-first:

- `AppContext` hydrates from browser storage and writes changes back through React effects.
- Several feature modules use `usePersistentState()` for view state, filters, active selections, and integration readiness.
- `FinanceManager` owns a newer monthly budget store separately from `AppContext.finances`.
- `NovaCore`, `App.tsx` slash commands, and `FocusZone` still write to older `AppContext` project/note/finance entities.
- `SecondBrain` and `Integrations` call `cloudRunClient` for backend API operations.
- Work UI services mostly return mock/UI-ready data; backend CRM endpoints exist but are not fully wired as the canonical Work store.

Backend data flow:

- Protected routes use `requireFirebaseUser` and `assertOwner`, with local-owner fallback when local dev auth is enabled.
- Google OAuth callback stores token/sync state in Firestore when possible, falling back to `server/.nova-local`.
- Memory services write to Firestore user collections or local JSON fallback.
- Google Sheets/CRM services operate through Google OAuth tokens and spreadsheet APIs.
- Gemini-backed services answer brain questions, run agents, and transcribe Telegram voice when configured.

## Browser Storage Keys

App shell:

- `nova_app_shell_state_v1`
- `nova_app_session_state_v1`

`AppContext`:

- `nova_projects`
- `nova_clients`
- `nova_finances`
- `nova_notes`
- `nova_memory_items`
- `nova_memory_edges`
- `nova_goals`
- `nova_calendar_events`
- `nova_planner_tasks`
- `nova_journal_entries`
- `nova_health_entries`
- `nova_opportunities`
- `nova_time_blocks`
- `nova_agent_runs`
- `nova_sync_states`
- `nova_focus`
- `nova_aiconfig`

Finance Manager:

- `nova_finance_monthly_dashboard_v2`
- `nova_finance_active_month_v1`
- `nova_finance_categories_open_v1`

Second Brain UI:

- `nova_brain_selected_note_v1`
- `nova_brain_active_category_v1`
- `nova_brain_edit_mode_v1`
- `nova_brain_search_v1`

Integrations UI:

- `nova_integrations_connected_user_v1`
- `nova_work_integration_statuses_v1`
- `nova_work_safety_settings_v1`
- `nova_integrations_services_v1`

Work Command Center uses `usePersistentState()` for local module state, filters, entities, drafts, approvals, and saved UI data. Treat all `nova_work_*` keys as local prototype state unless a later migration defines canonical backend storage.

## Backend Structure

- `server/src/index.ts`: Express app and route registration.
- `server/src/config.ts`: env config and Google OAuth scopes.
- `server/src/security/securityService.ts`: Firebase/local dev auth guards.
- `server/src/agents/agentOrchestrator.ts`: Gemini-backed agent runner.
- `server/src/services/firebaseAdmin.ts`: Firebase Admin collection access.
- `server/src/services/localDevStore.ts`: local JSON fallback store.
- `server/src/services/memoryService.ts`: memory ingest/search.
- `server/src/services/brainKnowledgeService.ts`: past Sheets/contact imports and brain Q&A.
- `server/src/services/googleWorkspaceService.ts`: OAuth URL/exchange and service sync placeholders.
- `server/src/services/googleSheetsDataService.ts`: Sheets export.
- `server/src/services/crmWorkspaceService.ts`: CRM spreadsheet, contacts, calendar, Gmail send helpers.
- `server/src/services/telegramVoiceService.ts`: Telegram webhook and voice ingest.
- `server/src/services/ai/*`: CRM AI helpers and Gemini proxy.

## Backend Endpoints

- `GET /health`
- `GET /auth/google/debug`
- `GET /auth/google/url`
- `GET /auth/google/callback`
- `POST /auth/google/callback`
- `POST /sync/google/full`
- `POST /sync/google/:service`
- `POST /sync/sheets/push`
- `POST /finance/apple-pay/import`
- `POST /sync/webhook/calendar`
- `POST /sync/webhook/gmail`
- `POST /telegram/webhook/:userId`
- `POST /memory/search`
- `POST /memory/ingest`
- `POST /brain/import/past-sheets`
- `POST /brain/import/contacts`
- `POST /brain/ask`
- `POST /crm/bootstrap`
- `GET /crm/snapshot`
- `POST /crm/sync`
- `POST /crm/activity`
- `POST /crm/contacts`
- `POST /crm/calendar/event`
- `POST /crm/gmail/send`
- `POST /crm/ai/draft`
- `POST /crm/ai/smart-reply`
- `POST /crm/ai/lead-score`
- `POST /crm/ai/suggestions`
- `POST /crm/ai/sequences`
- `POST /crm/ai/meeting-brief`
- `POST /crm/ai/deal-health`
- `POST /crm/ai/inbox-triage`
- `POST /crm/ai/enrichment`
- `POST /crm/ai/command-bar`
- `POST /agents/run`
- `POST /agents/briefing`
- `POST /reports/weekly`
- `POST /reports/monthly`
- `POST /automations/run`

## Integrations

Google/Firebase:

- Firebase client config is read from `VITE_FIREBASE_*` env variables.
- Frontend `cloudRunClient` sends Firebase ID tokens when available and falls back to `X-Nova-User-Id: local-owner`.
- Google OAuth scopes include Calendar events, Tasks, Sheets, Drive file, Docs, Gmail modify/send, and Contacts.
- Google OAuth tokens must remain server-side. Local fallback token files under `server/.nova-local` are sensitive local artifacts.

Gemini:

- Backend config reads `GEMINI_API_KEY`.
- Gemini is currently used by the agent orchestrator, brain Q&A, Telegram transcription, and CRM AI helper/proxy code.
- There is no Hermes provider or central `/ai/command` route yet.

Telegram:

- Backend config reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`.
- Current webhook route is `POST /telegram/webhook/:userId`.
- Current backend service focuses on voice ingest; Work UI includes local command simulation.

CRM/Gmail/Calendar/Contacts:

- Backend CRM service can create/read CRM spreadsheets, append activity, create Google Contacts, create Calendar events, and send Gmail.
- Gmail send is currently a direct backend action and is not guarded by a backend approval policy.

## Sensitive Files And Git Hygiene

Do not commit:

- `.env`, `.env.*`, `server/.env`, `server/.env.*`
- `server/.nova-local/` or `.nova-local/`
- Google OAuth token JSON and sync state JSON
- Firebase generated debug/runtime files
- local logs such as `vite-dev.log`, `vite-dev.err.log`, `server-api.log`, `server-api.err.log`
- generated caches, coverage, and TypeScript build info

The current worktree already contains many modified/deleted local `.nova-local` files. Do not stage or commit them as part of normal feature work.

## Known Missing Features

- Central Hermes brain service and `/ai/command`.
- Unified context builder and tool/action registry.
- Backend approval enforcement for high-risk actions.
- Canonical database schema/migrations for goals, CRM, finance, projects, tasks, and approvals.
- Real Work UI persistence into backend CRM APIs.
- Clear model routing where Hermes is the main planner and Gemini is the second brain.
- Vector memory/search despite vector-ready fields in context models.
- Production secret management for model keys and OAuth refresh tokens.
- Finance model consolidation between old `AppContext.finances` and the new monthly budget dashboard.
- Universal route/page metadata registry for AI context gathering.
- Full Telegram text commands, chat allowlist, and remote approval flow.
- Production-grade auth, rate limits, audit logs, and connector monitoring.
