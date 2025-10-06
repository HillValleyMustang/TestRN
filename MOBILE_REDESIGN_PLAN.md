# Mobile App Redesign Plan - UPDATED
## Bringing React Native App to Complete Visual Parity with Web Reference

**Last Updated:** October 6, 2025 (Post-Phase 4)  
**Reference App:** Web app codebase  
**Current Status:** Phases 1-4 Complete (Foundation, Navigation, Dashboard Basic, Workout Screen)

---

## 📊 Current Gap Analysis

### ✅ Completed (Phases 1-4)
- Design system foundation (Theme.ts, Typography.ts)
- 5-tab bottom navigation
- Basic dashboard with StatCard, WeeklyTarget, QuickActions, RecentWorkouts, SimpleVolumeChart
- Basic workout screen with ExerciseCard, SetRow, RestTimer, WorkoutHeader
- ScreenHeader and ScreenContainer layout components

### ❌ Missing "Wow Factor" Elements
**Critical Visual Elements:**
- Workout-type color system (Push/Pull/Legs color-coded UI)
- Rolling Status badge ("Getting into it", "Building Momentum", etc.)
- Weekly Target with circular checkmark indicators
- Quick Links grid on dashboard
- Active Gym widget with switcher
- Colored workout history cards
- Workout launcher/selector screen
- Profile tabs (Overview/Stats/Photo/Media/Social/Settings)
- Exercise manager tabs (My Exercises / Global Library)

---

## 🚀 FAST-TRACK PRIORITY PLAN

### Sprint 1: Core Wow Factor (Phase 5 Accelerated) - ~1 week
**Goal:** Restore visual impact with workout colors and launcher

1. **Workout Type Color System** (Foundation)
2. **Workout Launcher Screen** (High visibility)
3. **Enhanced Dashboard Widgets** (Rolling Status + Gym Toggle)

### Sprint 2: Feature Parity (Phases 6-7) - ~1 week
4. **Profile Screen Overhaul** (Tabs + Header)
5. **Exercise Management Polish** (Tabs + AI Photo)
6. **Workout-Colored Components** (Exercise cards, Recent workouts)

### Sprint 3: Final Polish (Phase 8-9) - ~1 week
7. **Consistency Calendar Modal**
8. **Enhanced Charts & Analytics**
9. **Aurora Effects & Animations**

---

## 🎨 PHASE 5: WORKOUT COLOR SYSTEM & LAUNCHER (PRIORITY 1)

### 5.1 Workout Type Color System
**Implementation Details from Reference:**

Create `apps/mobile/lib/workout-colors.ts`:
```typescript
// From apps/web/src/lib/utils.ts getWorkoutColorClass()
export const WORKOUT_COLORS = {
  // PPL Split
  'Push': { main: '#228B22', light: '#2ea32e' }, // Forest green
  'Pull': { main: '#F89C4D', light: '#fab86d' }, // Vintage orange
  'Legs': { main: '#B645D9', light: '#c966e3' }, // Purple/magenta
  
  // ULUL Split
  'Upper Body A': { main: '#1e3a8a', light: '#2563eb' }, // Dark blue
  'Upper Body B': { main: '#EF4444', light: '#F87171' }, // Red
  'Lower Body A': { main: '#0891b2', light: '#06b6d4' }, // Cyan
  'Lower Body B': { main: '#6b21a8', light: '#9333ea' }, // Purple
  
  // Special
  'Bonus': { main: '#F59E0B', light: '#FBBF24' }, // Golden yellow
  'Ad Hoc Workout': { main: '#F59E0B', light: '#FBBF24' }, // Same as bonus
};

export function getWorkoutColor(workoutName: string): { main: string; light: string } {
  // Map workout names to colors
  // Handle shortened names (Upper A, Lower A, etc.)
}
```

