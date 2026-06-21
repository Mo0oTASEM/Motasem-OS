# Personal AI OS - Full Project Brief

## 1. Executive Summary

Nova OS is a React/Vite personal operating system for a motion designer, game developer, freelancer, and entrepreneur. It combines dashboarding, AI chat, goals, planning, project management, CRM/work automation, finance, notes/memory, focus tracking, health, opportunities, time analysis, and integrations into one local-first operating surface.

The current app is best described as a working frontend prototype plus a partially implemented Node/Express integration backend. Many user-facing modules are functional through React state and `localStorage`; Google, Firebase, Telegram, Gemini, Sheets, Gmail, Contacts, Calendar, CRM spreadsheet, and memory APIs exist on the backend but are not consistently wired into every frontend module.

The target user is one operator building a freelance creative business and personal execution system. The core problem is fragmentation: goals, projects, leads, content, portfolio proof, finances, daily planning, and AI memory currently live in separate tools. Nova OS is the command center meant to unify them.

Current development stage: advanced prototype / pre-production architecture. The app has a substantial UI and local workflows, but it does not yet have a central Hermes brain, durable unified database, universal tool layer, or backend-enforced approval system.

Implemented:
- Local app shell, sidebar navigation, hash route restore, command palette, and settings modal.
- Local state models for projects, clients, finance, wiki notes, memory, goals, planner tasks, journal, health, opportunities, time blocks, agent runs, sync states, and focus sessions in [src/context/AppContext.tsx](src/context/AppContext.tsx).
- Work Command Center with CRM, outreach, content, portfolio, Upwork, reports, Telegram simulation, approval logs, and integration readiness in [src/components/Work.tsx](src/components/Work.tsx) and [src/features/work](src/features/work).
- Backend routes for Google OAuth, sync registration, Sheets push, brain import/search, Telegram voice ingest, CRM Sheets/Gmail/Calendar/Contacts actions, and Gemini-backed agents in [server/src/index.ts](server/src/index.ts).

Mock / placeholder:
- Most Dashboard, Planner, Health, Time, Strategist, and Opportunity intelligence is deterministic local logic from [src/lib/ai/intelligence.ts](src/lib/ai/intelligence.ts).
- Nova Core uses simulated responses unless OpenAI or Anthropic keys are stored in browser local storage in [src/components/NovaCore.tsx](src/components/NovaCore.tsx).
- Work services mostly generate local mock/stub outputs and UI-ready data.
- Google sync route currently records sync status but does not fully import every service in [server/src/services/googleWorkspaceService.ts](server/src/services/googleWorkspaceService.ts).
- Integration cards in [src/features/integrations/Integrations.tsx](src/features/integrations/Integrations.tsx) mostly update local readiness state.

Missing:
- Hermes main brain service.
- Gemini second-brain routing layer.
- Unified tool/function registry.
- Backend approval enforcement.
- Real database migrations and canonical models.
- Real CRM persistence from Work UI into backend CRM APIs.
- Production auth and secure secret management beyond the current planned architecture.

## 2. Current App Structure

Runtime stack:
- Frontend: React 19, TypeScript, Vite, lucide-react, Recharts.
- Backend: Express API, Firebase Admin/Auth/Firestore integration, Google APIs, Gemini SDK, Telegram webhook.
- Persistence: frontend `localStorage` and session storage; backend Firestore with local JSON fallback through `localDevStore`.
- Routing: no React Router. The active page is controlled by `currentView` in [src/App.tsx](src/App.tsx), persisted into `localStorage`, `sessionStorage`, and `window.location.hash`.

Top-level files:
- [src/App.tsx](src/App.tsx): app shell, valid views, hash route restore, command palette, slash commands.
- [src/context/AppContext.tsx](src/context/AppContext.tsx): types, seed data, local state, CRUD actions.
- [src/components/Sidebar.tsx](src/components/Sidebar.tsx): navigation and OS settings modal.
- [src/lib/uiPersistence.ts](src/lib/uiPersistence.ts): persistent UI state helpers.
- [src/lib/api/cloudRunClient.ts](src/lib/api/cloudRunClient.ts): frontend client for backend API.
- [server/src/index.ts](server/src/index.ts): Express route registration.
- [server/src/config.ts](server/src/config.ts): env config and Google scopes.

