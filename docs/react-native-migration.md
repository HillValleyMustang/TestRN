# React Native Migration Plan

## Objectives
- Deliver a native mobile experience (iOS/Android) feature-parity with the existing Next.js web app.
- Reuse as much business logic as possible while replacing web-only UI/layout and storage concerns.
- Maintain Supabase backend integration and offline sync semantics.

## Target Monorepo Layout
```
/
├─ apps/
│  ├─ web/                 # Current Next.js app (rename current `src/app` entry point)
│  └─ mobile/              # New Expo Router (React Native) app
├─ packages/
│  ├─ ui/                  # Cross-platform components (React Native + NativeWind)
│  ├─ features/            # Feature hooks + view models shared across apps
│  └─ data/                # Supabase client, storage adapters, sync logic
└─ tsconfig.base.json      # Shared TS config for path aliases
```

The migration keeps the existing web app running while the mobile client is developed. Gradually move portable logic from `src/lib`, `src/contexts`, `src/hooks`, and `src/types` into `/packages` modules consumed by both apps.

## Migration Phases
1. **Preparation (Week 0–1)**
   - Rename current Next.js entry from `src` to `apps/web/src` (update paths/tsconfig).
   - Introduce Yarn/NPM workspaces with the monorepo structure above.
   - Set up shared TypeScript config and lint rules that work in both environments.

2. **Platform Foundations (Week 1–2)**
   - Scaffold Expo app in `apps/mobile` with TypeScript, React Navigation, NativeWind, Reanimated, Gesture Handler, and Supabase client (REST/websocket via `supabase-js` works in RN >= 2.0).
   - Implement auth flow (email/password + session persistence) using `@react-native-async-storage/async-storage`.
   - Build an adapter interface for storage (`packages/data/storage`) with two concrete implementations:
     - Web: Dexie (existing logic)
     - Mobile: SQLite (via `expo-sqlite` or `drizzle-orm/expo-sqlite`) or WatermelonDB for sync-friendly operations.

3. **Shared Domain Logic (Week 2–3)**
   - Extract supabase query hooks, calculation helpers (`achievements.ts`, `unit-conversions.ts`, etc.) into `packages/data` and `packages/features`.
   - Refactor contexts (session, workout session, gym, etc.) to be platform-agnostic: move logic into hooks/services that do not import DOM APIs.
   - Write Jest tests covering shared logic to ensure parity during migration.
   - ✅ Supabase auth provider shared between web and mobile with storage-specific session persistence hooks.
   - ✅ Session persistence adapters extracted (Dexie on web, AsyncStorage on mobile) using shared interfaces.
   - ✅ Shared workout history hook centralises aggregation logic while keeping platform-specific caching.
   - ✅ Activity chart hook shared; mobile dashboard surfaces real activity stats from Supabase data.
   - ✅ Workout performance analytics shared; Dexie caches stay in sync via shared raw payloads.
   - ✅ Exercise history hook shared; weight-unit preferences remain platform specific but data fetching unified.
   - ✅ Workout plan aggregation shared; web/mobile consume unified T-Path data with per-platform caching.
   - ✅ Personal record hook shared; UI formatting handled per platform.
   - ✅ Sync queue storage abstraction added (Dexie + AsyncStorage adapters) readying offline sync phase.
   - ✅ Shared sync queue processor hook drives web background syncing via store abstraction.
   - ✅ Mobile sync manager wired to shared processor using AsyncStorage-backed queue.

4. **UI/UX Parity (Week 3–6)**
   - For each major surface (Dashboard, Workout Session, Activity Logs, Onboarding) build RN screens using:
     - Layout: React Native primitives + NativeWind (Tailwind-like styling)
     - Components: `react-native-paper` or custom components within `packages/ui`
     - Charts: Replace Recharts with `victory-native` or `react-native-svg-charts`
     - Drag/drop interactions: `@rn-primitives/dnd` or custom Reanimated gestures replacing `@dnd-kit`
     - Dialogs/Sheets: `react-native-reanimated-bottom-sheet`, `@gorhom/bottom-sheet`, or Expo Router modals.
   - Replace Radix UI dependent components with RN equivalents; document mapping (table below).

