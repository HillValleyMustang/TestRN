# My Fitness Trainer - Replit Setup

## Overview
This is a cross-platform fitness tracking application with both web (Next.js) and mobile (React Native/Expo) apps sharing code through a monorepo structure. The application uses Supabase as the backend and includes features for workout planning, exercise tracking, AI coaching, progress monitoring, and gamification.

## Project Structure (Monorepo)
```
/
├── apps/
│   ├── web/              ← Next.js 15.5.4 web app
│   │   ├── src/          ← Web app source code
│   │   ├── public/       ← Static assets
│   │   └── package.json
│   └── mobile/           ← React Native/Expo mobile app
│       ├── app/          ← Expo Router app directory
│       ├── metro.config.js ← Metro bundler config with package aliases
│       └── package.json
├── packages/
│   ├── data/             ← Shared data utilities (unit conversions, achievements, helpers)
│   ├── features/         ← Shared business logic hooks (future)
│   └── ui/               ← Shared UI components (future)
├── supabase/functions/   ← Edge functions
└── tsconfig.base.json    ← Shared TypeScript configuration
```

## Tech Stack
- **Framework**: Next.js 15.5.4 (App Router) + React Native/Expo
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3.4 (web), React Native StyleSheet (mobile)
- **UI Components**: Shadcn/UI (Radix UI primitives) for web
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State Management**: React Context API
- **Notifications**: Sonner
- **Charts**: Recharts
- **Backend**: Supabase (authentication, database, edge functions)
- **Offline Storage**: 
  - Web: Dexie (IndexedDB wrapper)
  - Mobile: expo-sqlite with automatic sync queue
- **PWA**: next-pwa (disabled in development)
- **Network Monitoring**: @react-native-community/netinfo (mobile)

## Development Setup

### Running the Applications

**Web App** (port 5000):
```bash
npm run dev
```

**Mobile App** (Expo tunnel on port 8000):
```bash
npm run mobile
```

### Key Configuration
- **Next.js Config** (`apps/web/next.config.ts`): Configured with server actions allowed origins and transpilePackages for monorepo
- **Metro Config** (`apps/mobile/metro.config.js`): Configured with module aliases for shared packages (@data, @features, @ui)
- **TypeScript**: Shared base config with path aliases for all packages
- **PostCSS Config** (`apps/web/postcss.config.mjs`): Uses Tailwind CSS v3 and autoprefixer
- **Tailwind Config** (`apps/web/tailwind.config.ts`): Custom color scheme and animations

### Shared Packages
- **@data**: Unit conversions, achievements constants, workout helpers, storage interfaces, sync queue processor, exercise library
- **@features**: Business logic hooks (future)
- **@ui**: Cross-platform components (future)

### Environment Variables
The application uses Supabase for backend services. The Supabase URL and public key are in `apps/web/src/integrations/supabase/client.ts`.

## Deployment
The project is configured for deployment with:
- **Deployment Type**: Autoscale
- **Build Command**: `npm run build`
- **Run Command**: `npm run start`

## Current State
- ✅ All dependencies installed
- ✅ Next.js dev server running on port 5000
- ✅ Expo mobile app running on port 8000
- ✅ Tailwind CSS v3 configured
- ✅ Authentication UI working (both web and mobile)
- ✅ Local storage and sync queue working on mobile
- ✅ First feature complete: Workout logging with offline-first architecture
- ✅ Deployment configuration set

## Recent Changes (October 5, 2025)
**Phase 1 - Monorepo Restructuring:**
- ✅ Moved web app from root `src/` to `apps/web/src/`
- ✅ Created shared `tsconfig.base.json` with path aliases
- ✅ Scaffolded `packages/data`, `packages/features`, and `packages/ui`
- ✅ Updated root scripts to delegate to app-specific commands
- ✅ Both apps inherit shared TypeScript configuration

**Phase 3 - Shared Logic & Local Storage:**
- ✅ Created shared data utilities in `packages/data`:
  - Unit conversions (kg⇄lbs, km⇄miles, time formatting)
  - Achievement constants and display info
  - Workout helpers (session length, time ago formatting)
  - Storage interfaces: SyncQueueItem, SyncQueueStore, data models
