# Motasem OS — Feature Verification Matrix

Generated: 2026-06-20

## Legend

| Column | Meaning |
|--------|---------|
| UI verified | Component renders, states handled (loading/empty/error/auth) |
| API verified | Backend endpoint exists, auth-protected, returns correct shape |
| Database verified | Data persists correctly, RLS enforced, no cross-user leakage |
| Auth verified | Route requires auth, handles unauthenticated state |
| Error handling verified | Network errors, validation errors, server errors all handled |
| Automated test | Test file exists covering the feature |

## 1. Route Coverage

| Section | Route | Feature | UI verified | API verified | DB verified | Auth verified | Error handling | Test | Status | Notes |
|---------|-------|---------|-------------|--------------|-------------|---------------|----------------|------|--------|-------|
| Shell | `#/dashboard` | Dashboard overview | ✅ | ❌ local only | ❌ context | ✅ | ⚠️ partial | ❌ | **NEEDS FIX** | Reads localStorage for CRM leads, not AppContext. Fake AI suggestions. No loading skeleton. |
| Shell | `#/copilot` | Motasem AI chat | ✅ | ✅ | ❌ memory | ✅ | ✅ per-message | ❌ | OK | Local slash commands bypass backend. AI only for `/intent`. |
| Shell | `#/projects` | Project Manager | ✅ | ❌ local only | ❌ context | ✅ | ❌ | ❌ | OK | Full CRUD via AppContext. AI suggestions optional. |
| Shell | `#/crm` | Work/CRM | ✅ | ❌ local only | ❌ localStorage | ✅ | ❌ | ❌ | **NEEDS FIX** | All data in localStorage (`nova_work_crm_*`), not Supabase. |
| Shell | `#/finances` | Finance Manager | ✅ | ❌ local only | ❌ localStorage | ✅ | ❌ | ❌ | **NEEDS FIX** | Contains Arabic seed data (October 2025 demo). Uses floating point. |
| Shell | `#/wiki` | Second Brain | ✅ | ⚠️ partial | ✅ context | ✅ | ❌ | ❌ | OK | Notes in AppContext, durable memory search via API. |
| Shell | `#/health` | Health tracker | ✅ | ❌ local only | ❌ context | ✅ | ❌ | ❌ | **NEEDS FIX** | Division by zero bug in average calc. Read-only. |
| Shell | `#/focus` | Focus Zone | ✅ | ❌ local only | ❌ context | ✅ | ❌ | ❌ | OK | Timer via AppContext. Timer drift issue (no Date.now delta). |
| Shell | `#/character` | Character OS | ✅ | ✅ | ✅ context | ✅ | ✅ | ✅ | OK | Full test suite exists. XP/streaks persisted. |
| Shell | `#/integrations` | Integrations | ✅ | ✅ partial | ❌ no DB | ✅ | ⚠️ partial | ❌ | OK | Shows provider list. Real status from backend. |
| Shell | `#/planner` | Planner overview | ✅ | ⚠️ partial | ✅ context | ✅ | ✅ | ❌ | OK | 8 subviews, subview routing works. |
| Shell | `#/planner-overview` | Planner overview | ✅ | ⚠️ partial | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-quarter` | Quarterly plan | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-month` | Monthly plan | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-week` | Weekly plan | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-today` | Today's tasks | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-calendar` | Calendar | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-reviews` | Reviews | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |
| Shell | `#/planner-insights` | Insights | ✅ | ❌ local | ✅ context | ✅ | ✅ | ❌ | OK | |

## 2. Dashboard Data Sources

| Data item | Source | Status | Issue |
|-----------|--------|--------|-------|
| CRM leads | localStorage `nova_work_crm_leads_v1` | ❌ | Should read from AppContext (Supabase) |
| Integration statuses | localStorage `nova_work_integration_statuses_v1` | ❌ | Should read from `/integrations/health` API |
| Projects | AppContext (Supabase) | ✅ | |
| Tasks | AppContext (Supabase) | ✅ | |
| Goals | AppContext (Supabase) | ✅ | |
| Finances | AppContext (Supabase) | ✅ | |
| Health entries | AppContext (Supabase) | ✅ | |
| Calendar events | AppContext (Supabase) | ✅ | |
| AI briefing | Local `generateAIBriefing()` | ⚠️ | Uses hardcoded thresholds, not real AI |
| AI suggestions | Hardcoded array | ❌ | Fake — not from real AI provider |