Routes/views in the app shell:
- `#/dashboard` -> [src/components/Dashboard.tsx](src/components/Dashboard.tsx)
- `#/copilot` -> [src/components/NovaCore.tsx](src/components/NovaCore.tsx)
- `#/projects` -> [src/components/ProjectManager.tsx](src/components/ProjectManager.tsx)
- `#/crm` -> [src/components/Work.tsx](src/components/Work.tsx)
- `#/finances` -> [src/components/FinanceManager.tsx](src/components/FinanceManager.tsx)
- `#/wiki` -> [src/components/SecondBrain.tsx](src/components/SecondBrain.tsx)
- `#/mission` -> [src/features/mission-control/MissionControl.tsx](src/features/mission-control/MissionControl.tsx)
- `#/planner` -> [src/features/planner/DailyPlanner.tsx](src/features/planner/DailyPlanner.tsx)
- `#/journal` -> [src/features/journal/Journal.tsx](src/features/journal/Journal.tsx)
- `#/health` -> [src/features/health/Health.tsx](src/features/health/Health.tsx)
- `#/opportunities` -> [src/features/opportunities/OpportunityRadar.tsx](src/features/opportunities/OpportunityRadar.tsx)
- `#/time` -> [src/features/time/TimeIntelligence.tsx](src/features/time/TimeIntelligence.tsx)
- `#/strategist` -> [src/features/strategist/LifeStrategist.tsx](src/features/strategist/LifeStrategist.tsx)
- `#/integrations` -> [src/features/integrations/Integrations.tsx](src/features/integrations/Integrations.tsx)
- `#/focus` -> [src/components/FocusZone.tsx](src/components/FocusZone.tsx)

Global layout and popups:
- Sidebar navigation.
- OS Settings modal in Sidebar for operator name, role, system prompt, OpenAI key, Anthropic key.
- Floating command palette in App with navigation search and slash commands.
- Restore notice banner when a saved hash/view is unavailable.

## 3. Pages and Features

Dashboard:
- Purpose: executive overview across briefing, revenue, projects, goals, tasks, and meetings.
- Actions: navigate to planner/projects.
- Components/files: [src/components/Dashboard.tsx](src/components/Dashboard.tsx), [src/lib/ai/intelligence.ts](src/lib/ai/intelligence.ts).
- Data: planner tasks, calendar events, goals, finances, projects.
- Status: partial/deterministic. Briefing is local heuristic, not Hermes/Gemini.

Nova Core:
- Purpose: local chat/copilot and command shell.
- Actions: send prompt, run `/todo`, `/note`, `/invoice`, `/burn`, use prompt templates.
- Components/files: [src/components/NovaCore.tsx](src/components/NovaCore.tsx).
- Data: projects, clients, finances, notes, AI config.
- Status: partial. Direct browser calls to OpenAI/Anthropic are implemented; simulated fallback is implemented. No Hermes, no backend orchestration, no tool approval.

Project Hub:
- Purpose: project Kanban, checklists, project templates, asset register.
- Actions: create project, choose template, filter categories, move status, add/delete tasks, add/delete assets.
- Components/files: [src/components/ProjectManager.tsx](src/components/ProjectManager.tsx).
- Data models: `Project`, `ChecklistItem`, `ProjectAsset`, `Client`.
- Status: functional local CRUD. No backend sync.

Work Command Center:
- Purpose: freelance motion design business OS.
- Tabs/modules: Overview Dashboard, CRM / Leads, Outreach / Emails, Content Planner, Portfolio Manager, Upwork Monitor, Reports & Analytics, Telegram Bot Commands, Automation Logs, Settings & Integrations.
- Actions: add/edit leads, generate next actions, draft outreach, build sequences, create content ideas, repurpose portfolio, save Upwork jobs, generate proposal drafts, simulate Telegram commands, approve/reject/edit approval items.
- Components/files: [src/components/Work.tsx](src/components/Work.tsx), [src/features/work](src/features/work).
- Status: rich local/mock feature surface. It is integration-ready but not fully connected to backend APIs.

Finance Ledger:
- Purpose: monthly JOD budget dashboard and transaction manager.
- Actions: select month, add category, add transaction, inline edit categories/transactions, import/export JSON, reset month.
- Components/files: [src/components/FinanceManager.tsx](src/components/FinanceManager.tsx).
- Data: custom `MonthBudget`, `Category`, `Transaction` stored under `nova_finance_monthly_dashboard_v2`.
- Status: functional local finance dashboard. Separate from `AppContext.finances`, except Focus and command palette still write old `FinanceEntry` records.

Second Brain:
- Purpose: notes, memory graph preview, Google Sheets/contact import, brain Q&A.
- Actions: create/edit/delete notes, category filtering, search, inject cheat sheets, import past Sheets, import Google Contacts, ask brain agent.
- Components/files: [src/components/SecondBrain.tsx](src/components/SecondBrain.tsx), [src/lib/api/cloudRunClient.ts](src/lib/api/cloudRunClient.ts), [server/src/services/brainKnowledgeService.ts](server/src/services/brainKnowledgeService.ts).
- Status: local notes functional; backend memory import/Q&A partially real through Google + Gemini when configured.

