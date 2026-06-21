# Motasem OS — Agent Guide

## Stack
- React 19 + Vite 8 + TypeScript 6 + Vitest 4
- Supabase (auth + `nova_user_docs` table), lucide-react, recharts
- Vercel deploy (SPA with `/*` → `/index.html`)
- Node.js Express backend in `server/`

## Commands
| Action | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Full build | `npm run build` (runs `tsc -b && vite build`) |
| Test | `npm test` (vitest run) |
| Lint | `npm run lint` |
| Single test | `npx vitest run src/features/character/__tests__/myTest.test.ts` |

## Routing
Hash-based in `src/App.tsx` (no React Router). Valid views in `validViews` array. Navigation via `setCurrentView` → Sidebar. Command palette: Ctrl+K.

## State
- **Global:** `AppContext` (React Context + useState, `src/context/AppContext.tsx`)
- **Feature-level:** Custom hooks in `src/features/<name>/hooks/`
- **Persistence:** Supabase `nova_user_docs` table (user_id, collection_name, doc_id, payload). Custom batch-write queue in AppContext.
- **Dev bypass:** `localStorage.nova_dev_user_bypass` with JSON user object

## Feature pattern
```
src/features/<name>/
  <Name>.tsx          # Main component, named export React.FC
  types.ts            # Domain types
  hooks/              # Custom hooks
  components/         # Sub-components
  services/           # Supabase/API layer
```

## UI conventions
- **Layout**: `PageHeader` + `Panel` from `src/components/system/Layout.tsx`
- **States**: `LoadingState`, `EmptyState`, `ErrorState` from `src/components/system/States.tsx`
- **CSS**: Global glassmorphism in `src/index.css` (no Tailwind, no CSS modules)
- **Icons**: lucide-react only
- **Charts**: recharts

## TS quirks
- `verbatimModuleSyntax: true` → use `import type` for type-only imports
- `erasableSyntaxOnly: true` → no enums, no namespaces
- `noUnusedLocals` / `noUnusedParameters` are errors

## Environment
```
VITE_SUPABASE_URL=        # required
VITE_SUPABASE_PUBLISHABLE_KEY=  # required
VITE_API_BASE_URL=        # optional (Cloud Run)
```

## Integration status
Use canonical statuses (`connected`, `disconnected`, `error`, etc.) from `src/lib/integrationStatus/shared.ts` for all status indicators. Import from `src/lib/api/cloudRunClient` for the backend API client.

## Data layer
All user data normalized into `nova_user_docs` with PK `(user_id, collection_name, doc_id)`. RLS scoped to `auth.uid()`. The AppContext `queueWrite` batches upserts in a microtask.

## Character feature (existing skeleton)
- `src/features/character/types.ts` — full domain model (14+ types)
- `src/features/character/hooks/useCharacter.ts` — hook with full API surface
- `src/features/character/Character.tsx` — main component (named export)
- Route `#/character` already wired in App.tsx and Sidebar
- No AppContext integration needed — hook manages its own state
- Services layer (`src/features/character/services/`) still needs implementation

## Notes
- ARCHITECTURE.md mentions Firebase but the codebase uses Supabase (stale docs)
- `server/` has its own tsconfig, Dockerfile, and build
