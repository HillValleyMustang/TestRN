# Mobile App Redesign Plan
## Bringing React Native App to Complete Parity with Web Reference

**Last Updated:** October 6, 2025  
**Reference App:** https://github.com/HillValleyMustang/Workout-App

---

## 📋 Executive Summary

This plan outlines the complete redesign of the React Native mobile app to achieve **100% visual and functional parity** with the web reference app. Every user journey, UI component, and interaction pattern will be replicated to create a seamless cross-platform experience.

**Goal:** Transform the mobile app into a pixel-perfect, feature-complete version of the web app.

**Estimated Timeline:** 10-12 weeks  
**Backend:** Supabase (no changes needed)

---

## 🎯 Phase 1: Foundation & Design System (Week 1)

### 1.1 Theme System Setup
- [ ] Create `apps/mobile/constants/Theme.ts` with complete color system
  - Port all CSS variables from `apps/web/src/app/globals.css`
  - Define core colors: background, foreground, primary, secondary, muted, accent
  - Add action colors: `action-primary` (hsl(217, 91%, 60%)), success, destructive
  - Include workout-specific colors:
    - Upper Body A: `hsl(220, 68%, 32%)` - Blue
    - Lower Body A: `hsl(190, 86%, 36%)` - Cyan
    - Upper Body B: `hsl(0, 84%, 60%)` - Red
    - Lower Body B: `hsl(270, 67%, 40%)` - Purple
    - Push: `hsl(160, 84%, 39%)` - Teal
    - Pull: `hsl(24, 95%, 53%)` - Orange
    - Legs: `hsl(271, 91%, 65%)` - Purple
  - Add aurora effect colors (aurora-teal, aurora-purple, aurora-pink)
  - Include onboarding theme colors
  - Set spacing scale (xs: 4, sm: 8, md: 16, lg: 24, xl: 32, 2xl: 48)
  - Define border radius values (sm: 6, md: 12, lg: 16, xl: 24)
  - Shadow definitions (sm, md, lg, xl)

### 1.2 Typography System
- [ ] Create `apps/mobile/constants/Typography.ts`
  - Install and configure Poppins font family
  - Font weights: light (300), regular (400), medium (500), semibold (600), bold (700)
  - Text styles mapping:
    - h1: 32px, bold
    - h2: 28px, semibold
    - h3: 24px, semibold
    - h4: 20px, medium
    - body: 16px, regular
    - bodyMedium: 16px, medium
    - caption: 14px, regular
    - small: 12px, regular
  - Line heights and letter spacing

### 1.3 Core UI Components Library
Build reusable components matching web's Shadcn/Radix UI patterns:

- [ ] **Card Component** (`apps/mobile/components/ui/Card.tsx`)
  - CardHeader, CardContent, CardFooter, CardTitle, CardDescription
  - Border-bottom-4 accent style for workout cards
  - Rounded corners (12px default)
  - Subtle shadows matching web
  - Background color variants

- [ ] **Button Component** (`apps/mobile/components/ui/Button.tsx`)
  - Variants: default, destructive, outline, secondary, ghost, link, brand, action
  - Sizes: default, sm, lg, icon
  - Loading state with spinner
  - Disabled state styling
  - Pressable feedback (scale animation)
  - Icon support (left/right)

- [ ] **Input Component** (`apps/mobile/components/ui/Input.tsx`)
  - Text input with consistent border/padding
  - Focus state with ring effect
  - Error state styling
  - Label component
  - Helper text support
  - Prefix/suffix icons

- [ ] **Badge Component** (`apps/mobile/components/ui/Badge.tsx`)
  - Variants: default, success, warning, error, info
  - Workout type badges with dynamic colors
  - Size variants (sm, md, lg)
  - Rounded pill style

- [ ] **Dialog/Modal Component** (`apps/mobile/components/ui/Dialog.tsx`)
  - Bottom sheet implementation (for mobile UX)
  - Full-screen modal variant
  - Backdrop with blur effect
  - Animation (slide up from bottom)
  - Close button/gesture

- [ ] **Progress Component** (`apps/mobile/components/ui/Progress.tsx`)
  - Linear progress bar
  - Circular progress (for workout completion)
  - Color variants
  - Animated transitions