Plan Control / Pursue a Goal:
- Purpose: SMART goal planning, activity checklists, progress, success probability, top priorities.
- Actions: add/edit goals, define SMART fields, add/remove/check activities, toggle priority task status.
- Components/files: [src/features/mission-control/MissionControl.tsx](src/features/mission-control/MissionControl.tsx).
- Status: functional local goal system with deterministic progress and estimates.

Daily Planner:
- Purpose: ideal day generation from task priority, meetings, and energy.
- Actions: mark tasks done/todo.
- Components/files: [src/features/planner/DailyPlanner.tsx](src/features/planner/DailyPlanner.tsx), [src/lib/ai/intelligence.ts](src/lib/ai/intelligence.ts).
- Status: local heuristic.

Journal:
- Purpose: daily reflection and review input.
- Actions: save wins, lessons, mistakes, ideas.
- Components/files: [src/features/journal/Journal.tsx](src/features/journal/Journal.tsx).
- Status: local functional.

Health:
- Purpose: health/energy summary.
- Actions: none beyond viewing current seeded data.
- Components/files: [src/features/health/Health.tsx](src/features/health/Health.tsx).
- Status: read-only local seed/local storage.

Opportunity Radar:
- Purpose: score freelance/business/game/product opportunities.
- Actions: add opportunity title.
- Components/files: [src/features/opportunities/OpportunityRadar.tsx](src/features/opportunities/OpportunityRadar.tsx), [src/lib/ai/intelligence.ts](src/lib/ai/intelligence.ts).
- Status: local heuristic scoring.

Time Intelligence:
- Purpose: deep work/admin/focus-quality analysis.
- Actions: view time blocks.
- Components/files: [src/features/time/TimeIntelligence.tsx](src/features/time/TimeIntelligence.tsx).
- Status: read-only local seed/local storage.

Life Strategist:
- Purpose: strategic advisor across bottlenecks, stop/double-down choices, and fastest path.
- Actions: view generated advice.
- Components/files: [src/features/strategist/LifeStrategist.tsx](src/features/strategist/LifeStrategist.tsx), [src/lib/ai/intelligence.ts](src/lib/ai/intelligence.ts).
- Status: local heuristic, not connected to backend agent route.

Integrations:
- Purpose: local control panel for Firebase, Google Workspace, Google Sheets, Telegram, Work integrations, and safety settings.
- Actions: connect Firebase + Google, open Google OAuth, push data to Sheets, copy Telegram webhook, check local API, toggle safety settings, fake-test Work integrations.
- Components/files: [src/features/integrations/Integrations.tsx](src/features/integrations/Integrations.tsx), [src/lib/firebase/client.ts](src/lib/firebase/client.ts), [src/lib/firebase/sync.ts](src/lib/firebase/sync.ts), [src/lib/api/cloudRunClient.ts](src/lib/api/cloudRunClient.ts).
- Status: partially real. Google OAuth/Sheets push/API health can call backend; Work cards are local readiness states.

Focus Chamber:
- Purpose: stopwatch billing, Pomodoro timer, ambient visualizer.
- Actions: start/pause/reset, switch mode, select client, commit billable time to old finance ledger.
- Components/files: [src/components/FocusZone.tsx](src/components/FocusZone.tsx).
- Status: local functional. Billing writes to `AppContext.finances`, not the newer Finance Manager budget store.

## 4. Pursue a Goal System

The “Pursue a Goal” system is currently implemented as Plan Control in [src/features/mission-control/MissionControl.tsx](src/features/mission-control/MissionControl.tsx). Its data model is `Goal` in [src/context/AppContext.tsx](src/context/AppContext.tsx).

How goals are created:
- User clicks “Add Goal”.
- Modal starts from `blankDraft()`.
- User enters title, deadline, level, description/relevance, SMART fields, and activities.
- `saveGoal()` builds a `goalPayload`.
- New goals call `addGoal({ id, ...goalPayload })`.
- Existing goals call `updateGoalItem(modalGoalId, goalPayload)`.

How goals are displayed:
- `goalReports` maps every `Goal` into a report object with linked tasks, progress, health, hardness, success probability, and SMART definition.
- Cards show title, level, deadline, progress, success probability, SMART summary, activities, AI hardness, linked task completion, and edit action.

SMART goal logic:
- SMART fields are stored directly on `Goal`: `smartSpecific`, `smartMeasurable`, `smartAchievable`, `smartRelevant`, `smartTimeBound`.
- `smartDefinition(goal)` fills missing fields from title, description, activities, and target date.
- This is not AI-generated yet. It is user-entered and fallback-composed.

