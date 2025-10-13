# My Fitness Trainer - Replit Setup

## Overview
This project is a cross-platform fitness tracking application, developed as a monorepo, targeting both web (Next.js) and mobile (React Native/Expo). Its core purpose is to provide a comprehensive and engaging fitness experience, enabling users to plan and track workouts, receive AI-powered coaching, monitor progress, and engage with gamified elements. The application aims to leverage AI for personalized guidance and robust tracking to help users achieve their health and fitness goals, encompassing business vision, market potential, and project ambitions.

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
- **Data Management:** Offline-first with `expo-sqlite` (mobile) and Dexie (web) for persistence and Supabase synchronization. React Context API for state management. React Hook Form with Zod for forms.
- **Workout Features:** Multi-exercise logging, set management, PR detection, rest timer, CRUD for workout templates, and structured T-Paths (workout programs) including browsing, viewing, and starting programs with progress tracking and AI-generated program integration.
- **Gym & Equipment Management:** Comprehensive CRUD for gym profiles, 32 equipment types across 8 categories, active gym selection for exercise filtering, and AI program generation based on available equipment.
- **AI Integration (OpenAI GPT-5):** Personalized workout program generation, real-time AI coaching, and intelligent exercise matching.
- **Progress & Analytics:** Dashboard with key metrics, workout frequency, volume tracking, PR progression, and streak tracking.
- **Body Measurements:** Tracking for weight, body fat, and other measurements with historical views.
- **Goals & Achievements:** Support for 5 goal types and 21 predefined achievements with automatic detection.
- **User Preferences:** Unit system (metric/imperial) and theme preferences.
- **Mobile Specifics:** Progressive Web App (PWA) capabilities for web, network monitoring for mobile.
- **Onboarding Flow:** 5-step onboarding covering personal info, training setup, goals/preferences, gym setup, and optional AI photo analysis.
- **Profile Screen:** 6-tab profile (Overview, Stats, Photo, Media, Social, Settings) with fitness level system, stat cards, body metrics, and achievement badges. Includes full editing functionality for personal information, body metrics, workout preferences, and security.

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
- **Drag-and-Drop:** react-native-gesture-handler, react-native-reanimated, react-native-draggable-flatlist

## Recent Changes

### Manage Gym Workouts Dialog - Full Drag-and-Drop Implementation (October 13, 2025)
Completed full drag-and-drop reordering functionality for exercise management:

**Core Functionality:**
- **Workout Selector**: Dropdown to select T-path workouts associated with a gym
- **Exercise Display**: Separate draggable lists for core and bonus exercises with visual differentiation
- **Drag-and-Drop Reordering**: Long-press exercises to drag and reorder within their list (core or bonus)
- **Real-time Persistence**: Order changes automatically save to Supabase with loading indicators
- **Delete & Info Actions**: Delete exercises with confirmation, view exercise details (order, type)
- **Empty States**: Comprehensive messaging for no workouts, no selection, and no exercises scenarios
- **State Management**: Proper reset on dialog close and gym change to prevent stale data

**Technical Implementation:**
- **Libraries Used**: react-native-gesture-handler, react-native-reanimated, react-native-draggable-flatlist
- **GestureHandlerRootView**: Wraps modal for proper gesture support
- **DraggableFlatList**: Separate instances for core and bonus exercise lists
- **ScaleDecorator**: Visual feedback during drag with scale animation and shadow
- **Order Persistence**: Updates `order_index` in `t_path_exercises` table on drag end
- **Optimistic UI**: Immediate visual reordering with background save
- **Error Handling**: Auto-reload on save failure to restore correct order

**UX Features:**
- Long-press drag handle (triple-line icon) to initiate drag
- Visual elevation and shadow during active drag
- "Saving order..." banner with spinner during save
- Disabled interactions while saving to prevent conflicts
- Separate reordering contexts for core vs bonus exercises

**Files Modified:**
- `ManageGymWorkoutsDialog.tsx` - Complete rewrite with drag-and-drop support

**Production Status:** Fully production-ready with complete drag-and-drop reordering functionality.