Update `apps/mobile/constants/Theme.ts` to include:
```typescript
export const WorkoutColors = {
  push: '#228B22',
  pushLight: '#2ea32e',
  pull: '#F89C4D',
  pullLight: '#fab86d',
  legs: '#B645D9',
  legsLight: '#c966e3',
  upperA: '#1e3a8a',
  upperALight: '#2563eb',
  upperB: '#EF4444',
  upperBLight: '#F87171',
  lowerA: '#0891b2',
  lowerALight: '#06b6d4',
  lowerB: '#6b21a8',
  lowerBLight: '#9333ea',
  bonus: '#F59E0B',
  bonusLight: '#FBBF24',
};
```

**Tasks:**
- [ ] Create workout color utility functions
- [ ] Update ExerciseCard to show colored left border based on workout type
- [ ] Update RecentWorkouts cards with colored borders
- [ ] Add colored pills/badges for workout types

### 5.2 Workout Launcher Screen
**Reference:** `apps/web/src/app/(app)/workout/page.tsx` (Screenshot: app ui 1 & 2)

Create `apps/mobile/app/workout-launcher.tsx`:

**Layout:**
1. **Header Section**
   - Title: "Workout Session"
   - Subtitle: "Select a workout or start an ad-hoc session."

2. **Active Gym Widget** (if user has multiple gyms)
   - Arrows to switch between gyms
   - Display: "Active Gym" label + gym name with home icon

