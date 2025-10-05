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
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3.4
- **UI Components**: Shadcn/UI (Radix UI primitives)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State Management**: React Context API
- **Notifications**: Sonner
- **Charts**: Recharts
- **Backend**: Supabase (authentication, database, edge functions)
- **Offline Storage**: Dexie (IndexedDB wrapper)
- **PWA**: next-pwa (disabled in development)

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
- **@data**: Unit conversions, achievements constants, workout helpers
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
- ✅ Tailwind CSS v3 configured
- ✅ Authentication UI working
- ✅ Deployment configuration set

## Recent Changes (October 5, 2025)
**Phase 1 - Monorepo Restructuring:**
- ✅ Moved web app from root `src/` to `apps/web/src/`
- ✅ Created shared `tsconfig.base.json` with path aliases
- ✅ Scaffolded `packages/data`, `packages/features`, and `packages/ui`
- ✅ Updated root scripts to delegate to app-specific commands
- ✅ Both apps inherit shared TypeScript configuration

**Phase 3 - Shared Logic Extraction:**
- ✅ Created shared data utilities in `packages/data`:
  - Unit conversions (kg⇄lbs, km⇄miles, time formatting)
  - Achievement constants and display info
  - Workout helpers (session length, time ago formatting)
- ✅ Configured Metro bundler for mobile app to use shared packages
- ✅ Mobile app successfully imports and uses shared utilities
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

## Known Issues
- Minor LSP warnings about module resolution (doesn't affect runtime)
- Web app needs build tooling (Turborepo/Nx) to use shared packages
- Metadata viewport warning in Next.js (cosmetic)
