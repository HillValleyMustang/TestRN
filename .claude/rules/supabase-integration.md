---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "supabase/**/*"
---
# Supabase Integration

## Edge Functions
- Edge functions live in `supabase/functions/`
- Call via Next.js API routes (`apps/web/src/app/api/*`) that proxy to edge functions
- Mobile: Call edge functions directly via fetch with Authorization header
- **ALWAYS** forward Authorization header: `Authorization: Bearer ${accessToken}`
- Project ID: `mgbfevrzrbjjiajkqpti` (hardcoded in multiple places - consider env variable)

## Database
- **NEVER** modify Supabase schema directly - use migrations in `supabase/migrations/`
- Mobile: Use `expo-sqlite` via `apps/mobile/app/_lib/database.ts`
- Web: Use Dexie via `apps/web/src/lib/db.ts`
- Offline-first: All writes go to local DB first, then sync queue
- Sync queue: Use `addToSyncQueue()` for offline operations

## Authentication
- Use Supabase auth client: `@data/supabase/client-mobile` or `@data/supabase/client-web`
- Session persistence: Handled automatically by Supabase
- Auth state: Listen to Supabase auth state changes, don't poll

## AI Integration
- OpenAI client: `packages/data/src/ai/openai-client.ts`
- AI services: `apps/mobile/lib/ai-workout-service.ts`
- Edge functions for AI: `supabase/functions/*` (complete-onboarding, setup-gym-with-ai, etc.)
- Always handle AI errors gracefully with fallbacks

## Database Verification
- Before modifying database-related files, verify column names against existing schema
- Web schema types: `apps/web/src/types/supabase-generated/`
- Mobile/shared models: `@data/storage/models`
- Always check if a column exists before adding it
- Verify RLS policies and permissions