- [ ] **Tabs Component** (`apps/mobile/components/ui/Tabs.tsx`)
  - Horizontal tab bar
  - Active indicator (underline/pill)
  - Swipeable content (react-native-tab-view)

- [ ] **Checkbox & Switch** (`apps/mobile/components/ui/Checkbox.tsx`, `Switch.tsx`)
  - Animated check/uncheck
  - Color variants
  - Disabled states

### 1.4 Utility Functions
- [ ] Create `apps/mobile/lib/utils.ts`
  - `cn()` function for style merging (StyleSheet.flatten equivalent)
  - `getWorkoutColorClass()` - workout name to color mapping
  - `getPillStyles()` - generate workout pill styles
  - `formatTimeAgo()` - relative time formatting
  - `formatDistance()` - distance with units
  - `formatTime()` - duration formatting
  - Date formatting helpers (date-fns)
  - Number formatting (weights, percentages)

---

## 🎨 Phase 2: Navigation & Layout (Week 2)

### 2.1 Update Tab Navigation
- [ ] Redesign bottom tab bar to match web footer navigation
  - 5 main tabs: Dashboard, Workout, Exercises, Progress, Profile
  - Icons matching web (Lucide React Native)
  - Active state: action-primary color with scale effect
  - Inactive state: muted-foreground
  - Minimum touch target 44x44
  - Badge support for notifications

### 2.2 Add Missing Navigation Screens
- [ ] Add "Workout History" screen (currently in Settings)
- [ ] Add "Activity Logs" screen
- [ ] Add "Manage T-Paths" screen
- [ ] Ensure all web routes have mobile equivalents
- [ ] Implement deep linking for all screens

### 2.3 Screen Headers & Layout
- [ ] Create consistent `ScreenHeader` component
  - Title (h2 typography)
  - Back button (when needed)
  - Action buttons (Settings, Add, etc.)
  - Height: 56px on mobile
  - Sticky behavior option
  - Blur effect when scrolled

- [ ] Create `ScreenContainer` component
  - Consistent padding (16px horizontal)
  - Safe area handling
  - ScrollView with refresh control
  - Loading skeleton variant

### 2.4 Navigation Utilities
- [ ] Workout-aware navigation (prevent leaving active workout)
- [ ] Navigation blocking with unsaved changes dialog
- [ ] Back handler integration
- [ ] Tab bar hide on keyboard open

---

## 🏠 Phase 3: Dashboard Screen (Week 3)

### 3.1 Dashboard Layout Redesign
Match web dashboard exactly:

- [ ] **Rolling Status Badge** (Top)
  - Display current momentum status
  - States: "Getting Started", "Building Momentum", "In the Zone", "On Fire"
  - Animated gradient background
  - Tap to view details

- [ ] **Quick Links / Action Hub** 
  - Grid layout (3 columns, 2 rows)
  - Log Activity button
  - AI Coach button
  - Workout Log/Performance button
  - Consistency Calendar button (2 columns wide)
  - More dropdown menu (Settings, History, Management)

- [ ] **Next Workout Card**
  - Show upcoming workout based on T-Path
  - Workout name with color pill
  - Estimated duration
  - Last completed date
  - "Start Now" CTA button

- [ ] **All Workouts Quick Start Widget**
  - List all workouts from active T-Path
  - One-tap launch for each workout
  - Color-coded by workout type
  - "Ad-hoc Workout" option

- [ ] **Weekly Target Widget**
  - Visual progress circles/checkmarks
  - Completed vs. goal workouts
  - Activity summary (running, cycling, etc.)
  - Link to Weekly Summary Dialog
  - Link to Consistency Calendar

- [ ] **Gym Toggle Widget**
  - Current active gym display
  - Quick switch dropdown
  - Gym equipment summary

- [ ] **Weekly Volume Chart**
  - Bar chart (last 7 days)
  - Volume trend visualization
  - Using Recharts or Victory Native

- [ ] **Recent Achievements Section**
  - Latest 3 unlocked achievements
  - "View All" link to achievements screen

### 3.2 Dashboard Dialogs/Modals
- [ ] **Consistency Calendar Modal**
  - Monthly calendar view
  - Color-coded workout dots
  - Streak visualization
  - Swipe between months
  - Tap day to see details

