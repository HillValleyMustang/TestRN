# TestRN - Monorepo Project

## Overview
Monorepo with React Native/Expo mobile app, Next.js web app, and shared packages.

- `apps/web` - Next.js Web App (Tailwind CSS, Shadcn/UI, React Query)
- `apps/mobile` - React Native/Expo Mobile App (StyleSheet, Expo Router)
- `packages/data` - Shared Supabase clients, models, and types
- `packages/features` - Shared business logic

## Key Conventions
- TypeScript strict mode everywhere
- Path aliases: `@data/*`, `@features/*`, `@ui/*`
- Offline-first on mobile (writes to local DB, then sync queue)
- Web uses direct Supabase queries with React Query caching
- Supabase for backend (auth, database, edge functions, storage)

## Important Patterns
- DataProvider must wrap AuthProvider (never the reverse)
- Mobile types from `@data/storage/models`, web types from `apps/web/src/types/supabase-generated/`
- `ExerciseDefinition` from `@data/types/exercise.ts` (exception to the above)
- Use `react-hook-form` + `zod` for all forms
- Use `createTaggedLogger` for mobile logging (not raw console.log)
- **Mobile data fetching MUST use reactive hooks** (React Query) - see `reactive-hooks.md` for the full pattern. All data hooks live in `apps/mobile/hooks/data/`.

## See `.claude/rules/` for detailed rules on:
- Architecture, TypeScript, state management, performance
- Mobile and web-specific patterns
- **Reactive hooks architecture** (React Query data fetching for mobile)
- Error handling, forms, styling
- Supabase integration and verification checklists
