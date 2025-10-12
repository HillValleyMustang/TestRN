# My Fitness Trainer - Replit Setup

## Overview
This project is a cross-platform fitness tracking application developed as a monorepo, targeting both web (Next.js) and mobile (React Native/Expo) platforms. Its core purpose is to provide a comprehensive and engaging fitness experience, enabling users to plan and track workouts, receive AI-powered coaching, monitor progress, and engage with gamified elements. The application aims to leverage AI for personalized guidance and robust tracking to help users achieve their health and fitness goals.

## User Preferences
I prefer iterative development with clear communication at each step. Please ask before making major architectural changes or implementing complex features. I value well-structured, readable code, and I appreciate detailed explanations when new concepts or patterns are introduced.

## System Architecture
The application utilizes a monorepo structure for code sharing between its Next.js (web) and React Native/Expo (mobile) clients, with TypeScript ensuring type safety across the stack.

**UI/UX Decisions:**
- **Web:** Tailwind CSS, Shadcn/UI (Radix UI), Lucide React for icons.
- **Mobile:** React Native StyleSheet.
- **General:** Custom color scheme, responsive design for charts, visual feedback for PRs and timers, consistent design system for visual parity across platforms.

**Technical Implementations & Feature Specifications:**
- **Authentication:** Supabase for email/password and session management.
- **Data Management:**
    - **Offline-First:** `expo-sqlite` (mobile) and Dexie (web) with sync queues for offline persistence and Supabase synchronization.
    - **State Management:** React Context API.
    - **Forms:** React Hook Form with Zod validation.
- **Workout Features:** Multi-exercise logging, set management, PR detection, rest timer, CRUD for workout templates, and structured T-Paths (workout programs).
- **T-Paths System:** Supports browsing, viewing, and starting structured training programs with progress tracking and AI-generated program integration. Includes hierarchical structure for programs and bonus exercises.
- **Gym & Equipment Management:** Comprehensive CRUD for gym profiles, 32 equipment types across 8 categories, active gym selection impacting exercise filtering, and AI program generation based on available equipment.
- **AI Integration (OpenAI GPT-5):**
    - **Workout Program Generator:** Personalized training programs based on user goals, experience, equipment, frequency, and duration.
    - **AI Coaching:** Real-time motivational coaching and form tips during workouts.
    - **Exercise Matching:** Intelligent mapping of AI-generated exercise names to defined exercises.
- **Progress & Analytics:** Dashboard with key metrics, workout frequency, volume tracking, PR progression, and streak tracking.
- **Body Measurements:** Tracking for weight, body fat, and other measurements with historical views.
- **Goals & Achievements:** Support for 5 goal types and 21 predefined achievements with automatic detection.
- **User Preferences:** Unit system (metric/imperial) and theme preferences.
- **Mobile Specifics:** Progressive Web App (PWA) capabilities for web, network monitoring for mobile.
- **Onboarding Flow:** 5-step onboarding with personal info, training setup (PPL/ULUL), goals/preferences, gym setup, and optional AI photo analysis.
- **Profile Screen:** 6-tab profile (Overview, Stats, Photo, Media, Social, Settings) with fitness level system, stat cards, body metrics, and achievement badges.

**System Design Choices:**
- **Monorepo:** Facilitates code reuse across web and mobile.
- **Supabase Edge Functions:** For server-side logic and real-time features.
- **TypeScript:** For code quality and maintainability.

## External Dependencies
- **Backend-as-a-Service (BaaS):** Supabase (Authentication, PostgreSQL Database, Edge Functions)
- **AI Services:** OpenAI GPT-5 API
- **Frontend Frameworks:** Next.js, React Native / Expo
- **Styling:** Tailwind CSS, React Native StyleSheet
- **UI Libraries:** Shadcn/UI, Radix UI
- **Icons:** Lucide React
- **Form Management:** React Hook Form, Zod
- **Charting:** Recharts
- **Notifications:** Sonner
- **Offline Data Storage:** Dexie (Web), expo-sqlite (Mobile)
- **PWA Integration:** next-pwa
- **Network Connectivity:** @react-native-community/netinfo (Mobile)
```