3. **T-Path Workouts Section** (if user has active program)
   - Program name with icon (e.g., "🏋️ 3-Day Push/Pull/Legs")
   - Workout buttons (colored pills):
     - **Push** - Green background (#228B22), white text, arrow icon
     - **Pull** - Orange background (#F89C4D), white text, arrow icon  
     - **Legs** - Purple background (#B645D9), white text, dumbbell icon
     - Show "Never" or last completed date below each button
   
4. **Ad-Hoc Workout Card**
   - Circle icon with "Start Ad-Hoc Workout" title
   - Subtitle: "Start a workout without a T-Path. Add exercises as you go."
   - Two buttons:
     - **Start Empty** - Outline button
     - **Generate** - Black filled button with sparkles icon

**Component Structure:**
```
<ScreenHeader title="Workout Session" subtitle="..." />
<ScreenContainer>
  <GymSwitcher /> {/* if multiple gyms */}
  
  <TPathWorkoutsList> {/* if active T-Path */}
    <Text>3-Day Push/Pull/Legs</Text>
    <ColoredWorkoutButton workout="Push" color="#228B22" />
    <ColoredWorkoutButton workout="Pull" color="#F89C4D" />
    <ColoredWorkoutButton workout="Legs" color="#B645D9" />
  </TPathWorkoutsList>
  
  <AdHocWorkoutCard>
    <Button>Start Empty</Button>
    <Button>Generate</Button>
  </AdHocWorkoutCard>
</ScreenContainer>
```

**Tasks:**
- [ ] Create workout-launcher.tsx screen
- [ ] Create ColoredWorkoutButton component with workout-specific colors
- [ ] Create GymSwitcher widget (reuse from dashboard)
- [ ] Implement workout selection logic (navigate to /workout with tPathId)
- [ ] Add "Generate" button → navigate to AI generation flow

### 5.3 Enhanced Dashboard Widgets

#### 5.3.1 Rolling Status Badge
**Reference:** `apps/web/src/components/layout/rolling-status-badge.tsx`

**Logic (from Supabase function):**
- 0 periods: "Getting into it" (Gray badge, Dumbbell icon)
- 1-3 periods: "Building Momentum" (Blue badge, CheckCircle icon)
- 4-7 periods: "In the Zone" (Orange badge, Flame icon)
- 8+ periods: "On Fire" (Red badge, Flame filled icon)

Create `apps/mobile/components/dashboard/RollingStatusBadge.tsx`:
```typescript
// Badge colors based on status
const statusStyles = {
  'Getting into it': { bg: Colors.gray100, text: Colors.gray700, icon: 'barbell' },
  'Building Momentum': { bg: '#DBEAFE', text: '#1E40AF', icon: 'checkmark-circle' },
  'In the Zone': { bg: '#FFEDD5', text: '#C2410C', icon: 'flame' },
  'On Fire': { bg: '#FEE2E2', text: '#991B1B', icon: 'flame' },
};
```

**Tasks:**
- [ ] Create RollingStatusBadge component
- [ ] Fetch rolling_workout_status from profiles table
- [ ] Add to top of dashboard (below header, above stats)
- [ ] Add tap handler to show status explanation modal

#### 5.3.2 Active Gym Widget
**Reference:** `apps/web/src/components/dashboard/gym-toggle.tsx`

Create `apps/mobile/components/dashboard/GymToggle.tsx`:
- Card with left/right chevron buttons
- Center text: "Active Gym" label + gym name with home icon
- Only show if user has multiple gyms
- On tap chevron: cycle through user's gyms
- Update active_gym_id in profiles table

**Tasks:**
- [ ] Create GymToggle component
- [ ] Implement gym switching logic
- [ ] Add to dashboard below Quick Links
- [ ] Sync with gym context provider

#### 5.3.3 Enhanced Weekly Target with Circles
**Reference:** Current WeeklyTarget component needs upgrade

Update `apps/mobile/components/dashboard/WeeklyTarget.tsx`:
- Replace list items with circular checkmark indicators
- Each circle: filled blue (#3B82F6) if completed, gray outline if not
- White checkmark icon in completed circles
- Show workout names below each circle
- Progress text: "X/Y completed" at bottom

**Tasks:**
- [ ] Update WeeklyTarget to use circular indicators
- [ ] Style completed circles with blue fill + white checkmark
- [ ] Add calendar icon button (links to Consistency Calendar modal)

---

## 💪 PHASE 6: PROFILE SCREEN OVERHAUL

### 6.1 Profile Header
**Reference:** `apps/web/src/app/(app)/profile/page.tsx` (Screenshot: app ui 3)

Create `apps/mobile/components/profile/ProfileHeader.tsx`:

**Layout:**
1. **Avatar Section**
   - Large circular avatar (initials if no photo)
   - User's full name (h2 typography)
   - Fitness level badge: "Rookie" / "Beginner" / "Intermediate" / "Advanced" / "Expert" / "Legend"
     - Badge color based on level (gray → blue → purple → orange → red)
   - "Member since [date]" subtitle

2. **Points Display**
   - Total fitness points
   - Tap to show explanation modal

**Component Structure:**
```
<View style={styles.profileHeader}>
  <Avatar size={80} initials={getInitials(name)} />
  <Text style={Typography.h2}>{fullName}</Text>
  <Badge color={getLevelColor(level)}>{level}</Badge>
  <Text style={Typography.caption}>Member since {memberDate}</Text>
</View>
```

**Tasks:**
- [ ] Create ProfileHeader component
- [ ] Implement avatar with initials fallback
- [ ] Create fitness level badge with dynamic colors
- [ ] Add points explanation modal

### 6.2 Profile Tabs
**Reference:** `apps/web/src/components/profile/mobile-navigation.tsx`

Create `apps/mobile/components/profile/ProfileTabs.tsx`:

**6 Tabs:**
1. 📊 Overview
2. 📈 Stats  
3. 📸 Photo
4. 🎬 Media
5. 👥 Social (placeholder)
6. ⚙️ Settings

**Tab Component:**
- Horizontal scrollable tab bar
- Emoji icons + text labels
- Active tab: blue background, white text
- Inactive tabs: transparent, muted text
- Swipe gesture support

**Tasks:**
- [ ] Create ProfileTabs navigation component
- [ ] Implement 6 tab content screens
- [ ] Add swipe-to-change-tab gesture

### 6.3 Overview Tab
**Reference:** `apps/web/src/components/profile/profile-overview-tab.tsx`

**Content:**
- **Stats Grid** (2-3 columns)
  - Current Streak (orange gradient card, flame icon)
  - Total Workouts (blue gradient card, dumbbell icon)
  - Total Exercises (purple gradient card, list icon)
  - Total Points (yellow gradient card, star icon) - tap for explanation
  - BMI (if height/weight entered)
  - Estimated Daily Calories

- **Achievements Section**
  - "Recent Achievements" header
  - Grid of achievement badges (3 per row)
  - Unlocked: yellow background, colored icon
  - Locked: gray background, gray icon
  - "View All" button

**Tasks:**
- [ ] Create ProfileOverviewTab screen
- [ ] Create gradient StatCard component
- [ ] Implement achievements grid
- [ ] Add Points Explanation modal

### 6.4 Stats Tab
**Reference:** `apps/web/src/components/profile/profile-stats-tab.tsx`

**Content:**
- **Fitness Level Card** (large gradient card)
  - Level icon (large)
  - Level name (h1)
  - Progress bar to next level
  - "X% to next level" text

- **Monthly Momentum Bars** (chart)
- **Weekly Progress** (placeholder)
- **Personal Records** (placeholder for Phase 7)

**Tasks:**
- [ ] Create ProfileStatsTab screen
- [ ] Create fitness level card with gradient + progress bar
- [ ] Add monthly momentum chart

### 6.5 Photo Tab
**Reference:** `apps/web/src/components/profile/photo-journey/photo-journey-tab.tsx`

**Content:**
- "My Progress Journey" header
- "Compare Photos" button (if 2+ photos exist)
- Photo grid (3 columns)
- Empty state: "You haven't uploaded any progress photos yet. Click the camera button to start your journey!"

**Tasks:**
- [ ] Create PhotoJourneyTab screen
- [ ] Display progress photos in grid
- [ ] Add photo comparison modal
- [ ] Implement empty state

### 6.6 Settings Tab
**Reference:** `apps/web/src/components/profile/profile-settings-tab.tsx`

**Content:**
- Personal Info Form (name, height, weight, body fat %, preferred muscles)
- Workout Preferences (unit system toggle)
- Programme Type Section (PPL vs ULUL)
- Gym Management Section (My Gyms list)
- AI Coach Usage (daily limit display)
- Data Export Section
- Sign Out button (red, destructive variant)

**Tasks:**
- [ ] Create ProfileSettingsTab screen
- [ ] Port all settings forms from web
- [ ] Implement My Gyms management
- [ ] Add sign out functionality

---

## 📚 PHASE 7: EXERCISE MANAGEMENT POLISH

### 7.1 Manage Exercises Screen
**Reference:** `apps/web/src/app/(app)/manage-exercises/page.tsx` (Screenshot: app ui 4)

Update `apps/mobile/app/exercises.tsx`:

**Header:**
- Title: "Manage Exercises"
- Filter button (top-right corner)

**Tabs:**
- **My Exercises** (active by default, black background)
- **Global Library** (gray background)

**Search Bar:**
- Icon: magnifying glass
- Placeholder: "Search exercises..."

**Analyse Gym Photo Button:**
- Camera icon + "Analyse Gym Photo" text
- Full-width button below search
- Opens AI photo analysis dialog

**Add New Exercise Accordion:**
- Collapsible section
- "Add New Exercise" header with chevron

**Exercise List:**
- Exercise cards with:
  - Exercise name (bold)
  - Muscle group (caption)
  - Gym badges (small green pills with "📍Ben" or gym name)
  - Action icons:
    - ℹ️ Info
    - ❤️ Favorite
    - ➕ Add to T-Path
    - 📍 Manage Gyms
    - ≡ More menu

**Filter Sheet:**
- Muscle group dropdown
- Gym dropdown
- "Apply Filters" button

**Tasks:**
- [ ] Create tab switcher (My Exercises / Global Library)
- [ ] Add search bar component
- [ ] Create "Analyse Gym Photo" button
- [ ] Add collapsible "Add New Exercise" form
- [ ] Create exercise card with gym badges
- [ ] Implement filter sheet
- [ ] Add exercise action buttons (info, favorite, add to T-Path, manage gyms)

### 7.2 Gym Badges on Exercise Cards
**Reference:** Exercise cards in screenshots show gym availability

Create `apps/mobile/components/exercises/GymBadge.tsx`:
- Small rounded badge
- Green background (#228B22)
- Home icon + gym name
- Show up to 2 badges, then "+X more"

**Tasks:**
- [ ] Create GymBadge component
- [ ] Fetch gym associations for each exercise
- [ ] Display gym badges on exercise cards

---

## 📊 PHASE 8: DASHBOARD FINAL ENHANCEMENTS

### 8.1 Next Workout Card (if not already present)
**Reference:** Web dashboard shows "Your Next Workout"

- Workout name with colored pill
- Last completed date
- Estimated duration
- "Start Now" button (colored based on workout type)

### 8.2 All Workouts Widget
**Reference:** Web dashboard "All Workouts" section

- List all workouts from active T-Path
- Color-coded buttons for each workout
- "Ad-hoc Workout" option at bottom
- One-tap launch

### 8.3 Enhanced Recent Workouts
**Reference:** Current RecentWorkouts needs color borders

Update `apps/mobile/components/dashboard/RecentWorkouts.tsx`:
- Add colored left border based on workout type
- Show workout name in colored text
- Time ago (e.g., "4d ago")
- Exercise count + duration
- Eye icon button (view details)

**Tasks:**
- [ ] Add colored borders to workout cards
- [ ] Update card styling to match web
- [ ] Add eye icon for workout details

---

## 📅 PHASE 9: CONSISTENCY CALENDAR & DIALOGS

### 9.1 Consistency Calendar Modal
**Reference:** Quick Links → Consistency Calendar

Create `apps/mobile/components/dashboard/ConsistencyCalendar.tsx`:

**Features:**
- Monthly calendar view
- Color-coded dots for workout types
- Current month header with prev/next arrows
- Tap day to see workout details
- Streak visualization
- Swipe between months

**Color Coding:**
- Push workouts: Green dot
- Pull workouts: Orange dot
- Legs workouts: Purple dot
- Multiple workouts: Multiple dots
- No workout: Gray/empty

**Tasks:**
- [ ] Create ConsistencyCalendar modal component
- [ ] Implement calendar grid layout
- [ ] Add colored workout dots
- [ ] Add month navigation
- [ ] Implement day detail view
- [ ] Add swipe gestures

### 9.2 Weekly Activity Summary Dialog
**Reference:** Weekly Target → View Summary

**Content:**
- Summary of all activities (workouts + logged activities)
- Total volume
- Total duration  
- Activity breakdown
- Progress toward weekly goal

**Tasks:**
- [ ] Create WeeklySummaryDialog component
- [ ] Fetch and calculate weekly stats
- [ ] Display activity breakdown

### 9.3 Workout Performance Modal
**Reference:** Quick Links → Workout Log

**Content:**
- Quick workout history
- Performance charts (volume over time)
- Personal records list
- "View Full History" link

**Tasks:**
- [ ] Create WorkoutPerformanceModal component
- [ ] Add performance charts
- [ ] Display PR list

---

## 🎨 PHASE 10: VISUAL POLISH & EFFECTS

### 10.1 Aurora Gradient Effects
**Reference:** Web app has aurora gradients on certain screens

**Aurora Colors (from globals.css):**
```css
--aurora-blue: hsl(200, 100%, 78%);
--aurora-purple: hsl(270, 50%, 32%);
--aurora-orange: hsl(58, 98%, 73%);
--aurora-green: hsl(160, 100%, 43%);
--aurora-pink: hsl(324, 100%, 44%);
```

**Implementation:**
- Create animated gradient background component
- Apply to:
  - Profile header
  - Fitness level card
  - Achievement unlock celebrations
  - Onboarding screens

**Tasks:**
- [ ] Create AuroraGradient component with React Native animation
- [ ] Apply to profile header
- [ ] Add to fitness level card
- [ ] Implement achievement unlock animation

### 10.2 Animations & Micro-interactions
**Reference:** Web app has smooth transitions

**Animations to Add:**
- Card press scale effect (0.98 scale)
- Tab switch transitions
- Modal slide-in/out
- Achievement unlock celebration
- PR celebration (confetti or sparkles)
- Workout completion celebration
- Streak milestone celebration

**Tasks:**
- [ ] Implement card press animations
- [ ] Add modal transitions
- [ ] Create celebration animations
- [ ] Add sparkle/confetti effects for PRs

### 10.3 Gradient Stat Cards
**Reference:** Profile Overview tab has gradient cards

**Gradient Card Styles:**
- Current Streak: Orange gradient (from-orange-400 to-orange-500)
- Total Workouts: Blue gradient (from-blue-400 to-blue-500)
- Total Exercises: Purple gradient (from-purple-400 to-purple-500)
- Total Points: Yellow gradient (from-yellow-400 to-yellow-500)

**Tasks:**
- [ ] Create GradientCard component
- [ ] Apply gradients to dashboard stats
- [ ] Apply gradients to profile overview stats

---

## 📱 PHASE 11: MISSING FEATURES FROM REFERENCE

### 11.1 Media Feed Tab
**Reference:** Profile → Media tab, screenshots show video feed

**Features:**
- Video posts grid
- Category filter (All, Tutorials, Tips, etc.)
- Tap video to play in full screen
- YouTube embed support

**Tasks:**
- [ ] Create MediaFeedTab screen
- [ ] Implement video grid
- [ ] Add category filter
- [ ] Integrate YouTube player

### 11.2 Social Tab (Placeholder)
**Reference:** Profile → Social tab (not implemented in web)

**Placeholder Content:**
- "Coming Soon" message
- Feature description
- Illustration or icon

**Tasks:**
- [ ] Create SocialTab placeholder screen
- [ ] Add "Coming Soon" messaging

### 11.3 Workout History Screen
**Reference:** Quick Links → Workout Log

**Features:**
- List of all completed workouts (newest first)
- Filter by date range
- Filter by workout type
- Tap workout to view details
- Delete workout option

**Tasks:**
- [ ] Create workout history screen
- [ ] Implement date range filter
- [ ] Add workout type filter
- [ ] Create workout detail view

### 11.4 AI Coach Screen
**Reference:** Quick Links → AI Coach

**Features:**
- Chat interface
- Latest session analysis display
- 30-day overview tab
- Usage tracking (X/15 daily limit)
- Markdown rendering for AI responses

**Tasks:**
- [ ] Create AI Coach chat screen
- [ ] Implement message history
- [ ] Add usage limit display
- [ ] Integrate markdown rendering

### 11.5 Activity Logging Screen
**Reference:** Quick Links → Log Activity

**Features:**
- Quick log form
- Activity type selector (Running, Swimming, Cycling, Tennis, etc.)
- Duration input
- Distance input (optional)
- Calories input (optional)
- Notes field

**Tasks:**
- [ ] Create activity logging screen
- [ ] Implement activity type picker
- [ ] Add duration/distance inputs
- [ ] Save to logged_activities table

---

## 🔄 PHASE 12: ADVANCED FEATURES

### 12.1 Exercise Swap System
**Reference:** During workout, tap exercise to swap

**Features:**
- Tap exercise card → "Swap Exercise" option
- Opens exercise picker filtered by same muscle group
- Swaps exercise but keeps existing sets/reps
- Updates workout session in real-time

**Tasks:**
- [ ] Add "Swap Exercise" button to ExerciseCard
- [ ] Create swap exercise flow
- [ ] Preserve set data when swapping

### 12.2 Personal Records Display
**Reference:** Profile → Stats tab, Progress screen

**Features:**
- List of all PRs by exercise
- Chart showing PR progression over time
- Filter by exercise or muscle group
- Celebrate PR achievements

**Tasks:**
- [ ] Create PR list screen
- [ ] Implement PR progression chart
- [ ] Add exercise/muscle group filter

### 12.3 Goals & Goal Progress
**Reference:** Profile → Overview tab

**Features:**
- Set fitness goals (weight loss/gain, strength, frequency, body fat)
- Track progress toward goals
- Visual progress bars
- Goal achievement celebrations

**Tasks:**
- [ ] Create goals management screen
- [ ] Implement goal progress tracking
- [ ] Add goal achievement notifications

---

## 🧪 TESTING & QA CHECKLIST

### Visual Parity Testing
- [ ] Compare mobile screenshots with web screenshots side-by-side
- [ ] Verify all colors match exactly (use color picker)
- [ ] Check spacing/padding consistency
- [ ] Verify font sizes and weights
- [ ] Test on multiple device sizes (iPhone SE, iPhone 14 Pro, iPad)

### Functional Testing
- [ ] Test all user flows end-to-end
- [ ] Verify data persistence (offline mode)
- [ ] Test workout creation and completion
- [ ] Verify PR detection and celebration
- [ ] Test AI features (generation, coaching)
- [ ] Verify sync between mobile and web

### Performance Testing
- [ ] Measure app launch time
- [ ] Test scrolling performance (60fps)
- [ ] Verify animation smoothness
- [ ] Test with large datasets (100+ workouts, 500+ exercises)

### Accessibility Testing
- [ ] Verify touch target sizes (minimum 44x44)
- [ ] Test with VoiceOver/TalkBack
- [ ] Verify color contrast ratios
- [ ] Test with large text sizes

---

## 📈 PROGRESS TRACKING

### Completed Phases
- ✅ Phase 1: Foundation & Design System
- ✅ Phase 2: Navigation & Layout
- ✅ Phase 3: Dashboard Screen (Basic)
- ✅ Phase 4: Workout Flow (Basic)

### Current Sprint (PRIORITY)
- 🔄 Phase 5: Workout Color System & Launcher

### Upcoming Sprints
- ⏳ Phase 6: Profile Screen Overhaul
- ⏳ Phase 7: Exercise Management Polish
- ⏳ Phase 8: Dashboard Final Enhancements
- ⏳ Phase 9: Consistency Calendar & Dialogs
- ⏳ Phase 10: Visual Polish & Effects
- ⏳ Phase 11: Missing Features
- ⏳ Phase 12: Advanced Features

---

## 🎯 SUCCESS METRICS

**Visual Parity:** 95%+ pixel-perfect match with web app
**Feature Parity:** 100% of web features implemented
**Performance:** 60fps animations, <3s app launch
**User Experience:** Seamless cross-platform experience

---

## 📝 NOTES

**Design Principles:**
- Follow iOS/Android platform conventions where appropriate
- Maintain consistent touch target sizes (min 44x44)
- Use native gestures (swipe, long-press, etc.)
- Optimize for one-handed use
- Ensure accessibility compliance

**Technical Decisions:**
- Use React Native StyleSheet over styled-components for performance
- Leverage Expo SDK for native features
- Keep offline-first architecture
- Maintain TypeScript strict mode
- Follow existing code patterns from web app

**Maintenance:**
- Update this plan as features are completed
- Document any deviations from web reference
- Track technical debt and refactoring opportunities
- Maintain changelog of significant changes
