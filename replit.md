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
    - **AI-Generated Programs:** Full support for AI-generated workout programs with equipment awareness and goal-based customization.
- **Gym & Equipment Management:**
    - **Equipment System:** 32 equipment types across 8 categories (Free Weights, Cardio, Strength Machines, Cable, Racks/Benches, Bodyweight, Stretching, Olympic).
    - **Gym CRUD:** Full create, read, update, delete operations for gym profiles with equipment lists.
    - **Active Gym:** User can set one gym as active; affects exercise filtering and AI program generation.
    - **Equipment-Aware Filtering:** Exercise picker filters by active gym's equipment with visual indicators for unavailable exercises.
- **AI Integration (OpenAI GPT-5):**
    - **Workout Program Generator:** Creates personalized training programs based on user's goal (strength, hypertrophy, endurance, weight loss, general fitness), experience level (beginner, intermediate, advanced), available gym equipment, training frequency, and session duration. Generated programs are saved as T-Paths with proper exercise ID mapping.
    - **AI Coaching:** Real-time motivational coaching and form tips during workouts. Provides context-aware advice based on current exercise, set number, and user progress.
    - **Exercise Matching:** Intelligent name-to-ID mapping system that matches AI-generated exercise names to actual exercise definitions.
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
- **AI Services:** OpenAI GPT-5 API for workout program generation and coaching
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

## Recent Changes (October 2025)
- **Phase 12 Complete (Oct 5):** AI Integration - Equipment-aware workout program generation using OpenAI GPT-5, AI coaching with real-time motivation and form tips, intelligent exercise name mapping, full T-Path schema alignment for generated programs
- **Phase 13 Complete (Oct 5):** Gym & Equipment Management - 32 equipment types, gym CRUD operations, active gym selection, equipment-aware exercise filtering with visual indicators
- **Equipment Filtering Complete (Oct 5):** Exercise picker now filters by active gym's equipment with smart mapping system and "Available Only" toggle