5. **Offline Sync & Background Tasks (Week 6–7)**
   - Reimplement SyncManager using a queue stored in SQLite/AsyncStorage.
   - Use Expo TaskManager or React Native Background Fetch to enqueue sync operations when app regains connectivity.

6. **QA & Deployment (Week 7–8)**
   - Snapshot test core screens, run device testing (Expo Go + EAS builds).
   - Configure OTA updates with Expo EAS Update and align Supabase redirect URLs for mobile deep links.

## Web Dependency Mapping
| Web Dependency | Purpose | React Native Approach |
| --- | --- | --- |
| Tailwind + Radix UI wrappers | Layout, components | `nativewind` for styling; custom components or libraries like `react-native-paper`, `@rn-primitives/*`, `react-native-modal`, `@gorhom/bottom-sheet` |
| `@dnd-kit/*` | Drag-and-drop reorder | Reanimated + Gesture Handler (`react-native-draggable-flatlist`) |
| Dexie.js | IndexedDB offline store | `expo-sqlite`, `react-native-mmkv`, or WatermelonDB |
| `sonner` toasts | Notifications | `react-native-toast-message` or Expo Haptics + custom toast context |
| `react-youtube` | Embedded video | `react-native-youtube-iframe` or Expo AV |
| `recharts` | Charts for progress | `victory-native`, `react-native-svg-charts` |
| Next.js routing/layout | Pages & server components | Expo Router + React Navigation stack/tab layout |
| Next.js API routes | Backend functions | Replace with Supabase Edge Functions or keep separate serverless endpoints |

## Shared Code Extraction Checklist
- `src/lib/achievements.ts`, `unit-conversions.ts`, `utils.ts` → `packages/data` (ensure no DOM usage).
- `src/components/session-context-provider.tsx` logic becomes `packages/features/auth/session-service.ts` consumed by platform-specific providers.
- Workout session business logic from `src/components/workout-session/*` extracted into hooks/services; RN screens consume these while providing platform-specific UI.
- Form validation with `zod` + `react-hook-form` stays shareable (RN supports React Hook Form controllers with `@react-native-community/hooks`).

## Mobile App Technical Stack
- **Bundler/Runtime**: Expo SDK 51+, Hermes engine enabled.
- **Navigation**: Expo Router (file-based) atop React Navigation v7.
- **Styling**: NativeWind + Tailwind config parity; create limited design tokens to match current theme.
- **State Management**: React Context + Zustand (optional) for ephemeral UI state (matches existing patterns if introduced).
- **Storage/Offline**: AsyncStorage for auth session cache; SQLite + custom sync queue for workouts/logs; consider `@supabase-cache-helpers/postgrest-react-query` if migrating to TanStack Query.
- **Tooling**: Expo EAS builds, ESLint + TypeScript path mapping shared across apps.

## Immediate Next Steps
1. ✅ (Done) Convert repository to a workspace (npm or pnpm) and relocate current Next.js code into `apps/web` without functional changes.
2. ✅ (Done) Initialize Expo app in `apps/mobile` (TypeScript template) and configure ESLint + Prettier with shared base config.
3. ✅ (Done) Implement cross-platform Supabase client wrapper that selects proper storage adapter (AsyncStorage vs. browser `localStorage`).
4. ✅ (Done) Build placeholder mobile screens for Login and Dashboard that call shared hooks (even with mocked data) to validate architecture.
5. ✅ (Done) Start migrating shared utilities into `packages` while keeping aliased imports working in the web app.

## Risks & Considerations
- Dexie-to-SQLite migration requires schema redesign; plan data migration scripts to keep offline queue integrity.
- Many Radix UI UX patterns (popover, command menu) require custom RN implementations; budget additional time for parity.
- Supabase auth deep linking (magic links/password resets) must be updated for native (use `AuthSession` or deep link handlers).
- Testing stack changes: adopt Detox/E2E or Expo Test Runner for device coverage.

## Definition of Done
- Apps share a majority of business logic packages.
- Mobile app reproduces core flows: onboarding, workout logging, progress dashboard, profile management, AI prompts (if applicable).
- Offline sync queue works across login/logout boundaries with conflict resolution parity.
- CI pipeline builds both web and mobile targets; release process defined for Expo EAS.
