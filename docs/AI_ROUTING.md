# Motasem OS AI Routing

Motasem OS routes AI through backend services only. API keys stay server-side.

## Primary Brain: Hermes

Hermes is the primary reasoning and orchestration provider. It is called through `POST /ai/command` and is responsible for:

- Planning and decision support.
- Intent detection.
- Tool and action proposal.
- CRM, project, goal, finance, and work interpretation.
- Memory update recommendations.
- Second-order business and execution advice.

Hermes may propose actions, but the backend keeps high-risk actions pending approval. It must not directly execute external sends, destructive actions, finance edits, publishing, bulk operations, or contact actions.

## Second Brain: Gemini

Gemini is routed through `server/src/services/aiBrain/secondBrainRouter.ts` and optional endpoint `POST /ai/second-brain`.

Gemini is only used for lightweight, non-executing tasks:

- `summarize_page`
- `rewrite_text`
- `translate_ar_en`
- `content_variations`
- `summarize_memory`
- `voice_memo_to_memory`
- `telegram_transcription`
- `lightweight_classification`
- `second_opinion`
- `brain_qa`

Gemini must never send emails, publish posts, edit finances, delete data, contact people, mutate records, or execute tools directly.

## Caching And Dedupe

`secondBrainRouter` keeps a short in-memory cache and in-flight request map so repeated lightweight Gemini requests reuse results. Hermes and Gemini are not both called by default; Gemini is used only when a route explicitly asks for a second-brain task or a later Hermes flow requests a second opinion.

## Current Integrations

- Brain Q&A uses Gemini second brain with retrieved memory context only.
- Telegram voice memo transcription uses Gemini second brain and then stores the transcript through the memory ingest path.
- CRM email drafts, smart replies, sequences, lead scoring, enrichment, inbox triage, meeting briefs, deal health, and command classification use Gemini second brain as non-executing generation/classification helpers.
- Legacy `/agents/*` routes no longer use Gemini as a planner; they return a non-executing fallback directing planning work to `/ai/command`.