Milestones and activities:
- Current milestone concept is `activities` on `Goal`.
- Each activity has `id`, `title`, `completed`, optional `successMetric`, `target`, `current`.
- The current UI only supports simple title + completed checkbox, although the type supports metric-based progress.

Tasks/actions:
- Tasks live separately as `PlannerTask`.
- A task is linked to a goal through `goalId`.
- `goalLinkedTasks(goal, plannerTasks)` finds related tasks.
- Daily Planner and Plan Control can toggle task status.
- There is no inline task creation inside the goal modal yet.

Progress tracking:
- `activityProgress()` averages activity completion or metric completion.
- `taskProgress()` calculates done linked tasks.
- `automaticProgress()` combines activity progress and task progress: activities 65%, linked tasks 35% when both exist.
- Goal health labels: `Finished`, `On Progress`, `Not started`.
- `successProbability()` estimates success using progress, active/completed task ratios, deadline score, and hardness score.
- `estimateHardness()` uses activity count, linked task load, deadline pressure, goal level, and description size.

Stored data:
- In frontend: `nova_goals` in browser `localStorage`.
- In backend: a Sheets push endpoint can export goals to Google Sheets, but Plan Control does not automatically persist to Firestore/Supabase.

Supporting “Build My Freelance Motion Design Business”:
- Create a quarterly or annual goal with SMART fields:
  - Specific: Build a repeatable freelance motion design pipeline.
  - Measurable: 30 qualified leads, 10 outreach sequences, 5 portfolio case studies, 2 retainers.
  - Achievable: Use Work Command Center modules and existing portfolio proof.
  - Relevant: Supports independent creator business.
  - Time-bound: quarter/year deadline.
- Activities can map to Work modules: build CRM, publish portfolio, create outreach templates, monitor Upwork, produce reports.
- Planner tasks can link to the goal for daily execution.

Ready for CRM/leads/outreach/portfolio/content/Upwork/reports/automation:
- Work Command Center already has local UI modules and service functions for these areas.
- The missing link is an entity relationship between a `Goal` and Work entities such as `Lead`, `ContentItem`, `PortfolioProject`, `UpworkJob`, `ApprovalItem`, and reports.

## 5. Current AI Readiness

There is no Hermes brain connected.

AI exists in four forms:
- Frontend local heuristics in [src/lib/ai/intelligence.ts](src/lib/ai/intelligence.ts).
- Nova Core simulated chat plus direct browser OpenAI/Anthropic calls in [src/components/NovaCore.tsx](src/components/NovaCore.tsx).
- Backend Gemini agent orchestration in [server/src/agents/agentOrchestrator.ts](server/src/agents/agentOrchestrator.ts).
- Gemini-backed brain Q&A and Telegram transcription in [server/src/services/brainKnowledgeService.ts](server/src/services/brainKnowledgeService.ts) and [server/src/services/telegramVoiceService.ts](server/src/services/telegramVoiceService.ts).

Where AI logic should live:
- Main brain router: `server/src/services/aiBrain/brainRouter.ts`.
- Provider adapters: `server/src/services/aiBrain/providers/hermesProvider.ts`, `geminiProvider.ts`.
- Tool registry: `server/src/services/tools/toolRegistry.ts`.
- Context builder: `server/src/services/context/contextBuilder.ts`.
- Approval policy: `server/src/services/approvals/approvalPolicy.ts`.
- Execution log: Firestore/Supabase collection `ai_action_logs`.

User command routing should be:
- Frontend sends all AI commands to one backend endpoint.
- Backend detects intent, gathers context, calls Hermes, validates structured action proposals, runs approval policy, executes safe tools or creates pending approvals, writes memory/logs, and returns response.

Memory should work:
- Short-term: current chat/session state.
- Long-term: `memory_items` in Firestore/local fallback, later vector DB.
- Goal/project/CRM/finance memory: canonical domain collections plus summary memory records.
- Automation logs: append-only event/action log.

Automatic actions:
- Low-risk draft, summarize, score, search, classify, plan, recommend.

User approval required:
- Sending emails, publishing posts, deleting records, modifying finance records, contacting leads, bulk operations, important goal changes, sensitive data access.

## 6. Hermes Main Brain Architecture

Hermes should be the main reasoning and orchestration model. It should not live in React. It should connect through a backend service.

Recommended route:
- `POST /ai/command`
- Input: `{ message, currentView, selectedEntityId?, conversationId?, contextHints?, dryRun? }`
- Output: `{ response, intent, proposedActions, executedActions, pendingApprovals, memoryUpdates, sources }`

Recommended architecture:
User input -> Intent detection -> Context gathering -> Hermes reasoning -> Tool selection -> Approval check -> Execution -> Memory update -> Response to user.