- [ ] **Weekly Activity Summary Dialog**
  - Summary of all activities (workouts + logged activities)
  - Total volume, duration
  - Activity breakdown
  - Progress toward weekly goal

- [ ] **Workout Performance Modal**
  - Quick workout history
  - Performance charts
  - Personal records
  - "View Full History" link

- [ ] **AI Coach Dialog**
  - Latest session analysis
  - 30-day overview tab
  - Usage tracking (daily limit)
  - Markdown rendering for AI responses

---

## 💪 Phase 4: Workout Flow (Week 4)

### 4.1 Workout Selection Screen
- [ ] Match web's workout selector interface
  - **From T-Path Tab**
    - List workouts from active program
    - Show last completed date
    - Estimated duration
    - Color-coded pills
  - **Ad-hoc Tab**
    - AI-generated workout
    - Empty workout (build your own)
    - Quick start templates

### 4.2 Active Workout Screen
Complete redesign to match web:

- [ ] **Workout Header**
  - Workout name with color-coded pill
  - Timer (elapsed time)
  - Pause/Resume button
  - End workout button

- [ ] **Progress Bar**
  - Visual indicator of completion
  - Shows current exercise / total exercises
  - Animated fill

- [ ] **Exercise Cards**
  - Exercise name with thumbnail image
  - Muscle group tags
  - Set logging interface (reps, weight, checkmark)
  - Rest timer button (per set)
  - Action menu:
    - View exercise history
    - Swap exercise (AI suggestions)
    - Mark as "Can't Do" (skip with reason)
    - View exercise instructions

- [ ] **Set Logging**
  - Previous performance indicator
  - Quick increment/decrement buttons
  - Keyboard number input
  - Highlight personal records in green
  - Complete set checkmark animation

- [ ] **Rest Timer Modal**
  - Countdown timer
  - Sound notification
  - Skip rest option
  - Extend time option

- [ ] **Bonus Exercises Section**
  - Collapsible section at bottom
  - Optional exercises
  - Same logging interface

### 4.3 Exercise Swap & Substitution
- [ ] **Can't Do Exercise Flow**
  - Tap "Can't Do" on exercise
  - Select reason (equipment, injury, etc.)
  - Show AI substitution suggestions
  - Filter by available equipment
  - One-tap swap

- [ ] **Manual Exercise Swap**
  - Search available exercises
  - Filter by muscle group, equipment
  - Preview exercise details
  - Swap confirmation

### 4.4 Workout Summary & Completion
- [ ] **Post-Workout Summary Screen**
  - Session rating (1-5 stars)
  - Duration and volume stats
  - Exercise summary (sets x reps @ weight)
  - Muscle group breakdown chart
  - Personal records achieved (highlighted)
  - "View AI Analysis" button
  - Recent sessions comparison
  - Share achievement option

- [ ] **Achievement Unlock Animation**
  - Full-screen achievement reveal
  - Animated badge
  - Points awarded
  - Confetti effect

---

## 📊 Phase 5: Progress & Analytics (Week 5)

### 5.1 Progress Dashboard
Match web's progress visualization:

- [ ] **Progress Overview Tab**
  - Current streak card
  - Total workouts this month
  - Weekly volume chart
  - Monthly momentum bars
  - Body metrics summary (BMI, weight, BF%)

- [ ] **Charts & Analytics**
  - Activity chart (weekly/monthly toggle)
  - Volume chart (bar chart)
  - Personal records timeline
  - Muscle group distribution (pie chart)
  - Using Victory Native or similar

### 5.2 Workout History
- [ ] **History List Redesign**
  - Infinite scroll list
  - Workout cards with:
    - Workout name (color-coded pill)
    - Date and duration
    - Volume and exercises
    - Rating stars
    - "View Details" expansion
  - Filter by workout type
  - Search functionality
  - Date range picker

- [ ] **Workout Detail View**
  - Exercise-by-exercise breakdown
  - Sets, reps, weight tables
  - Rest times
  - Personal records highlighted
  - AI analysis (if available)
  - "Repeat Workout" button