## 3. Integration Status per Provider

| Provider | Frontend status | Backend endpoint | DB table | Real status check | Notes |
|----------|----------------|-------------------|----------|-------------------|-------|
| Supabase | needs_auth/connected | `/integrations/health` | `integration_providers` | ✅ | Reads from backend health endpoint |
| Google OAuth | needs_setup/connected | `/integrations/google/status` | `google_oauth_tokens` | ✅ | Encrypted tokens stored |
| Gmail | needs_setup/connected | `/sync/google/gmail` | `google_oauth_tokens` | ⚠️ | Status inferred from token presence |
| Calendar | needs_setup/connected | `/sync/google/calendar` | `google_oauth_tokens` | ⚠️ | Status inferred from token presence |
| Hermes AI | needs_setup/connected | `/ai/command` | none | ✅ | Configured via env vars |
| Gemini | needs_setup/connected | `/ai/second-brain` | none | ⚠️ | Fallback only |
| Telegram | needs_setup | `/telegram/status` | `integration_connections` | ✅ | Real webhook secret check |
| WhatsApp | not_connected | `/whatsapp/status` | `integration_connections` | ✅ | Real webhook verification |
| GitHub | not_connected | None | None | ❌ | No backend implementation |
| Vercel | not_connected | None | None | ❌ | No backend implementation |

## 4. AI Provider Architecture