Where Hermes connects:
- `server/src/services/aiBrain/providers/hermesProvider.ts`
- Env variables: `HERMES_API_KEY`, `HERMES_BASE_URL`, `HERMES_MODEL`.
- Frontend caller: add `cloudRunClient.aiCommand()` in [src/lib/api/cloudRunClient.ts](src/lib/api/cloudRunClient.ts).
- UI integration: Nova Core, Work Command Center, Plan Control, Second Brain, and global command palette.

Hermes role:
- Main planner.
- Intent detector.
- Tool orchestrator.
- Multi-step reasoning engine.
- Business/CRM/goals/project context interpreter.
- Approval proposal generator.
- Memory update recommender.

Context Hermes should receive:
- User profile: `aiConfig.userName`, `userRole`, system preferences.
- Current page/view and selected entity.
- Relevant domain data: goals, planner tasks, projects, clients/leads, finance, notes, memory, calendar, Work module state.
- Recent actions and pending approvals.
- Search results from memory.
- Integration status and safety settings.

Hermes structured action response:
```json
{
  "answer": "Human-readable response",
  "intent": "create_goal",
  "confidence": 0.91,
  "actions": [
    {
      "tool": "createGoal",
      "risk": "medium",
      "requiresApproval": true,
      "input": {
        "title": "Build My Freelance Motion Design Business"
      }
    }
  ],
  "memoryUpdates": [],
  "followUpQuestions": []
}
```

Safety/approval:
- Hermes should never execute high-risk tools directly.
- Backend should enforce the policy, not the frontend.
- Every proposed action should be validated against schemas before execution.
- Pending approvals should become records shown in Work Automation Logs and a future global Approval Center.

## 7. Gemini Second Brain Architecture

Gemini should become the secondary model, not the main brain.

Recommended uses:
- Summarization.
- Rewriting.
- Arabic/English/Mixed language transformations.
- Draft variations.
- Fast content generation.
- Brain Q&A over retrieved memory.
- Telegram voice transcription.
- Lightweight classification and fallback.
- Second opinion on Hermes plans when risk is medium/high.

When to call Gemini instead of Hermes:
- `summarizePage`
- `translateWritingOutput`
- `generateCaptionForPlatform`
- `summarizeMemory`
- `voiceMemoToMemory`
- `generateAlternativeEmailVersions`
- `comparePlanSecondOpinion`

Fallback logic:
- If Hermes fails, Gemini can return a safe non-executing answer or draft.
- Gemini fallback should not execute tools except low-risk read/search/summarize operations.

Compare Hermes vs Gemini:
- Use only for important decisions: business plan, high-value client reply, goal changes.
- Return both outputs to an evaluator function or to the user as “primary recommendation” and “second opinion”.

Cost control:
- Do not call both by default.
- Use model routing based on task type and risk.
- Cache summaries and page snapshots.
- Reuse memory search results.
- Avoid sending full app state; use context builder slices.

## 8. AI Tool/Function Map

Recommended internal tools:

| Tool | Purpose | Inputs | Output | Risk | Approval | Module |
|---|---|---|---|---|---|---|
| `createGoal()` | Create SMART goal | title, description, level, targetDate, smart fields, activities | goal | Medium | Yes for important/life/annual goals | Plan Control |
| `updateGoal()` | Edit goal | goalId, updates | goal | Medium/High | Yes if major | Plan Control |
| `createTask()` | Create planner task | title, goalId, priority, dueDate, estimate | task | Low | No | Planner |
| `updateTask()` | Change task status/details | taskId, updates | task | Low/Medium | No unless deleting | Planner |
| `createReminder()` | Add follow-up/reminder | title, date, entityId | reminder/event | Medium | Yes if external calendar write | Planner/CRM |
| `updateFinanceRecord()` | Add/edit finance data | record fields | finance record | High | Yes | Finance |
| `createCRMLead()` | Add lead | name, source, contact, service, budget, notes | lead | Medium | No for local draft, Yes if Google Contact | Work CRM |
| `updateCRMLead()` | Edit lead | leadId, updates | lead | Medium | Yes for bulk/important | Work CRM |
| `generateEmailDraft()` | Draft email | lead, goal, tone, language | draft | Low | No | Outreach |
| `sendEmail()` | Send Gmail | to, subject, body | messageId | High | Yes | Gmail/Outreach |
| `generateContentPlan()` | Create posts | platforms, project, goal, cadence | plan/items | Low/Medium | No until scheduling/publish | Content |
| `publishSocialPost()` | Publish post | platform, content, media | post id | High | Yes | Social |
| `createPortfolioProject()` | Add case study | project, assets, metrics | portfolio item | Low/Medium | No local, Yes external publish | Portfolio |
| `summarizePage()` | Summarize active page | view, snapshot | summary | Low | No | Global |
| `searchUserMemory()` | Retrieve memory | query, filters | memory results | Low/Medium | No unless sensitive | Brain |
| `updateUserMemory()` | Store long-term memory | type, title, content, tags | memory item | Medium | Ask for sensitive facts/preferences | Brain |
| `generateDailyReport()` | Build daily brief | date, context | report | Low | No | Dashboard |
| `generateWeeklyReport()` | Build weekly review | week, context | report | Low | No | Reports |
| `runBulkAutomation()` | Execute batch workflows | job type, scope | job id | High | Yes | Automations |