### 5.3 Body Measurements & Progress Photos
- [ ] **Measurements Screen**
  - Form matching web layout
  - Input fields: weight, body fat %, measurements
  - Chart visualization (line chart over time)
  - History list with trends (up/down indicators)
  - Photo comparison side-by-side

- [ ] **Photo Journey**
  - Grid of progress photos
  - Date tags
  - Compare mode (2-photo slider)
  - Upload new photo
  - Front/side/back categories

### 5.4 Personal Records Tracking
- [ ] **PR Display System**
  - Show PR badge during workout when broken
  - PR list by exercise
  - Chart of PR progression
  - Filter by muscle group
  - "Share PR" feature

---

## 👤 Phase 6: Profile & Settings (Week 6)

### 6.1 Profile Screen Redesign
Match web's tabbed profile layout:

- [ ] **Overview Tab**
  - Profile photo with edit button
  - Username and joined date
  - Key stats cards:
    - Current streak (fire icon)
    - Total workouts
    - Unique exercises
    - Total points (with explanation tooltip)
  - Recent achievements (3 latest)
  - "View All Achievements" button

- [ ] **Stats Tab**
  - Fitness level indicator
  - Progress to next level (progress bar)
  - Body metrics cards (BMI, height, weight, BF%)
  - Monthly momentum visualization (bar chart)
  - All-time stats

- [ ] **Photo Journey Tab**
  - Progress photo grid
  - Upload photo button (camera/gallery)
  - Compare photos tool
  - Photo timeline

- [ ] **Media Tab** ⭐ NEW
  - Video content feed
  - Inspirational posts
  - Filter by category
  - Search functionality
  - Video player with controls

- [ ] **Settings Tab**
  - Personal information
  - Workout preferences (goal, muscles, duration, constraints)
  - Programme type selection (ULUL vs PPL)
  - AI Coach settings and usage tracking
  - Gym management (add, edit, delete, switch)
  - Data export
  - Account settings
  - Logout

### 6.2 Achievements System
- [ ] **Achievements List**
  - Grid layout with achievement cards
  - Locked vs. unlocked states
  - Achievement details modal
  - Progress bars for multi-level achievements
  - Badge display with points

---

## 🏋️ Phase 7: Exercise & Gym Management (Week 7)

### 7.1 Manage Exercises Screen
- [ ] Match web's exercise management UI
  - **Custom Exercises Tab**
    - List user-created exercises
    - Add new exercise button
    - Edit/delete options
    - Exercise detail view
  - **Global Exercises Tab**
    - Browse all available exercises
    - Filters: muscle group, equipment, difficulty
    - Search bar
    - Favorite/unfavorite toggle
  - **Exercise Detail View**
    - Exercise name and description
    - Muscle groups targeted
    - Equipment needed
    - Instructions (step-by-step)
    - Video demo (if available)
    - Personal history chart

### 7.2 Add/Edit Exercise Form
- [ ] Form matching web layout
  - Exercise name input
  - Muscle group selection (multi-select chips)
  - Equipment selection (multi-select)
  - Instructions textarea
  - YouTube link input (auto-embed)
  - Custom video upload option
  - Save button

### 7.3 Gym Management
- [ ] **Gym List Screen**
  - Active gym highlighted
  - Gym cards showing:
    - Gym name
    - Equipment count
    - Exercise availability
    - Edit/Delete options
  - Add new gym button

- [ ] **Add/Edit Gym Flow**
  - Gym name input
  - Equipment selection (checklist)
  - AI Photo Analyzer integration:
    - Take/upload gym photo
    - AI identifies equipment
    - Review and confirm
  - Save gym

- [ ] **Gym Toggle Widget**
  - Quick switch dropdown (on dashboard)
  - Shows active gym indicator
  - Updates exercise availability instantly

### 7.4 T-Path (Programme) Management
- [ ] **T-Path List Screen**
  - Active program highlighted with indicator
  - Program cards with:
    - Programme name
    - Type (ULUL/PPL)
    - Workout count
    - Created date
    - Edit/Delete/Activate options
  - "Generate New T-Path" button (AI)

- [ ] **Edit T-Path Screen**
  - Programme name editor
  - Workout list (reorderable)
  - Edit workout exercises (dialog)
  - Add workout option
  - Save changes

