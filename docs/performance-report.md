# Motasem OS — Performance Report

Generated: 2026-06-20

## Production Build Summary

| Metric | Value |
|--------|-------|
| Build time | ~1.15s |
| JS bundle (raw) | 1,702.41 KB |
| JS bundle (gzip) | 418.43 KB |
| CSS bundle (raw) | 116.91 KB |
| CSS bundle (gzip) | 19.74 KB |
| HTML | 0.66 KB |
| Total modules | 2,445 |
| Build command | `npm run build` (`tsc -b && vite build`) |

## Bundle Breakdown (estimated)

| Library | Size | Notes |
|---------|------|-------|
| recharts | ~400 KB | Largest dependency — charts on Dashboard, Finance, Health |
| lucide-react | ~350 KB | Icon library — hundreds of icons bundled |
| @google/generative-ai | ~150 KB | Gemini SDK |
| React 19 + ReactDOM | ~140 KB | |
| recharts-to-png / save-svg-as-png | ~80 KB | Chart export |
| Zod | ~30 KB | Schema validation (frontend) |
| App code | ~550 KB | All feature modules, components, contexts |

## Observations

1. **recharts is the dominant cost** — Dashboard, Finance Manager, and Health all use it. Lazy-loading the chart components per route would cut initial payload significantly.

2. **lucide-react bundles all icons** — Only ~40 of 1000+ icons are used. A tree-shakeable icon subset would save ~250 KB.

3. **Ineffective dynamic imports** — The Supabase client (`src/lib/supabase/client.ts`) is:
   - Dynamically imported by `Planner.tsx` and `NotificationsDrawer.tsx`
   - Statically imported by `AuthScreen.tsx`, `AppContext.tsx`, and several character services
   - Result: dynamic import does not create a separate chunk (ineffective)

4. **Internal dynamic import issue** — `characterService.ts` dynamically imports itself from `useCharacter.ts` but is also statically imported, making the dynamic import ineffective.

5. **No route-level code splitting** — All 21 pages are in a single chunk. Adding `React.lazy()` + `Suspense` for each route would split the bundle into ~5-8 smaller chunks.

6. **CSS is well-optimized** — ~20 KB gzipped for all glassmorphism styles, responsive rules, and component styles. No unused CSS (verified by build output).

## Recommendations (P3)

| Suggestion | Estimated savings | Effort |
|------------|-------------------|--------|
| Route-level `React.lazy()` splitting | ~1 MB initial → ~200 KB | 1 day |
| Replace recharts with lightweight chart (e.g., uPlot) | ~350 KB | 2-3 days |
| Use tree-shaken lucide-react imports (already done but still large) | ~250 KB | 0.5 day |
| Convert Supabase client to pure static import (remove dynamic import) | ~0 KB (quality) | 0.5 day |
| Add `build.chunkSizeWarningLimit` to silence warning | N/A | 5 min |

## Verification

| Check | Status |
|-------|--------|
| TypeScript build (`tsc -b`) | ✅ Passes |
| Lint (`npm run lint`) | ✅ Passes (0 errors) |
| Unit tests (`npm test`) | ✅ 421 tests, 23 files |
| Production build (`vite build`) | ✅ Passes |