Tool outputs should always include:
```json
{ "ok": true, "entityType": "goal", "entityId": "goal-123", "summary": "Created goal", "requiresFollowUp": false }
```

## 9. Memory System Design

Current memory:
- Frontend local notes: `nova_notes`.
- Frontend memory items: `nova_memory_items`.
- Frontend memory edges: `nova_memory_edges`.
- Backend memory collection: `users/{userId}/memory_items`.
- Backend fallback: `server/.nova-local/{userId}/memory_items`.
- Brain imports: past Google Sheets rows and Google Contacts become `memory_items`.

Proposed memory layers:
- Short-term conversation memory: per conversation/session, stored server-side with TTL.
- Long-term user memory: user preferences, identity, durable facts, stored in Firestore/Supabase and vector DB.
- Goal memory: goal state, progress summaries, decisions, blockers.
- CRM/contact memory: leads, contact history, consent, preferences, last touch.
- Project memory: briefs, assets, milestones, blockers, client context.
- Financial memory: budgets, transactions, recurring obligations, forecasts.
- Content/portfolio memory: content plans, case studies, platform performance.
- Automation log memory: immutable action logs, approvals, rejected actions, external API calls.

Storage recommendation:
- Now: Firestore user-scoped collections and `localStorage` fallback for UI.
- Near term: migrate AppContext entities to backend APIs with Firestore.
- Optional later: Supabase for structured analytics/reporting.
- Vector DB later: embeddings for semantic memory retrieval.
- Google Sheets: export/sync layer, not the only canonical DB.
- Browser `localStorage`: offline bootstrap only, never secret/sensitive canonical storage.

Never store insecurely:
- API keys in browser localStorage.
- OAuth refresh tokens in frontend.
- Gmail raw bodies unless needed and encrypted.
- Full financial/bank records without encryption and access controls.
- Contact phone/email data in public logs.
- Approval decisions without audit trail.
- Model prompts containing secrets.

## 10. Approval and Safety System

Current state:
- Frontend safety settings exist in [src/features/integrations/Integrations.tsx](src/features/integrations/Integrations.tsx).
- Work automation policy exists in [src/features/work/automation/services.ts](src/features/work/automation/services.ts).
- Work UI has approval items/history.
- Backend route [server/src/services/crmWorkspaceService.ts](server/src/services/crmWorkspaceService.ts) includes `sendCrmEmail()` that sends Gmail directly when called.

Needed backend approval system:
- `approvals` collection: pending/approved/rejected/editing.
- `ai_action_logs` collection: append-only action attempts/results.
- `approvalPolicy.ts`: enforce risk.
- Every high-risk backend route checks for approved `approvalId`.

Approval UI:
- Global Approval Center, plus Work > Automation Logs.
- Each card shows action type, target, AI reason, exact payload, risk level, integration, deadline, and buttons: Approve, Reject, Edit, Cancel.
- Edit should create a revised payload and require a new final approve.

Telegram approval later:
- Bot sends approval summary with buttons/commands.
- User can reply `approve <id>`, `reject <id>`, or `edit <id>`.
- Backend verifies chat ID and approval secret.
- Telegram approvals must be logged with timestamp, user id, payload hash.

High-risk actions requiring approval:
- Send email.
- Publish/schedule social post.
- Delete data.
- Edit financial records.
- Contact leads.
- Change important goals.
- Run bulk automations.
- Access sensitive private data beyond current task scope.

## 11. Integration Readiness

Hermes AI:
- Current readiness: missing.
- Required credentials: Hermes key/base URL/model.
- Required backend: `/ai/command`, provider adapter, context builder, tool registry.
- Required models: `ai_conversations`, `ai_action_logs`, `approvals`.
- Risks: unsafe tool execution, overbroad context, duplicate AI paths.
- Order: build after central AI brain service.

Gemini API:
- Current readiness: partial in backend through `GEMINI_API_KEY`.
- Required credentials: `GEMINI_API_KEY`.
- Backend: already used by agent orchestrator, brain Q&A, Telegram transcription; needs second-brain router.
- Risks: currently treated as main agent in [server/src/agents/agentOrchestrator.ts](server/src/agents/agentOrchestrator.ts).
- Order: refactor after Hermes provider exists.