- [ ] **Programme Generator (AI)**
  - Input preferences dialog
  - AI generates customized T-Path
  - Review and accept
  - Auto-activates new program

---

## 🤖 Phase 8: AI Features & Advanced (Week 8)

### 8.1 AI Coach Integration
- [ ] **AI Coach Interface**
  - **Latest Session Tab**
    - Current workout analysis
    - Strengths and areas for improvement
    - Recommendations
    - Markdown rendering for rich text
  - **30-Day Overview Tab**
    - Monthly performance summary
    - Trends and patterns
    - Long-term recommendations
  - **Usage Tracking**
    - Daily AI credit usage (e.g., 3/5 used)
    - Progress bar
    - Reset timer countdown

### 8.2 AI Gym Photo Analyzer
- [ ] Camera/gallery picker
- [ ] Upload photo to AI endpoint
- [ ] Equipment identification results
- [ ] Review and edit detected equipment
- [ ] Auto-populate gym setup

### 8.3 AI Ad-hoc Workout Generator
- [ ] Input workout preferences dialog
  - Target muscle groups
  - Available time
  - Equipment constraints
- [ ] Generate workout via AI
- [ ] Review generated workout
- [ ] Start or save workout

### 8.4 AI Exercise Substitution
- [ ] Integrated into workout flow
- [ ] AI suggests alternatives when "Can't Do" is selected
- [ ] Reasons-based suggestions (injury, equipment, etc.)
- [ ] One-tap swap implementation

---

## 🎨 Phase 9: Visual Effects & Polish (Week 9)

### 9.1 Visual Effects (Match Web)
- [ ] **Aurora Background Effects**
  - Animated gradient overlays
  - Colors: teal, purple, pink aurora
  - Subtle animation (pulse effect)
  - Used on hero sections, cards

- [ ] **Noise Texture Overlay**
  - Subtle grain texture
  - Add depth to backgrounds
  - CSS-equivalent in React Native (SVG pattern or image overlay)

- [ ] **Backdrop Blur**
  - Modals and dialogs
  - Header when scrolled
  - iOS/Android blur effect

- [ ] **Gradient Accents**
  - Action buttons with gradient
  - Card borders (bottom accent)
  - Progress bars

### 9.2 Animations & Micro-interactions
- [ ] Button press feedback (scale down)
- [ ] Screen transition animations (slide, fade)
- [ ] Loading skeletons (shimmer effect)
- [ ] Success/error toast animations (slide in from top)
- [ ] Achievement unlock animation (scale + confetti)
- [ ] Card swipe gestures
- [ ] Pull-to-refresh animation
- [ ] Progress bar fill animations
- [ ] Tab switch animations

### 9.3 Haptic Feedback
- [ ] Button taps (light impact)
- [ ] Toggle switches (selection feedback)
- [ ] Success actions (notification feedback)
- [ ] Errors (error feedback)
- [ ] Set completion (medium impact)
- [ ] Workout completion (heavy impact)

### 9.4 Loading & Empty States
- [ ] Skeleton loaders for all screens
- [ ] Empty state illustrations
- [ ] Error state illustrations
- [ ] Retry buttons
- [ ] Offline state handling

---

## ✅ Phase 10: Testing & Launch (Week 10)

### 10.1 Cross-Device Testing
- [ ] **iOS Testing**
  - iPhone SE (small screen)
  - iPhone 14 Pro (standard)
  - iPhone 14 Pro Max (large)
  - iPad (tablet layout)
  - Test dynamic island compatibility
  - Safe area insets

