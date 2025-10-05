# My Fitness Trainer - Replit Setup

## Overview
This project is a cross-platform fitness tracking application designed to run as both a web app (Next.js) and a mobile app (React Native/Expo) from a single monorepo. It aims to provide users with comprehensive tools for workout planning, exercise tracking, AI coaching, progress monitoring, and gamification, all backed by Supabase. The application's business vision is to offer a seamless and engaging fitness experience across devices, leveraging AI for personalized guidance and robust tracking to help users achieve their health and fitness goals.

## User Preferences
I prefer iterative development with clear communication at each step. Please ask before making major architectural changes or implementing complex features. I value well-structured, readable code, and I appreciate detailed explanations when new concepts or patterns are introduced.

## System Architecture
The application employs a monorepo structure to share code between its web (Next.js 15.5.4 App Router) and mobile (React Native/Expo) clients. TypeScript is used throughout for type safety.

**UI/UX Decisions:**
- **Web:** Tailwind CSS v3.4 for styling, Shadcn/UI (Radix UI primitives) for components, Lucide React for icons.
- **Mobile:** React Native StyleSheet for styling.
- **General:** Custom color scheme, responsive design for charts (Recharts), visual feedback for PRs and timers.

**Technical Implementations & Feature Specifications:**
- **Authentication:** Supabase for email/password authentication with session persistence.
- **Data Management:**
    - **Offline-First:** Mobile app uses `expo-sqlite` and a sync queue for offline data persistence, automatically syncing with Supabase when online. Web app uses Dexie (IndexedDB).
    - **State Management:** React Context API.
    - **Forms:** React Hook Form with Zod for validation.
- **Workout Tracking:** Multi-exercise logging, set management, personal record (PR) detection and celebration, rest timer.
- **Workout Templates:** CRUD operations for saving, loading, and managing workout configurations.
- **T-Paths System (Workout Programs):** 
    - **Database Schema:** SQLite tables for t_paths, t_path_exercises, and t_path_progress with offline-first support.
    - **Program Management:** Browse, view, and start workouts from structured training programs.
    - **Progress Tracking:** Automatic tracking of last access and workout completion for each program.
    - **Hierarchical Structure:** Support for main programs with child workouts and bonus exercises.
    - **AI Integration Ready:** Schema supports AI-generated programs with generation parameters storage.
- **Progress & Analytics:** Dashboard with key metrics, workout frequency charts, volume tracking, PR progression charts, and streak tracking.
- **Body Measurements:** Tracking for weight, body fat percentage, and various body measurements, with historical views.
- **Goals & Achievements:**
    - **Goals:** Support for 5 goal types (weight loss/gain, strength, frequency, body fat) with progress tracking.
    - **Achievements:** 21 predefined achievements across 5 categories (workouts, strength, consistency, volume, weight) with automatic unlock detection.
- **User Preferences:** Unit system toggle (metric/imperial) and theme preference, persisted per user.

**System Design Choices:**
- **Monorepo:** Facilitates code sharing (`packages/data`, `packages/features`, `packages/ui`) between web and mobile applications.
- **Supabase Edge Functions:** For server-side logic and real-time capabilities.
- **TypeScript:** Ensures code quality and maintainability across the entire stack.
- **PWA:** `next-pwa` for web app progressive web app capabilities (disabled in dev).
- **Network Monitoring:** `@react-native-community/netinfo` for mobile app connectivity awareness.

## External Dependencies
- **Backend-as-a-Service (BaaS):** Supabase (Authentication, PostgreSQL Database, Edge Functions)
- **Frontend Frameworks:** Next.js (Web), React Native / Expo (Mobile)
- **Styling:** Tailwind CSS (Web), React Native StyleSheet (Mobile)
- **UI Libraries:** Shadcn/UI (Web), Radix UI (Primitives for Shadcn/UI)
- **Icons:** Lucide React
- **Form Management:** React Hook Form, Zod
- **Charting:** Recharts
- **Notifications:** Sonner
- **Offline Data Storage:** Dexie (Web - IndexedDB wrapper), expo-sqlite (Mobile)
- **PWA Integration:** next-pwa
- **Network Connectivity:** @react-native-community/netinfo (Mobile)