Telegram Bot:
- Current readiness: partial voice webhook.
- Credentials: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
- Backend: [server/src/services/telegramVoiceService.ts](server/src/services/telegramVoiceService.ts).
- Missing: text commands, approvals, user/chat allowlist, public webhook deployment.
- Order: after approval center.

Gmail API:
- Current readiness: send route exists; sync placeholder exists.
- Credentials: Google OAuth with Gmail scopes.
- Backend: `sendCrmEmail()`, future inbox sync/triage.
- Risks: direct send without approval enforcement.
- Order: after approval policy.

Google Contacts:
- Current readiness: import contacts and create contact exist.
- Credentials: Google OAuth People API.
- Backend: `importGoogleContacts()`, `createCrmGoogleContact()`.
- Risks: duplicate contacts, consent, unintended writes.
- Order: with CRM canonical model.

Google Calendar:
- Current readiness: create CRM event route exists; sync placeholder exists.
- Credentials: Google OAuth Calendar scopes.
- Backend: `createCrmCalendarEvent()`.
- Risks: accidental calendar spam.
- Order: after approvals/reminders.

Google Tasks:
- Current readiness: scope exists, sync placeholder only.
- Missing: task adapter.
- Order: after Planner backend model.

Google Sheets:
- Current readiness: strong partial. `pushNovaDataToSheets()` and CRM spreadsheet creation/read/write exist.
- Credentials: Google OAuth Sheets/Drive scopes.
- Risks: Sheets becoming source of truth without conflict strategy.
- Order: early export/sync, but not as only DB.

Supabase:
- Current readiness: UI card only.
- Credentials: project URL, anon key, service role.
- Missing: schema, RLS, service layer.
- Order: optional after Firestore/canonical models decision.

Instagram/Facebook Meta:
- Current readiness: UI card only.
- Credentials: Meta app, app secret, page tokens, IG business account.
- Missing: backend connector and approval-gated publish.
- Order: later, after content/approval.

WhatsApp Business:
- Current readiness: manual-mode card only.
- Credentials: business phone, access token.
- Missing: connector.
- Risks: high contact risk; keep manual/draft-first.
- Order: late.

YouTube:
- Current readiness: UI card only.
- Credentials: Google OAuth/API key.
- Missing: backend analytics/content adapter.
- Order: after content planner.

Pinterest:
- Current readiness: UI card only.
- Credentials: Pinterest app token.
- Missing: backend adapter.
- Order: later.

Dribbble:
- Current readiness: UI card only.
- Credentials: personal token.
- Missing: backend adapter.
- Order: later.

Behance / Portfolio Website:
- Current readiness: UI/manual workflows only.
- Credentials: Adobe/Behance API/profile depending availability.
- Missing: backend adapter, publishing workflow.
- Order: after Portfolio Manager model.

Upwork monitoring:
- Current readiness: local Upwork Monitor UI and services.
- Credentials: RSS URL or API credentials.
- Missing: real feed ingestion and dedupe.
- Order: after Work canonical store.

## 12. Missing Features and Weak Points

- No central brain. Nova Core, backend agents, Work AI, and deterministic intelligence are split across different patterns.
- Gemini is currently documented/implemented as the main agent source in backend agents, conflicting with the desired Hermes-main architecture.
- AI keys in Sidebar are stored in localStorage and used directly from the browser for OpenAI/Anthropic. This should be removed for production.
- Backend approval enforcement is missing. Direct Gmail send route is high-risk.
- Two finance systems exist: `AppContext.finances` and Finance Manager's separate `nova_finance_monthly_dashboard_v2`.
- Work Command Center is rich but mostly local/mock and not fully connected to `cloudRunClient` CRM endpoints.
- Firestore models are implied, not defined through schemas/migrations.
- No unified route/page metadata registry for AI context gathering.
- No canonical action log.
- No vector memory/embeddings despite `embeddingVector` fields in types.
- No React Router; hash routing is adequate for prototype but not ideal for app growth.
- Several strings show mojibake/encoding artifacts in UI output, especially bullets and Arabic text rendered as `Ø...`; file encoding should be normalized.
- Dirty worktree includes many `.nova-local` deletions and local token/sync changes; these should not be committed blindly.

## 13. Recommended Roadmap

Phase 1: Clean project brief and architecture documentation
- Goal: lock system understanding before AI integration.
- Build: this brief, entity map, API map, approval policy spec.
- Files affected: docs only.
- Difficulty: Low.
- Priority: High.
- Result: shared blueprint.