- [ ] **Android Testing**
  - Small phone (5.5")
  - Standard phone (6.1")
  - Large phone (6.7")
  - Tablet (10")
  - Test notch/cutout handling
  - Navigation bar handling

### 10.2 User Flow Testing
Complete end-to-end testing:

- [ ] **Onboarding Flow**
  - New user signup
  - Profile setup
  - Gym configuration
  - T-Path generation
  - First workout

- [ ] **Daily Workout Flow**
  - Dashboard → Select workout → Execute → Complete → Summary
  - Exercise swap during workout
  - Can't do exercise flow
  - PR achievement notification

- [ ] **Progress Tracking Flow**
  - View dashboard stats
  - Check consistency calendar
  - Review weekly summary
  - Analyze charts
  - Compare progress photos

- [ ] **Management Flows**
  - Add custom exercise
  - Create/edit gym
  - Generate new T-Path
  - Edit workout in T-Path
  - Switch active gym

- [ ] **AI Flows**
  - Request AI analysis
  - Use AI workout generator
  - AI photo analyzer for gym
  - AI exercise substitution

### 10.3 Performance Testing
- [ ] App load time (<2s)
- [ ] Screen navigation (<300ms)
- [ ] Workout logging (instant feedback)
- [ ] Image loading optimization
- [ ] List scroll performance (60fps)
- [ ] Memory usage monitoring
- [ ] Battery usage testing

### 10.4 Offline Functionality
- [ ] Workout logging works offline
- [ ] Data syncs when back online
- [ ] Cached data display
- [ ] Offline indicators
- [ ] Sync conflict resolution

### 10.5 Final Checklist
- [ ] All screens match web design ✓
- [ ] All features functional ✓
- [ ] No console errors/warnings ✓
- [ ] Performance benchmarks met ✓
- [ ] Accessibility tested ✓
- [ ] Dark mode (if applicable) ✓
- [ ] Deep linking works ✓
- [ ] Push notifications (if applicable) ✓
- [ ] Analytics integrated ✓

---

## 📝 Design Tokens Reference

### Color System
```typescript
// Core Colors (from web globals.css)
export const colors = {
  // Base
  background: 'hsl(0, 0%, 98%)',      // Soft off-white
  foreground: 'hsl(0, 0%, 3.9%)',     // Near black
  
  // Card
  card: 'hsl(0, 0%, 100%)',
  cardForeground: 'hsl(0, 0%, 3.9%)',
  
  // Primary
  primary: 'hsl(0, 0%, 9%)',
  primaryForeground: 'hsl(0, 0%, 98%)',
  
  // Secondary
  secondary: 'hsl(0, 0%, 96.1%)',
  secondaryForeground: 'hsl(0, 0%, 9%)',
  
  // Muted
  muted: 'hsl(0, 0%, 96.1%)',
  mutedForeground: 'hsl(0, 0%, 45.1%)',
  
  // Accent
  accent: 'hsl(0, 0%, 96.1%)',
  accentForeground: 'hsl(0, 0%, 9%)',
  
  // Action (Premium Blue)
  actionPrimary: 'hsl(217, 91%, 60%)',
  actionPrimaryLight: 'hsl(217, 91%, 70%)',
  actionPrimaryForeground: 'hsl(0, 0%, 100%)',
  
  // Status
  success: 'hsl(142.1, 76.2%, 36.3%)',
  successForeground: 'hsl(0, 0%, 98%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
  destructiveForeground: 'hsl(0, 0%, 98%)',
  
  // Borders & Inputs
  border: 'hsl(0, 0%, 89.8%)',
  input: 'hsl(0, 0%, 89.8%)',
  ring: 'hsl(0, 0%, 3.9%)',
  
  // Workout Colors
  workoutUpperBodyA: 'hsl(220, 68%, 32%)',      // Blue
  workoutUpperBodyALight: 'hsl(220, 68%, 42%)',
  workoutUpperBodyB: 'hsl(0, 84%, 60%)',        // Red
  workoutUpperBodyBLight: 'hsl(0, 84%, 70%)',
  workoutLowerBodyA: 'hsl(190, 86%, 36%)',      // Cyan
  workoutLowerBodyALight: 'hsl(190, 86%, 46%)',
  workoutLowerBodyB: 'hsl(270, 67%, 40%)',      // Purple
  workoutLowerBodyBLight: 'hsl(270, 67%, 50%)',
  workoutPush: 'hsl(160, 84%, 39%)',            // Teal
  workoutPushLight: 'hsl(160, 84%, 49%)',
  workoutPull: 'hsl(24, 95%, 53%)',             // Orange
  workoutPullLight: 'hsl(24, 95%, 63%)',
  workoutLegs: 'hsl(271, 91%, 65%)',            // Purple
  workoutLegsLight: 'hsl(271, 91%, 75%)',
  
  // Aurora Effects
  auroraTeal: 'hsl(174, 72%, 56%)',
  auroraPurple: 'hsl(271, 91%, 65%)',
  auroraPink: 'hsl(316, 73%, 52%)',
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Border Radius
export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
```

### Typography
```typescript
export const typography = {
  h1: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
};
```

---

## 🗺️ Component Mapping (Web → Mobile)

| Web Component | Mobile Component | Implementation Notes |
|--------------|------------------|---------------------|
| Card | Custom Card | Match border-b-4 style for workouts |
| Button | Custom Button | Use Pressable with scale animation |
| Dialog | Modal/BottomSheet | Context-dependent (full-screen vs bottom sheet) |
| Tabs | TabView | Use react-native-tab-view with custom styling |
| Form | react-hook-form | Custom Input components with validation UI |
| Select | Custom Picker | Dropdown or bottom sheet picker |
| Checkbox | Custom Checkbox | Animated check/uncheck |
| Switch | Custom Switch | Animated toggle |
| ScrollArea | ScrollView | Native scroll with custom scrollbar styling |
| Tooltip | Custom Tooltip | Long-press to show |
| Avatar | Image with rounded corners | Fallback to initials |
| Badge | Custom Badge | Pill-shaped with variants |
| Progress | Custom Progress | Linear and circular variants |
| Skeleton | Custom Skeleton | Shimmer animation |
| Toast | react-native-toast-message | Custom styling to match web |
| Sheet | Bottom Sheet | react-native-bottom-sheet |
| Drawer | Side Drawer | react-navigation drawer |

---

## 📊 User Journey Coverage

### ✅ Journey 1: Onboarding (First-Time User)
1. Launch app → Welcome screen
2. Sign up / Login (Supabase Auth)
3. Personal info (name, age, height, weight)
4. Training preferences (goal, muscle focus, session length, constraints)
5. Gym setup (manual or AI photo analyzer)
6. Initial progress photos (front, side, back)
7. Programme type selection (ULUL vs PPL)
8. AI generates T-Path
9. Tutorial/walkthrough
10. Land on dashboard

### ✅ Journey 2: Daily Workout
1. Open app → Dashboard
2. View "Next Workout" recommendation
3. Tap "Start Workout"
4. Select from T-Path or Ad-hoc
5. Review workout exercises
6. Begin workout (timer starts)
7. Log sets (reps, weight) for each exercise
8. Use rest timer between sets
9. Swap exercise if needed (equipment issue)
10. Mark exercise as "Can't Do" with reason
11. Complete all exercises
12. Finish workout
13. Rate session (1-5 stars)
14. View summary (volume, duration, muscles)
15. See AI analysis
16. Achievement unlock (if applicable)
17. Return to dashboard

### ✅ Journey 3: Progress Tracking
1. Navigate to Progress tab
2. View current streak and stats
3. Tap "Consistency Calendar" (modal opens)
4. See workout history on calendar (color-coded)
5. Review weekly summary (workouts + activities)
6. Check weekly volume chart
7. Navigate to Workout History
8. Filter by workout type
9. Tap workout to see details
10. Compare performance over time
11. View personal records
12. Navigate to Photo Journey
13. Upload new progress photo
14. Compare photos (side-by-side slider)

### ✅ Journey 4: Exercise Management
1. Navigate to Manage Exercises
2. Browse Global Exercises tab
3. Filter by muscle group (e.g., Chest)
4. Search for specific exercise
5. Tap exercise to view details
6. Watch video demo
7. Mark as favorite
8. Switch to Custom Exercises tab
9. Tap "Add Exercise"
10. Fill in exercise details (name, muscles, equipment)
11. Add YouTube link or upload video
12. Save custom exercise
13. Use in next workout

### ✅ Journey 5: Programme Management
1. Navigate to Manage T-Paths
2. View active programme (highlighted)
3. Tap "Edit" on active T-Path
4. Reorder workouts (drag & drop)
5. Tap workout to edit exercises
6. Add/remove exercises
7. Save changes
8. Tap "Generate New T-Path" (AI)
9. Input preferences (muscles, days, duration)
10. AI generates program
11. Review and activate
12. Programme becomes active

### ✅ Journey 6: Gym Management
1. Navigate to Profile → Settings tab
2. Tap "Gym Management"
3. View current gyms
4. Tap active gym to edit
5. Use "Analyze Gym Photo" (AI)
6. Take photo of gym
7. AI identifies equipment
8. Review and confirm equipment list
9. Save gym
10. Switch active gym (dropdown on dashboard)
11. Exercise availability updates instantly

### ✅ Journey 7: Activity Logging
1. From dashboard, tap "Log Activity"
2. Select activity type (Running, Cycling, etc.)
3. Enter distance and time
4. Select date
5. Add notes (optional)
6. Save activity
7. Activity appears in Weekly Summary
8. Contributes to weekly target

### ✅ Journey 8: AI Coach
1. Complete a workout
2. Tap "View AI Analysis" on summary
3. AI Coach dialog opens
4. Read session-specific analysis
5. View recommendations
6. Switch to "30-Day Overview" tab
7. Read monthly trends and patterns
8. Check AI usage (3/5 credits used today)
9. Close dialog
10. Can request analysis anytime from dashboard

---

## 🚀 Getting Started

### Prerequisites
- React Native development environment set up
- Expo CLI installed (if using Expo)
- Supabase credentials (already configured)
- Access to web app codebase for reference

### Phase 1 Kickoff Steps
1. Create feature branch: `git checkout -b mobile-redesign-phase-1`
2. Install Poppins font (expo-font or react-native-vector-icons)
3. Create `apps/mobile/constants/Theme.ts`
4. Create `apps/mobile/constants/Typography.ts`
5. Build first component: Card
6. Test Card component in isolation
7. Proceed to next component

### Development Workflow
- Work on one phase at a time
- Complete all tasks in a phase before moving to next
- Test on both iOS and Android after each component
- Review with web app side-by-side for accuracy
- Commit after each major component completion

---

## 📈 Success Metrics

### Visual Parity
- [ ] 100% of screens match web design pixel-perfect
- [ ] All color tokens correctly implemented
- [ ] Typography matches exactly (Poppins font)
- [ ] All visual effects replicated (aurora, blur, gradients)

### Feature Parity
- [ ] All web features available on mobile
- [ ] All user journeys functional
- [ ] All AI features integrated
- [ ] All management screens working

### Performance
- [ ] App launch < 2 seconds
- [ ] Screen navigation < 300ms
- [ ] List scrolling 60fps
- [ ] No memory leaks
- [ ] Smooth animations

### User Experience
- [ ] Intuitive navigation
- [ ] Consistent interaction patterns
- [ ] Haptic feedback on all actions
- [ ] Loading states everywhere
- [ ] Error handling with clear messages

### Code Quality
- [ ] Reusable component library
- [ ] Consistent code patterns
- [ ] TypeScript types for all components
- [ ] Comprehensive comments
- [ ] No ESLint warnings

---

## 🎯 Critical Success Factors

1. **Reference Web App Religiously** - Every screen, every interaction must match
2. **Build Component Library First** - Don't skip Phase 1, it's the foundation
3. **Test on Real Devices Early** - Emulators don't show all issues
4. **Maintain Theme Consistency** - Use Theme.ts for ALL colors, never hardcode
5. **Workout Flow is Critical** - Most time spent here, must be perfect
6. **AI Features Must Work Seamlessly** - Core differentiator
7. **Performance is Non-Negotiable** - Smooth 60fps or bust

---

## 📞 Support & Questions

- Reference web codebase: `apps/web/src/`
- Design tokens: `apps/web/src/app/globals.css`
- Component examples: `apps/web/src/components/ui/`
- Utility functions: `apps/web/src/lib/utils.ts`

---

## 🎉 Milestones to Celebrate

- ✅ Phase 1 Complete: Component library built
- ✅ Phase 3 Complete: Dashboard matches web
- ✅ Phase 4 Complete: Workout flow functional
- ✅ Phase 6 Complete: Profile tabs implemented
- ✅ Phase 10 Complete: 100% parity achieved! 🚀

---

**Let's build an amazing mobile experience!** 💪✨

*Last updated: October 6, 2025*