| Component | Uses Hermes | Uses Gemini | Backend route | Notes |
|-----------|-------------|-------------|---------------|-------|
| General chat (copilot) | ✅ | ⚠️ (fallback) | POST /ai/command | Hermes primary, Gemini fallback |
| Second Brain | ❌ | ✅ | POST /ai/second-brain | Uses Gemini directly for retrieval |
| Dashboard suggestions | ❌ | ❌ | None | Hardcoded in component |
| Planner AI | ⚠️ | ❌ | POST /ai/command via cloudRunClient | Calls backend intent endpoint |
| Character coaching | ✅ | ❌ | POST /character/coach/* | Uses Hermes via backend |
| CRM AI | ✅ | ❌ | POST /crm/ai/* | Multiple AI endpoints |
| Reports | ✅ | ❌ | POST /reports/* | Uses agents with Hermes |
| Memory search | ❌ | ✅ | POST /memory/search | Uses Gemini embeddings |

## 5. Critical Issues Found

| Issue | File | Severity | Description |
|-------|------|----------|-------------|
| CRM data in localStorage | `src/components/Work.tsx` | P1 | All CRM leads, portfolio, upwork, outreach stored in localStorage, not Supabase. No cross-device sync. |
| Dashboard reads localStorage | `src/components/Dashboard.tsx` | P2 | Displays stale CRM data from localStorage instead of AppContext. |
| Fake Finance seed data | `src/components/FinanceManager.tsx` | P2 | Contains October 2025 demo transactions with Arabic names in production code. |
| Health division by zero | `src/features/health/Health.tsx` | P2 | `avg = sum / (entries.length || 1)` gives wrong results for edge cases. |
| Timer drift | `src/components/FocusZone.tsx` | P2 | Uses setInterval without Date.now delta — drifts when tab is backgrounded. |
| AI suggestions hardcoded | `src/components/Dashboard.tsx` | P2 | 5 AI suggestions are static strings, not from real AI. |
| No retry for AI calls | `server/src/services/aiBrain/providers/hermesProvider.ts` | P2 | Retries on all errors including 4xx, no exponential backoff. |
| No centralized AIProvider | `server/src/services/aiBrain/providers/*.ts` | P2 | No common interface — Hermes and Gemini have different call signatures. |
| Duplicate sync records | `src/context/AppContext.tsx` | P2 | `queueWrite` uses microtask batching but no dedup — rapid writes create duplicate upserts. |
| Second Brain uses Gemini directly | `server/src/services/aiBrain/secondBrainRouter.ts` | P2 | Should prefer Hermes for reasoning, Gemini only for embeddings. |

## 6. Hermes AI Verification Results

- ✅ Hermes is the primary provider for `/ai/command` (general chat)
- ✅ Hermes powers all character coaching endpoints (`/character/coach/*`)
- ✅ Hermes powers all CRM AI endpoints (`/crm/ai/*`)
- ✅ 3 retries with timeout configured
- ✅ Typed Zod output schemas
- ⚠️ Fallback to Gemini works but lacks centralized abstraction
- ⚠️ Dashboard suggestions bypass Hermes entirely (hardcoded)
- ❌ No streaming support
- ❌ No token limit tracking
- ❌ No per-request provider selection

## 7. Gemini Fallback Verification Results

- ✅ Falls back to Gemini when Hermes is unavailable
- ✅ Used for embeddings (memory search)
- ✅ Used for Second Brain retrieval
- ✅ Never the primary reasoning provider
- ❌ No retry logic for Gemini calls (single attempt)
- ❌ Task-specific prompts assume input shape without validation
- ❌ Model name hardcoded — may point to deprecated version

## 8. Automated Tests Coverage

| Test file | Tests | Covers | Status |
|-----------|-------|--------|--------|
| `src/features/character/__tests__/characterCoach.test.ts` | 21 | Character coaching flows | ✅ |
| `src/features/character/__tests__/xpEngine.test.ts` | 19 | XP calculations | ✅ |
| `src/features/character/__tests__/levelEngine.test.ts` | 20 | Level progression | ✅ |
| `src/features/character/__tests__/streakEngine.test.ts` | 10 | Streak calculations | ✅ |
| `src/features/character/__tests__/achievementEngine.test.ts` | 7 | Achievement logic | ✅ |
| `src/features/character/__tests__/recoveryEngine.test.ts` | 10 | Recovery mechanics | ✅ |
| `src/features/character/__tests__/adaptiveEngine.test.ts` | 5 | Adaptive difficulty | ✅ |
| `src/features/character/__tests__/titleEngine.test.ts` | 6 | Title progression | ✅ |
| `src/features/character/__tests__/exposureEngine.test.ts` | 13 | Exposure system | ✅ |
| `src/features/character/__tests__/integration/characterIntegration.test.ts` | 32 | Integration tests | ✅ |
| `server/src/channels/__tests__/channelAdapters.test.ts` | 26 | Telegram/WhatsApp adapters | ✅ |
| `server/src/services/tools/__tests__/toolSchemas.test.ts` | 63 | Tool schemas | ✅ |
| `server/src/services/tools/__tests__/toolRegistry.test.ts` | 24 | Tool registry | ✅ |
| `server/src/services/characterCoach/__tests__/characterCoachService.test.ts` | 11 | Coach service | ✅ |
| `server/src/services/integrations/__tests__/connectionStatusService.test.ts` | 7 | Connection status | ✅ |
| `server/src/services/integrations/__tests__/providerConfigService.test.ts` | 18 | Provider config | ✅ |
| `server/src/services/integrations/google/__tests__/googleScopeRegistry.test.ts` | 24 | Google scopes | ✅ |
| `server/src/services/planner/__tests__/planner.test.ts` | 0 | Planner (placeholder) | ❌ |
| `server/src/services/planner/googleCalendarService.test.ts` | 2 | Calendar service | ⚠️ |
| `src/lib/env/__tests__/validate.test.ts` | 6 | Env validation | ✅ |
| `src/lib/integrationStatus/__tests__/shared.test.ts` | 37 | Status model | ✅ |
| `src/features/planner/components/__tests__/PlannerPrimitives.test.tsx` | 29 | Planner UI | ✅ |
| `src/features/planner/utils/date.test.ts` | 15 | Date utilities | ✅ |

**Total: 423 tests across 23 files**

## 9. P0/P1 Blockers Remaining

| Blocker | Priority | Status |
|---------|----------|--------|
| CRM data in localStorage not Supabase | P1 | Unaddressed |
| Dashboard reads stale localStorage instead of context | P2 | Unaddressed |
| Fake AI suggestions on Dashboard | P2 | Unaddressed |
| No retry exponential backoff in Hermes provider | P2 | Unaddressed |
| No centralized AIProvider interface | P2 | Unaddressed |
| Finance seed data with Arabic demo content | P2 | Unaddressed |