Phase 2: Central AI brain service
- Goal: one backend entrypoint for all AI commands.
- Build: `/ai/command`, context builder, intent router, schemas, response contract.
- Files: `server/src/index.ts`, `server/src/services/aiBrain/*`, `src/lib/api/cloudRunClient.ts`.
- Difficulty: Medium.
- Priority: High.
- Result: Nova Core and command palette stop using fragmented AI paths.

Phase 3: Hermes main brain connection
- Goal: Hermes becomes main model.
- Build: Hermes provider adapter, env config, structured action output parsing.
- Files: `server/src/services/aiBrain/providers/hermesProvider.ts`, `server/src/config.ts`.
- Difficulty: Medium.
- Priority: High.
- Result: main reasoning and orchestration run through Hermes.

Phase 4: Gemini second brain connection
- Goal: Gemini becomes helper/fallback model.
- Build: Gemini router for summarize/rewrite/translate/transcribe/second opinion.
- Files: existing Gemini services plus `geminiProvider.ts`.
- Difficulty: Medium.
- Priority: High.
- Result: clear Hermes/Gemini responsibilities.

Phase 5: Memory system
- Goal: durable memory layers.
- Build: canonical memory APIs, conversation memory, domain summaries, vector-ready embeddings.
- Files: `server/src/services/memoryService.ts`, new domain memory services.
- Difficulty: Medium/High.
- Priority: High.
- Result: AI sees the right context without full-state dumping.

Phase 6: Internal tools/function calling
- Goal: AI controls safe internal actions.
- Build: tool registry for goals, tasks, CRM, finance, content, reports.
- Files: `server/src/services/tools/*`, frontend model adapters.
- Difficulty: High.
- Priority: High.
- Result: structured actions replace ad hoc slash commands.

Phase 7: Approval center
- Goal: enforce human approval for high-risk actions.
- Build: approval DB, policy engine, UI center, backend checks.
- Files: `server/src/services/approvals/*`, `src/features/approvals/*`, Work logs.
- Difficulty: High.
- Priority: Critical before Gmail/social/WhatsApp automation.
- Result: safe automation.

Phase 8: Telegram bot connection
- Goal: remote command and approval channel.
- Build: text command parser, voice memory, approval commands.
- Files: `telegramVoiceService.ts`, new `telegramCommandService.ts`.
- Difficulty: Medium.
- Priority: Medium.
- Result: mobile capture and approval.

Phase 9: CRM/work/business automation
- Goal: connect Work UI to backend CRM/sheets/gmail/calendar.
- Build: real data loading/sync, lead CRUD, draft-first sending, reports.
- Files: [src/components/Work.tsx](src/components/Work.tsx), [src/features/work](src/features/work), `crmWorkspaceService.ts`.
- Difficulty: High.
- Priority: High.
- Result: real freelance business OS.

Phase 10: External APIs and production hardening
- Goal: production-safe integrations.
- Build: Meta, YouTube, Pinterest, Dribbble, Upwork feed, monitoring, rate limits, audit logs, secrets.
- Files: new connector services, deployment config.
- Difficulty: High.
- Priority: Medium/Late.
- Result: scalable multi-channel business automation.

## 14. Best Next Prompt to Implement Hermes

Use this next:

```text
Implement Phase 2 and Phase 3 for Nova OS.

Create a backend central AI brain service where Hermes is the main brain.
Do not change UI design.

Build:
- POST /ai/command
- Hermes provider adapter using env vars HERMES_API_KEY, HERMES_BASE_URL, HERMES_MODEL
- context builder that gathers only relevant app context by currentView and user message
- tool/action response schema
- approval policy check that marks risky actions as pending instead of executing
- cloudRunClient.aiCommand()
- update NovaCore to call /ai/command instead of direct browser OpenAI/Anthropic calls

Keep Gemini as existing fallback only. Do not remove current Gemini services yet.
Add no external sends or destructive actions.
Run build/lint and explain all changed files.
```

## 15. Best Next Prompt to Implement Gemini

Use this after Hermes is wired:

```text
Implement Gemini as the second AI brain for Nova OS.

Gemini must not be the main planner or tool orchestrator.
Use it only for summarization, rewriting, Arabic/English translation, content variations, Telegram transcription, lightweight classification, and optional second opinion.

Build:
- geminiProvider.ts
- model routing rules: Hermes for planning/tools, Gemini for lightweight generation
- /ai/second-brain endpoint or internal service functions
- update brain Q&A, Telegram transcription, writing assistant, and content generation to use the Gemini second-brain service
- add caching/dedupe to avoid duplicate Hermes + Gemini calls
- keep high-risk actions approval-gated and never executed by Gemini directly

Run build/lint and document the exact routing rules.
```
