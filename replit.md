# My Fitness Trainer - Replit Setup

## Overview
This is a Next.js fitness tracking application with Supabase as the backend. The application includes features for workout planning, exercise tracking, AI coaching, progress monitoring, and gamification.

## Project Structure
- **Web App**: Next.js 15.5.4 application in the root directory (`src/`)
- **Mobile App**: React Native/Expo app in `apps/mobile/` (not active in Replit)
- **Supabase Functions**: Edge functions in `supabase/functions/`

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

### Running the Application
The app runs on port 5000 and is configured to work with Replit's proxy:
```bash
npm run dev
```

### Key Configuration
- **Next.js Config** (`next.config.ts`): Configured with server actions allowed origins for Replit compatibility
- **PostCSS Config** (`postcss.config.mjs`): Uses Tailwind CSS v3 and autoprefixer
- **Tailwind Config** (`tailwind.config.ts`): Custom color scheme and animations

### Environment Variables
The application uses Supabase for backend services. The Supabase URL and public key are in `src/integrations/supabase/client.ts`.

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
- Installed Next.js and all required dependencies
- Configured Next.js to run on port 5000 with 0.0.0.0 host
- Fixed Tailwind CSS configuration (downgraded from v4 to v3.4 for compatibility)
- Added Supabase auth UI components
- Configured deployment settings for Autoscale
- Added Radix UI components for the UI library

## Known Issues
- Minor LSP warning about next-pwa types (doesn't affect functionality)
- Metadata viewport warning (Next.js recommendation to use viewport export)