- ✅ Built SQLite database adapter for mobile (`apps/mobile/app/lib/database.ts`)
- ✅ Configured Metro bundler for mobile app to use shared packages
- ✅ Mobile app successfully imports and uses shared utilities
- ✅ Created DataProvider context with automatic sync queue processing
- ✅ Implemented network connectivity monitoring with NetInfo
- ✅ Built first functional feature: Workout logging screen
- ⏳ Web app uses local copies (Next.js module resolution needs build pipeline)

**Mobile App Setup:**
- ✅ Fixed react-native-worklets-core dependency
- ✅ Expo Metro bundler running with tunnel on port 8000
- ✅ QR code available for testing with Expo Go
- ✅ Successfully importing from shared packages (@data/*)

**Phase 2 - Supabase Authentication Integration:**
- ✅ Created shared Supabase configuration in `packages/data/src/supabase/`
- ✅ Built mobile-specific Supabase client with AsyncStorage for session persistence
- ✅ Implemented AuthProvider context with useAuth hook for mobile app
- ✅ Created login/signup screen with email/password authentication
- ✅ Added authentication redirect logic and sign-out functionality
- ✅ Fixed critical bug with optional chaining in session access
- ✅ Mobile app now connects to Supabase for authentication

**Phase 4 - View & History Screens (Complete):**
- ✅ Created exercise library with 16 common exercises across 7 categories
- ✅ Built workout history screen with pull-to-refresh functionality
- ✅ Implemented workout detail view showing exercises and sets in table format
- ✅ Created exercise picker with category filtering and search
- ✅ Updated home screen with navigation buttons to all features
- ✅ Integrated exercise selection into workout logging flow
- ✅ Fixed data loading bugs in workout detail screen

**Phase 5 - Enhanced Workout Features (Complete):**
- ✅ Multi-exercise workout support - users can add multiple exercises per session
- ✅ Exercise card UI with remove functionality
- ✅ Per-exercise set management (add/remove sets)
- ✅ Personal Record (PR) detection system:
  - Queries historical max weight per exercise from database
  - Compares current sets against historical max
  - Tracks running maximum within workout to avoid false positives
  - Visual PR indicators (green border, 🎉 badge) on input fields
  - Success message showing count of new PRs after save
- ✅ Rest timer component:
  - Modal overlay with countdown timer
  - Pause/resume functionality
  - Reset button
  - Quick preset durations (30s, 60s, 90s, 120s, 180s)
  - Visual feedback when timer reaches zero
- ✅ Database method for fetching personal records (getPersonalRecord)
- ✅ Data context integration with PR tracking

**Phase 6 - Workout Templates (Complete):**
- ✅ Database schema and CRUD operations for templates:
  - Save/update templates with exercises, sets, and default weights
  - Get template list for user
  - Get single template by ID
  - Delete templates
- ✅ Templates list screen:
  - View all saved templates with exercise count
  - See exercise breakdown with default sets/weights
  - Delete templates with confirmation
  - Start workout from template button
- ✅ Save as Template feature:
  - Save current workout configuration as reusable template
  - Add optional description
  - Update existing templates
  - Cross-platform modal (iOS and Android compatible)
- ✅ Start from Template flow:
  - Pre-populate workout with template exercises
  - Load default sets and weights from template
  - Fetch personal records for each exercise
  - Preserve template reference for updates
- ✅ Home screen navigation to templates
- ✅ Bug fixes:
  - Fixed useEffect dependency for template loading with userId
  - Replaced iOS-only Alert.prompt with cross-platform modal
  - Description state preservation during template updates

**Current Features (Mobile):**
- ✅ User authentication (email/password) with session persistence
- ✅ Exercise library (16 exercises across chest, back, legs, shoulders, arms, core, cardio)
- ✅ Exercise picker with category filtering and search
- ✅ Multi-exercise workout logging with unlimited sets per exercise
- ✅ Personal record (PR) tracking and celebration
- ✅ Rest timer with customizable durations
- ✅ Workout templates (save, load, update, delete)
- ✅ Start workouts from templates with pre-populated exercises
- ✅ Workout history with pull-to-refresh
- ✅ Workout detail view with exercise breakdown
- ✅ Offline-first data persistence with SQLite
- ✅ Automatic background sync to Supabase when online
- ✅ Network status monitoring and sync queue visibility

## Known Issues
- Minor LSP warnings about module resolution (doesn't affect runtime)
- Web app needs build tooling (Turborepo/Nx) to use shared packages
- Metadata viewport warning in Next.js (cosmetic)
