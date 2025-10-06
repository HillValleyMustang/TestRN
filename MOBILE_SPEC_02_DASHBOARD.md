# Mobile App Specification: Dashboard Page
**React Native Implementation for iOS/Android**

---

## VISUAL PARITY REFERENCE

**Purpose:** These screenshots serve as the visual source of truth. Spacing, typography, component order, and color application must match exactly.

**Reference Screenshots:**
1. **Dashboard (full scroll)** - Shows complete component order and staggered animations
2. **Weekly Target with circles** - Shows color-coded completion states
3. **Previous Workouts "View Summary"** - Shows workout cards with colored borders
4. **Action Hub grid** - Shows 3×2 button layout
5. **All Workouts pills** - Shows workout pills with play buttons

**Acceptance Criteria:**
- Spacing, typography, and order must match sections 1.2 and 1.3 exactly
- Component order must be: Header → Weekly Target → Action Hub → Gym Toggle (conditional) → Next Workout → All Workouts → Volume Chart → Previous Workouts
- Staggered animation timing must be: 0.0s → 0.7s in 0.1s increments

---

## ROUTING REFERENCE

### Workout Color System
All workout-type styling uses the centralized utility:

```typescript
import { getWorkoutColor } from '@/lib/workout-colors';

// Returns { main: string, light: string }
const colors = getWorkoutColor('Push'); // { main: '#228B22', light: '#2ea32e' }
```

**Implementation:** `apps/mobile/lib/workout-colors.ts` (already implemented)

**Used in:** Weekly Target circles, Next Workout button, All Workout pills, Previous Workouts borders

### Navigation Targets
Explicit navigation destinations from Dashboard:

**Primary Actions:**
- "Start Workout" (Next Workout card) → `/workout?workoutId={id}`
- "Play" button (All Workouts) → `/workout?workoutId={id}`
- "View All History" button → `/workout-history`

**Quick Links (Action Hub):**
- Log Activity → Opens Activity Logging Dialog
- AI Coach → Opens AI Coach Dialog
- Workout Log → Opens Workout Performance Modal
- Consistency Calendar → Opens Consistency Calendar Modal
- More → Dropdown with:
  - Start Workout → `/workout`
  - Manage Exercises → `/manage-exercises`
  - Manage T-Paths → `/manage-t-paths`
  - Profile Settings → `/profile?tab=settings&edit=true`

**Other Navigations:**
- Completed circle (Weekly Target) → Opens Workout Summary Modal with `sessionId`
- Calendar icon (Weekly Target) → Opens Consistency Calendar Modal
- "View Summary" (Previous Workouts) → Opens Workout Summary Modal with `sessionId`

---

## 1. PAGE STRUCTURE

### 1.1 Layout Container
- **Padding:** 8px (p-2) on mobile
- **Vertical Gap:** 24px (gap-6) between all cards
- **Background:** `background` color
- **Scroll:** Vertical scroll with pull-to-refresh

### 1.2 Component Order (Top to Bottom)
1. Welcome Header
2. **Rolling Status Badge** (immediately below header)
3. Weekly Target Widget
4. Action Hub (Quick Links)
5. Gym Toggle (conditional: only if >1 gym)
6. Next Workout Card
7. All Workouts Quick Start
8. Weekly Volume Chart
9. Previous Workouts Card

### 1.3 Staggered Animations
Each card has a fade-in-slide-up animation with delays:
- Header: 0.0s
- Rolling Status Badge: 0.05s
- Weekly Target: 0.1s
- Action Hub: 0.2s
- Gym Toggle: 0.3s
- Next Workout: 0.4s
- All Workouts: 0.5s
- Volume Chart: 0.6s
- Previous Workouts: 0.7s

**Animation Specs:**
- Duration: 400ms
- Easing: ease-out
- Transform: translateY(-10px) to translateY(0)
- Opacity: 0 to 1

---

## 2. WELCOME HEADER

### 2.1 Layout
- **Not a card** - just text on background
- **Flex:** Column layout
- **Margin Bottom:** Included in 24px gap

### 2.2 Heading
- **Text:** "{welcomeText} {athleteName}"
- **Logic:**
  - If account <5 minutes old: "Welcome {name}"
  - If account ≥5 minutes old: "Welcome Back, {name}"
- **Typography:**
  - Size: 36px (text-4xl)
  - Weight: Bold (700)
  - Letter Spacing: Tight (-0.025em)
  - Color: Foreground

### 2.3 Subtitle
- **Text:** "Ready to Train? Let's get Started!"
- **Typography:**
  - Size: 14px (text-sm)
  - Color: Muted foreground
  - Top Margin: 8px (mt-2)

---

## 2.5 ROLLING STATUS BADGE (Dashboard Placement)

**📌 Note:** This badge mirrors the header badge state. See MOBILE_SPEC_01_LAYOUT_NAVIGATION.md Section 1.3 for complete specifications.

**Placement:** Immediately below Welcome Header, before Weekly Target Widget

**Behavior:**
- Renders same component as header badge
- Shows same state (7 possible states)
- Tap opens "Workout Status Explained" modal
- Animation delay: 0.05s (between header and Weekly Target)

**States:** Getting into it, Building Momentum, In the Zone, On Fire, Offline, Updating Plan, Temp Success Message

---

## 3. WEEKLY TARGET WIDGET

### 3.1 Card Container
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color
- **Shadow:** None (flat design)
- **Padding:** 0 (applied to header/content separately)

### 3.2 Card Header
- **Padding:** 8px bottom (pb-2)
- **Display:** Flex row, space-between, items centered

**Title (Left):**
- **Display:** Flex row, gap 8px, items centered
- **Icon:** Dumbbell (20px, primary color)
- **Text:** "Weekly Target"
  - Size: 18px (text-lg)
  - Weight: Semibold (600)

**Calendar Icon Button (Right):**
- **Variant:** Ghost
- **Size:** 32x32px (size="icon")
- **Icon:** CalendarDays (16px, muted-foreground)
- **Action:** Opens Consistency Calendar modal

### 3.3 Card Content

**Circles Container:**
- **Display:** Flex row, gap 8px (space-x-2)
- **Justify:** Center
- **Padding:** 4px vertical top (pt-1)

**Each Circle:**
- **Size:** 40x40px (h-10 w-10)
- **Border Radius:** Full circle (rounded-full)
- **Border:** 2px solid (when incomplete)
- **Display:** Flex, centered
- **Font:** 14px, semibold (text-sm font-semibold)
- **Transition:** all 200ms

**Circle States:**

1. **Completed Circle:**
   - Background: **Dynamic workout color** from `getWorkoutColor(workoutName).main`
   - Icon: CheckCircle (20px, white)
   - Text Color: White
   - No border
   - Cursor: Pointer
   - Hover: Scale 110%
   - **Action:** Opens Workout Summary Modal with `sessionId`

2. **Incomplete Circle:**
   - Background: Card background
   - Border: 2px solid **dynamic workout color** from `getWorkoutColor(workoutName).main`
   - Text: First letter of workout name
     - "U" for Upper Body A/B
     - "L" for Lower Body A/B
     - "P" for Push
     - "P" for Pull (yes, same letter)
     - "L" for Legs
   - Text Color: **Dynamic workout color**
   - No hover/click

**Workout Color Examples:**
- Push → `getWorkoutColor('Push')` → #228B22
- Pull → `getWorkoutColor('Pull')` → #F89C4D
- Legs → `getWorkoutColor('Legs')` → #B645D9
- Upper Body A → `getWorkoutColor('Upper Body A')` → #1e3a8a
- Upper Body B → `getWorkoutColor('Upper Body B')` → #EF4444
- Lower Body A → `getWorkoutColor('Lower Body A')` → #0891b2
- Lower Body B → `getWorkoutColor('Lower Body B')` → #6b21a8

**Display Logic:**
- PPL: Show 3 circles (Push, Pull, Legs)
- ULUL: Show 4 circles (Upper A, Lower A, Upper B, Lower B)
- If completed >goal: Show all completed circles

### 3.4 Progress Text
- **Text:** "{completedCount} / {goalTotal} Workouts Completed This Week"
- **Typography:**
  - Size: 14px (text-sm)
  - Color: Muted foreground
  - Align: Center
  - Top Margin: 8px

### 3.5 Activities Link (Conditional)
- **Show:** Only if completed_activities.length > 0
- **Variant:** Link button (underlined text)
- **Text:** "{count} Activity/Activities Completed This Week"
- **Size:** 14px (text-sm)
- **Color:** Muted foreground
- **Padding:** 0, auto height
- **Action:** Opens Weekly Activity Summary dialog

### 3.6 Loading State
- **Show:** Skeleton placeholder (40px height, full width)
- **Content Area:** 80px height (h-20)

### 3.7 Error State
- **Icon:** AlertCircle (20px, red/destructive)
- **Text:** "Failed to load weekly target."
- **Color:** Destructive
- **Align:** Center

### 3.8 Empty State (No Program Type)
- **Text:** "No programme type set. Complete onboarding or set one in your profile."
- **Color:** Muted foreground
- **Align:** Center
- **Padding:** 16px vertical (py-4)

---

## 4. ACTION HUB (QUICK LINKS)

### 4.1 Card Container
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color
- **Shadow:** None
- **Padding:** 0

### 4.2 Card Header
- **Padding Bottom:** 8px (pb-2)
- **Title:** "Quick Links"
  - Size: 20px (text-xl)
  - Weight: Semibold (600)
  - Align: Center

### 4.3 Grid Layout
- **Type:** Grid
- **Columns:** 3
- **Rows:** 2
- **Gap:** 12px (gap-3)
- **Padding:** 16px all sides (p-4), 8px top (pt-2)

### 4.4 Action Buttons (6 Cells)

**Button Container (Each):**
- **Variant:** Outline
- **Height:** Full (stretches to grid cell height)
- **Width:** Full
- **Padding:** 8px (p-2)
- **Border:** None (border-0)
- **Shadow:** Small (shadow-sm)
- **Hover Shadow:** Medium (hover:shadow-md)
- **Transition:** all 100ms ease-out
- **Active Scale:** 98% (active:scale-[0.98])
- **Display:** Flex column, centered, gap 4px
- **Font:** 14px semibold, tight line-height

**Button 1: Log Activity (Row 1, Col 1)**
- **Icon:** Activity (20px, chart-2 color #F97316 orange)
- **Stroke Width:** 2.5
- **Text:** "Log Activity"
- **Action:** Opens Activity Logging Dialog

**Button 2: AI Coach (Row 1, Col 2)**
- **Icon:** Sparkles (20px, chart-4 color #FBBF24 yellow)
- **Stroke Width:** 2.5
- **Text:** "AI Coach"
- **Action:** Opens AI Coach Dialog

**Button 3: Workout Log (Row 1, Col 3)**
- **Icon:** History (20px, chart-1 color #3B82F6 blue)
- **Stroke Width:** 2.5
- **Text:** "Workout Log"
- **Action:** Opens Workout Performance Modal

**Button 4: Consistency Calendar (Row 2, Col 1-2 SPAN)**
- **Grid:** col-span-2 (takes 2 columns)
- **Icon:** CalendarDays (20px, chart-5 color #8B5CF6 purple)
- **Stroke Width:** 2.5
- **Text:** "Consistency Calendar"
- **Action:** Opens Consistency Calendar Modal

**Button 5: More (Row 2, Col 3)**
- **Icon:** ChevronDown when closed, ChevronUp when open (20px)
- **Stroke Width:** 2.5
- **Text:** "More"
- **Action:** Opens dropdown menu

**More Dropdown Menu:**
- **Align:** End (right side)
- **Items:**
  1. Start Workout
     - Icon: Dumbbell (16px)
     - Action: Navigate to `/workout`
  2. Manage Exercises
     - Icon: Dumbbell (16px)
     - Action: Navigate to `/manage-exercises`
  3. Manage T-Paths
     - Icon: LayoutTemplate (16px)
     - Action: Navigate to `/manage-t-paths`
  4. Profile Settings (Edit)
     - Icon: Settings (16px)
     - Action: Navigate to `/profile?tab=settings&edit=true`

---

## 5. GYM TOGGLE

### 5.1 Visibility Logic
- **Show:** Only if userGyms.length > 1
- **Hide:** If loading OR only 1 gym OR no gyms

### 5.2 Card Container
- **Width:** Full width, max 360px (w-full max-w-xs)
- **Margin:** Centered (mx-auto)
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color
- **Shadow:** Small (shadow-sm)
- **Padding:** 0

### 5.3 Card Content
- **Padding:** 8px (p-2)
- **Display:** Flex row, space-between, items centered, gap 8px

**Left Button (Previous Gym):**
- **Variant:** Ghost
- **Size:** 32x32px (h-8 w-8, size="icon")
- **Icon:** ChevronLeft (20px)
- **Action:** Cycle to previous gym (wraps around)

**Center Content:**
- **Display:** Flex column, centered, text-center

**Label:**
- **Text:** "Active Gym"
- **Size:** 12px (text-xs)
- **Color:** Muted foreground

**Gym Name:**
- **Display:** Flex row, gap 4px, items centered
- **Icon:** Home (16px, h-4 w-4)
- **Text:** Gym name
- **Size:** 14px (text-sm)
- **Weight:** Semibold (600)

**Right Button (Next Gym):**
- **Variant:** Ghost
- **Size:** 32x32px
- **Icon:** ChevronRight (20px)
- **Action:** Cycle to next gym (wraps around)

**Behavior on Gym Switch:**
- Dashboard content re-queries for new active gym
- Next Workout and All Workouts update to show new gym's T-Paths
- Triggers profile refresh

### 5.4 Loading State
- **Component:** Skeleton (48px height, 192px width)

---

## 6. NEXT WORKOUT CARD

### 6.1 Card Container
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color
- **Min Height:** 120px (content area)

### 6.2 Card Header
- **Title:** "Your Next Workout"
  - Icon: Dumbbell (20px)
  - Size: 20px (text-xl)
  - Weight: Semibold
  - Align: Center
  - Gap: 8px

### 6.3 Card Content (Success State)

**Layout:**
- **Display:** Flex column on mobile, row on desktop
- **Justify:** Space-between
- **Items:** Start (mobile), Center (desktop)
- **Gap:** 16px (gap-4)

**Left Section:**
- **Display:** Flex column, gap 4px

**Workout Name:**
- **Size:** 18px (text-lg)
- **Weight:** Semibold (600)
- **Min Height:** 28px (1.75rem) - prevents layout shift

**Duration Row:**
- **Display:** Flex row, gap 4px, items centered
- **Icon:** Clock (16px, muted)
- **Text:** "Estimated {duration}"
- **Size:** 14px
- **Color:** Muted foreground
- **Min Height:** 20px

**Last Workout Text:**
- **Text:** "Last workout: {workoutName}"
- **Size:** 12px (text-xs)
- **Color:** Muted foreground
- **Min Height:** 16px

**Right Section:**
- **Button Variant:** Default
- **Size:** Large (lg)
- **Background:** **Dynamic workout color** from `getWorkoutColor(nextWorkout.template_name).main`
- **Text:** "Start Workout" (white)
- **Action:** Navigate to `/workout?workoutId={id}`

**Workout Color Examples:**
- Push → #228B22 (green)
- Pull → #F89C4D (orange)
- Legs → #B645D9 (purple)
- Upper A → #1e3a8a (blue)
- Upper B → #EF4444 (red)
- Lower A → #0891b2 (cyan)
- Lower B → #6b21a8 (purple)

### 6.4 Error States

**Data Error:**
- **Text:** "Error loading next workout: {error}"
- **Color:** Destructive

**No Active Gym:**
- **Text:** "No active gym selected. Please set one in your profile."
- **Color:** Muted foreground
- **Align:** Center
- **Padding:** 16px vertical (py-4)
- **Button:** "Go to Profile Settings"
  - Size: Small
  - Action: Navigate to `/profile`

**Gym Not Configured:**
- **Text:** 'Your active gym "{name}" has no workout plan. Go to Manage T-Paths to set one up.'
- **Link:** "Manage T-Paths" (underlined, primary color)
- **Align:** Center
- **Padding:** 16px vertical

**No Active T-Path:**
- **Text:** "No active Transformation Path found or no workouts defined for your current session length. Complete onboarding or set one in your profile to get started."
- **Align:** Center
- **Padding:** 16px vertical

### 6.5 Loading State
- **Content Area:** 120px height, blank (no skeleton)

### 6.6 Fade-In Animation
- **Animation:** Fast fade-in (200ms)
- **Only on content render** (not loading/error states)

---

## 7. ALL WORKOUTS QUICK START

### 7.1 Card Container
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color
- **Min Height:** 120px (content area)

### 7.2 Card Header
- **Title:** "All Workouts"
  - Icon: Dumbbell (20px)
  - Size: 20px (text-xl)
  - Weight: Semibold
  - Align: Center
  - Gap: 8px

### 7.3 Card Content (Success State)

**Program Name:**
- **Text:** Active T-Path template_name
- **Size:** 18px (text-lg)
- **Weight:** Semibold (600)
- **Margin Bottom:** 12px (mb-3)

**Workouts Grid:**
- **Layout:** Grid
- **Columns:** 1 on mobile, 2 on desktop (grid-cols-1 sm:grid-cols-2)
- **Gap:** 12px (gap-3)

**Each Workout Row:**
- **Display:** Flex row, gap 8px, items centered

### 7.4 Workout Pills

**Pill Component:**
- **Height:** 56px (h-14)
- **Padding:** 12px horizontal (pl-3 pr-3)
- **Border Radius:** 16px (rounded-2xl)
- **Border:** 2px solid
- **Display:** Flex row, gap 8px, items centered
- **Transition:** all 200ms ease-out
- **Flex:** 1 (flex-1, stretches to fill available space)
- **Width:** Full

**Unselected State (Always, not interactive):**
- **Background:** Muted (#F3F4F6)
- **Border Color:** **Dynamic workout color** from `getWorkoutColor(workout.template_name).main`
- **Text Color:** **Dynamic workout color**
- **Scale:** 95% (scale-95)
- **Shadow:** None

**Icon (Left):**
- **Size:** 24x24px (w-6 h-6)
- **Color:** **Dynamic workout color**
- **Stroke Width:** 2.5

**Icon Mapping:**
- Upper Body A/B: ArrowUp
- Lower Body A/B: ArrowDown
- Push: ArrowUpRight
- Pull: ArrowDownLeft
- Legs: Footprints

**Text Container (Right):**
- **Display:** Flex column, gap 0, text-left

**Workout Name:**
- **Size:** 14px (text-sm)
- **Weight:** Semibold (600)
- **Line Height:** Tight
- **Whitespace:** No wrap
- **Color:** **Dynamic workout color**

**Last Completed:**
- **Size:** 12px (text-xs)
- **Weight:** Medium (500)
- **Line Height:** Tight
- **Color:** **Dynamic workout color**, 80% opacity

**Format:**
- "Just now" if <1 minute
- "{n}m ago" if <1 hour
- "{n}h ago" if <1 day
- "{n}d ago" if ≥1 day
- "Never" if null

### 7.5 Play Button

**Button:**
- **Variant:** Default (primary)
- **Size:** Icon (40x40px)
- **Icon:** Play (16px, h-4 w-4)
- **Flex:** shrink-0
- **Action:** Navigate to `/workout?workoutId={id}`

### 7.6 Error States
(Same as Next Workout Card - see section 6.4)

### 7.7 Loading State
- **Content Area:** 120px height, blank

---

## 8. WEEKLY VOLUME CHART

### 8.1 Card Container
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color

### 8.2 Card Header
- **Title:** "Weekly Workout Volume"
  - Size: 20px (text-xl)
  - Weight: Semibold
  - Align: Center

### 8.3 Card Content

**Chart Container:**
- **Height:** 250px (h-[250px])
- **Width:** 100%
- **Responsive:** Yes (ResponsiveContainer or React Native equivalent)

**Chart Type:** Bar Chart

**Chart Configuration:**
- **Margin:** { top: 5, right: 10, left: 10, bottom: 5 }
- **Grid:** Dashed lines (if supported on React Native)

**X-Axis:**
- **Data Key:** "date"
- **Formatter:** Short date (e.g., "Jan 5")
- **Format:** month (short) + day (numeric)

**Y-Axis:**
- **Formatter:** 
  - If ≥1000: "{value/1000}k" (e.g., "2k")
  - If <1000: "{value.toLocaleString()}"
- **Label:** "Volume (kg)"
  - Angle: -90°
  - Position: Left
  - Size: 12px

**Bar:**
- **Data Key:** "volume"
- **Fill:** Primary color
- **Name:** "Volume"

**Tooltip:**
- **Formatter:** "{value.toLocaleString()} kg"
- **Label:** "Volume"

**Legend:**
- **Shown:** Yes

**React Native Implementation:**
- Consider using `react-native-svg-charts` or `victory-native`
- Maintain same visual appearance as web version

### 8.4 Empty State
- **Height:** 250px
- **Display:** Flex, centered
- **Text:** "No workout volume data available. Log some workouts to see your progress!"
- **Color:** Muted foreground
- **Animation:** Fast fade-in

### 8.5 Error State
- **Height:** 350px
- **Display:** Flex, centered
- **Text:** "Error: {error}"
- **Color:** Destructive

### 8.6 Loading State
- **Content Area:** 250px height, blank

---

## 9. PREVIOUS WORKOUTS CARD

### 9.1 Card Container
- **Border Radius:** 12px (rounded-xl)
- **Border:** 1px solid `border` color
- **Background:** Card color

### 9.2 Card Header
- **Title:** "Previous Workouts"
  - Icon: History (20px)
  - Size: 20px (text-xl)
  - Weight: Semibold
  - Align: Center
  - Gap: 8px

### 9.3 Card Content (Success State)

**Workouts Container:**
- **Display:** Flex column
- **Gap:** 12px (space-y-3)
- **Animation:** Fast fade-in

**Show:** Last 3 completed workouts (slice(0, 3))

### 9.4 Workout Card (Each)

**Outer Card:**
- **Border:** 2px solid (border-2)
- **Border Color:** **Dynamic workout color** from `getWorkoutColor(workout.template_name).main`
- **Border Radius:** 8px (rounded-lg)
- **Background:** Card color

**Top Section:**
- **Display:** Flex row, space-between, items centered
- **Padding:** 12px (p-3)

**Left Content:**
- **Display:** Flex column

**Workout Name:**
- **Size:** 16px (text-base)
- **Weight:** Semibold (600)
- **Line Height:** Tight (leading-tight)
- **Color:** **Dynamic workout color** from `getWorkoutColor(workout.template_name).main`
- **Align:** Center

**Time Ago:**
- **Size:** 12px (text-xs)
- **Color:** Muted foreground
- **Line Height:** Tight

**Time Ago Format:**
- "Just now" if <1 minute
- "{n}m ago" if <1 hour
- "{n}h ago" if <1 day
- "{n}d ago" if ≥1 day
- "N/A" if no completed_at

**Right Content:**
- **Button:** Outline, icon size (40x40px)
- **Icon:** Eye (16px, h-4 w-4)
- **Title:** "View Summary"
- **Action:** Opens Workout Summary Modal with `sessionId`

**Bottom Section:**
- **Padding:** 0 top, 12px bottom, 12px horizontal (pt-0 pb-3 px-3)
- **Display:** Flex row, gap 12px, items centered
- **Size:** 12px (text-xs)
- **Color:** Muted foreground

**Exercise Count:**
- **Icon:** Dumbbell (12px, h-3 w-3)
- **Text:** "{count} Exercises"
- **Gap:** 4px

**Duration:**
- **Icon:** Timer (12px, h-3 w-3)
- **Text:** Duration string (e.g., "45 minutes") or "N/A"
- **Gap:** 4px

### 9.5 View All Button

**Button:**
- **Variant:** Ghost
- **Width:** Full (w-full)
- **Justify:** Center
- **Color:** Primary (text-primary)
- **Hover:** Primary/90
- **Icon:** ArrowRight (16px, h-4 w-4, margin-left 8px)
- **Text:** "View All History"
- **Action:** Navigate to `/workout-history`

### 9.6 Empty State
- **Text:** "No previous workouts found. Complete a workout to see it here!"
- **Color:** Muted foreground
- **Animation:** Fast fade-in

### 9.7 Error State
- **Text:** "Error: {error}"
- **Color:** Destructive
- **Align:** Center

### 9.8 Loading State
- **Content Area:** 300px height, blank

---

## 10. MODALS & DIALOGS

### 10.1 Workout Summary Modal
- **Trigger:** Tap completed circle in Weekly Target OR tap Eye icon in Previous Workouts
- **Props:** `sessionId` (required)
- **Content:** Complete workout summary (exercises, sets, reps, weight, PRs, duration)
- **Data Source:** Supabase `workout_sessions` table joined with `set_logs`

### 10.2 Consistency Calendar Modal
- **Trigger:** Tap calendar icon in Weekly Target header OR tap Consistency Calendar in Action Hub
- **Content:** Calendar view of all workouts/activities with color-coded days
- **Color Coding:** Use `getWorkoutColor()` for each workout type

### 10.3 Weekly Activity Summary Dialog
- **Trigger:** Tap "{n} Activities Completed This Week" link in Weekly Target
- **Content:** List of completed activities (type, distance, time, date)

### 10.4 Activity Logging Dialog
- **Trigger:** Tap "Log Activity" in Action Hub OR hamburger menu
- **Content:** Form to log cardio/activity (type, distance, time, date)

### 10.5 AI Coach Dialog
- **Trigger:** Tap "AI Coach" in Action Hub
- **Content:** Chat interface with AI coach for motivation/form tips

### 10.6 Workout Performance Modal
- **Trigger:** Tap "Workout Log" in Action Hub
- **Content:** Detailed workout history with performance metrics

---

## 11. WORKOUT LAUNCHER (NEW SCREEN)

**Purpose:** A dedicated screen showing all workouts in the active program with color-coded pills. This is accessed from Dashboard's "All Workouts" card or directly via navigation.

### 11.1 Screen Layout
- **Title:** "Choose Your Workout"
- **Layout:** Single column (mobile), centered
- **Padding:** 16px horizontal
- **Background:** Background color

### 11.2 Workout Pills Grid
- **Layout:** Grid, 1 column on mobile
- **Gap:** 12px (gap-3)
- **Pills:** Same component as "All Workouts" section (7.4)

**Items:**
- **PPL:** Push, Pull, Legs + Ad-Hoc option
- **ULUL:** Upper A, Lower A, Upper B, Lower B + Ad-Hoc option
- **Ad-Hoc:** Distinct color (bonus/ad-hoc mapping: #F59E0B)

### 11.3 Actions
- **Tap a pill:** Navigate to `/workout?workoutId={id}`
- **Tap Ad-Hoc:** Navigate to `/workout?adHoc=true`

**Color Application:**
- All pills use `getWorkoutColor(workoutName)` for borders, text, and icons

---

## 12. PULL-TO-REFRESH

### 12.1 Behavior
- **Gesture:** Pull down from top of dashboard
- **Indicator:** Native pull-to-refresh indicator (platform-specific)
- **Action:** Refresh all dashboard data
  - Weekly summary
  - T-Paths and workouts
  - Gym data
  - Volume chart data
  - Workout history
  - Rolling status

### 12.2 Implementation
- Use ScrollView with `refreshControl` prop (React Native)
- Set `refreshing` state during data fetch
- Clear `refreshing` after all data loaded
- Show toast on refresh complete or error

---

## 13. DATA REQUIREMENTS

### 13.1 User Profile Data
- `profiles.full_name` or `first_name` - for welcome message
- `profiles.created_at` - to determine "Welcome" vs "Welcome Back"
- `profiles.programme_type` - "ppl" or "ulul" for Weekly Target
- `profiles.active_t_path_id` - for Next Workout and All Workouts
- `profiles.preferred_session_length` - for duration estimation
- `profiles.active_gym_id` - for gym toggle and filtering
- `profiles.rolling_workout_status` - for Rolling Status Badge

### 13.2 Weekly Summary Data
- `completed_workouts` array:
  - `id` (session ID)
  - `name` (workout name)
- `goal_total` (target workouts per week)
- `programme_type` ("ppl" or "ulul")
- `completed_activities` array (optional):
  - `id`, `type`, `distance`, `time`, `date`

### 13.3 T-Paths Data
- `groupedTPaths` array of grouped T-Paths:
  - `mainTPath`:
    - `id`, `template_name`, `gym_id`
  - `childWorkouts` array:
    - `id`, `template_name`, `last_completed_at`

### 13.4 Gyms Data
- `userGyms` array:
  - `id`, `name`
- `activeGym`:
  - `id`, `name`

### 13.5 Workout Exercises Cache
- `workoutExercisesCache` object:
  - Key: workout ID
  - Value: array of exercises with `is_bonus_exercise` flag

### 13.6 Volume Chart Data
- Array of { date, volume } for last 7 days

### 13.7 Workout History Data
- Last 3 sessions:
  - `id`, `template_name`, `completed_at`, `exercise_count`, `duration_string`

---

## 14. USER JOURNEYS

Document end-to-end flows to ensure dynamic behavior matches the reference app.

### Journey A: Completing a Workout
1. User taps "Start Workout" on Dashboard → Navigate to `/workout?workoutId={id}`
2. User completes workout → Data persisted to Supabase
3. User returns to Dashboard (manual navigation or auto-redirect)
4. Dashboard refreshes (pull-to-refresh supported)

**Effects:**
- Weekly Target updates circles & counts (completed circle shows checkmark)
- Previous Workouts shows new card at top (border color = workout type)
- Rolling Status Badge may show temp success message ("Workout Completed!")
- Next Workout card updates to show next in rotation

### Journey B: Reviewing a Past Workout
1. User scrolls to Previous Workouts section
2. User taps "View Summary" button (Eye icon)
3. Workout Summary Modal opens with `sessionId`
4. Modal shows sets/reps/weight/duration/PRs

**Modal Data:**
- Fetched from `workout_sessions` table
- Joined with `set_logs` table
- Shows PR indicators if any new records set

### Journey C: Consistency View
1. User taps calendar icon in Weekly Target header OR
2. User taps "Consistency Calendar" in Action Hub
3. Consistency Calendar Modal opens
4. Modal renders color-coded calendar by workout type

**Calendar Data:**
- Shows all workout sessions from history
- Color-codes each day by workout type (using `getWorkoutColor()`)
- Shows current streak count

### Journey D: Switching Gyms
1. User has >1 gym → Gym Toggle is visible
2. User taps left/right chevrons to cycle gyms (wrap-around)
3. Active gym updates in Supabase (`profiles.active_gym_id`)
4. Dashboard content re-queries for active gym

**Effects:**
- Next Workout updates to show next workout for new gym's T-Path
- All Workouts updates to show new gym's T-Path workouts
- Profile refresh triggered automatically

---

## 15. RESPONSIVE BEHAVIOR

### 15.1 Mobile (Default)
- **Padding:** 8px horizontal
- **Cards:** Full width
- **Grids:** Single column (except Action Hub which is 3×2)
- **Buttons:** Full width or icon size

### 15.2 Tablet/Desktop
- **Padding:** 16px horizontal
- **Max Width:** Consider constraining to readable width (800-1000px)
- **Grids:** 2 columns where appropriate (All Workouts)
- **Flex Rows:** Next Workout uses row layout on larger screens

---

## 16. ANIMATIONS & TRANSITIONS

### 16.1 Card Entrance Animations
- **Type:** Fade-in-slide-up
- **Duration:** 400ms
- **Delays:** Staggered 100ms increments (0.0s to 0.7s)
- **Transform:** translateY(-10px) → translateY(0)
- **Opacity:** 0 → 1
- **Easing:** ease-out

### 16.2 Button Interactions
- **Hover:** Shadow increase (sm → md), 200ms
- **Active:** Scale 98%, shadow decrease, 100ms
- **Tap Feedback:** Use platform-specific (iOS haptic, Android ripple)

### 16.3 Pill Animations
- **Scale:** 95% (unselected) → 100% (hover) → 95% (active)
- **Transition:** all 200ms ease-out

### 16.4 Chart Animations
- **Bars:** Animate from 0 height to data height, 500ms (if supported on React Native)
- **Easing:** ease-in-out

---

## 17. ERROR HANDLING

### 17.1 Data Fetch Errors
- **Weekly Target:** Show error message with icon, allow retry via pull-to-refresh
- **Next Workout:** Show error state with explanation
- **All Workouts:** Show error state
- **Volume Chart:** Show error card, prevent crash
- **Previous Workouts:** Show error message

### 17.2 Missing Data Scenarios
- **No Active Gym:** Clear message + link to profile settings
- **No Active T-Path:** Onboarding prompt
- **Empty Workout List:** Encouraging empty state message
- **No Volume Data:** Prompt to log workouts

### 17.3 Network Errors
- **Pull-to-refresh:** Enable for manual retry
- **Toast Messages:** Show network error toasts
- **Offline Mode:** Indicate offline status in Rolling Status Badge

---

## 18. ACCESSIBILITY

### 18.1 Touch Targets
- **Minimum:** 44x44px for all interactive elements
- **Circles:** 40x40px (acceptable for adults, but consider 44x44)
- **Buttons:** 40x40px minimum (icon buttons)
- **Pills:** 56px height (exceeds minimum)

### 18.2 Screen Readers
- **Workout Names:** Read full name, not abbreviations
- **Circles:** Announce "Completed" or "Incomplete" + workout name
- **Buttons:** Descriptive labels (e.g., "View workout summary for Push workout")
- **Charts:** Provide data table alternative or summary

### 18.3 Color Contrast
- **Text on Colored Backgrounds:** Ensure WCAG AA (4.5:1)
- **Workout Colors:** All meet contrast requirements with white text
- **Border Colors:** Distinguishable from background

---

## 19. IMPLEMENTATION CHECKLIST

### Core Components
- [ ] Welcome header with dynamic greeting
- [ ] Rolling Status Badge (dashboard placement)
- [ ] Weekly Target Widget with dynamically colored circles
- [ ] Action Hub with 6 quick links and More dropdown
- [ ] Gym Toggle with carousel navigation
- [ ] Next Workout Card with dynamically colored button
- [ ] All Workouts Quick Start with dynamically colored pills
- [ ] Weekly Volume Chart (React Native charting library)
- [ ] Previous Workouts Card with dynamically colored workout cards

### Data Integration
- [ ] Fetch weekly summary from Supabase
- [ ] Fetch grouped T-Paths and workouts
- [ ] Fetch gym data and active gym
- [ ] Fetch workout exercises cache for duration
- [ ] Fetch volume chart data
- [ ] Fetch workout history (last 3)
- [ ] Fetch rolling status from profile

### Color System Integration
- [ ] Import `getWorkoutColor()` from `@/lib/workout-colors`
- [ ] Apply to Weekly Target circles (completed & incomplete)
- [ ] Apply to Next Workout button background
- [ ] Apply to All Workouts pill borders, text, icons
- [ ] Apply to Previous Workouts card borders, text
- [ ] Verify no stray hex values for workout types

### Interactions
- [ ] Pull-to-refresh functionality
- [ ] Tap completed circle → Workout Summary Modal with `sessionId`
- [ ] Tap calendar icon → Consistency Calendar Modal
- [ ] Tap action buttons → respective modals/dialogs
- [ ] Tap gym chevrons → switch active gym (triggers data refresh)
- [ ] Tap "Start Workout" → navigate to `/workout?workoutId={id}`
- [ ] Tap Play button → navigate to `/workout?workoutId={id}`
- [ ] Tap "View Summary" → Workout Summary Modal with `sessionId`
- [ ] Tap "View All History" → navigate to `/workout-history`

### Visual Polish
- [ ] Staggered entrance animations (9 delays: 0.0s to 0.7s)
- [ ] Fast fade-in for content reveals (200ms)
- [ ] Workout color system applied consistently via utility
- [ ] Shadows and elevations matching design
- [ ] Border radius and spacing consistency

### Testing
- [ ] Test with PPL program (3 circles)
- [ ] Test with ULUL program (4 circles)
- [ ] Test with multiple gyms (toggle shows)
- [ ] Test with single gym (toggle hidden)
- [ ] Test with no active gym (error states)
- [ ] Test with no workouts completed (empty states)
- [ ] Test all error scenarios
- [ ] Test pull-to-refresh on various data states
- [ ] Test on small and large screens
- [ ] Test with screen readers (VoiceOver/TalkBack)
- [ ] Verify all workout colors render correctly
- [ ] Test all modal/dialog openings with correct data

---

## APPENDIX A: PARITY CHECKLIST

Use this checklist to verify 100% visual and functional parity with the reference web app.

### Structure & Layout
- [ ] Component order matches: Header → Rolling Badge → Weekly Target → Action Hub → Gym Toggle (conditional) → Next Workout → All Workouts → Volume Chart → Previous Workouts
- [ ] Staggered animation timings exact: 0.0s to 0.7s in 0.1s increments
- [ ] Spacing between cards: 24px (gap-6)
- [ ] Card padding and typography match reference screenshots

### Welcome Header
- [ ] "Welcome/Welcome Back" logic enforced (<5 minutes vs ≥5 minutes)
- [ ] Name substitution works (full_name or first_name)
- [ ] Typography sizes exact (36px / 14px)
- [ ] Spacing matches screenshot

### Rolling Status Badge
- [ ] Renders immediately under Welcome Header
- [ ] Same component as header badge (shared state)
- [ ] Tap opens Status Explained modal
- [ ] All 7 states render correctly
- [ ] Animations match layout spec (temp message 300ms/3s/300ms)

### Weekly Target
- [ ] 3-4 circles based on programme (PPL/ULUL)
- [ ] Completed circles filled with workout color (via `getWorkoutColor()`)
- [ ] Incomplete circles have colored border with initial
- [ ] Tap targets 40×40px (or 44×44px for better UX)
- [ ] Tap completed circle → Workout Summary Modal with `sessionId`
- [ ] Calendar icon opens Consistency Calendar Modal
- [ ] Progress text accurate: "{completedCount} / {goalTotal} Workouts Completed This Week"

### Action Hub
- [ ] 3×2 grid layout exact
- [ ] "Consistency Calendar" spans 2 columns
- [ ] All 6 buttons present with correct icons and colors
- [ ] More dropdown shows all 4 items
- [ ] All routes wired correctly per routing reference
- [ ] Haptics/ripple on press

### Gym Toggle
- [ ] Shows only if `userGyms.length > 1`
- [ ] Chevrons wrap around (first ↔ last)
- [ ] Centered card with max-width 360px
- [ ] Skeleton on load
- [ ] Data refreshes for new gym on switch

### Next Workout
- [ ] Title, duration, last workout displayed correctly
- [ ] CTA button background color from `getWorkoutColor()`
- [ ] Navigation to `/workout?workoutId={id}` works
- [ ] All error/empty cases handled
- [ ] Fast fade-in animation (200ms)

### All Workouts
- [ ] Program title displays active T-Path name
- [ ] Pills use `getWorkoutColor()` for border/text/icon
- [ ] Time-ago formatting correct (Just now / {n}m ago / {n}h ago / {n}d ago / Never)
- [ ] Play button navigates to `/workout?workoutId={id}`
- [ ] Grid responsive (1 col mobile, 2 col desktop)

### Weekly Volume Chart
- [ ] 250px tall
- [ ] Bars animate from 0 (if supported)
- [ ] Tooltip and legend work
- [ ] Empty/error states render
- [ ] Responsive container works

### Previous Workouts
- [ ] Shows last 3 workouts
- [ ] Border color from `getWorkoutColor()`
- [ ] Text color from `getWorkoutColor()`
- [ ] "View Summary" opens modal with `sessionId`
- [ ] Exercise count and duration display correctly
- [ ] "View All History" routes to `/workout-history`

### Pull-to-Refresh
- [ ] Refreshes all dashboard data sources (summary, T-Paths, gyms, chart, history, rolling status)
- [ ] Single pull refreshes every widget
- [ ] Spinner lifecycle correct

### Color System
- [ ] All workout colors sourced from `getWorkoutColor()` utility
- [ ] No stray hex values for workout types in components
- [ ] Colors consistent across Weekly Target, Next Workout, All Workouts, Previous Workouts

### Error/Empty/Loading States
- [ ] Weekly Target: error, loading, empty (no program type)
- [ ] Next Workout: error, loading, no gym, gym not configured, no T-Path
- [ ] All Workouts: same as Next Workout
- [ ] Volume Chart: error, loading, empty (no data)
- [ ] Previous Workouts: error, loading, empty (no workouts)

---

## APPENDIX B: QA ACCEPTANCE CRITERIA

Before marking this feature complete, all criteria below must be verified:

### Visual Acceptance
- [ ] Match reference screenshots 1:1 (spacing, typography, order, colors)
- [ ] Component order exact per section 1.2
- [ ] Staggered animations timed exactly per section 1.3
- [ ] Workout colors match reference (via `getWorkoutColor()` utility)
- [ ] All cards have correct border radius (12px)
- [ ] All gaps and padding match specifications

### Functional Acceptance
- [ ] Pull-to-refresh reloads all sections listed in section 12
- [ ] Empty/error states render as specified per sections 3.6-3.8, 6.4, 7.6, 8.4-8.5, 9.6-9.8
- [ ] All navigation destinations wired correctly per routing reference
- [ ] Modal `sessionId` passed correctly for workout summaries
- [ ] Gym switch triggers data refresh
- [ ] Rolling Status Badge mirrors header badge state

### Animation Acceptance
- [ ] Staggered animations smooth and timed exactly (0.0s → 0.7s)
- [ ] Fast fade-in for content reveals (200ms)
- [ ] Button interactions smooth (scale, shadow)
- [ ] No animation jank or stuttering

### Data Acceptance
- [ ] Weekly summary data accurate
- [ ] T-Paths and workouts load correctly
- [ ] Gym data and active gym correct
- [ ] Volume chart data accurate
- [ ] Workout history shows last 3
- [ ] Rolling status reflects actual consistency

### Accessibility
- [ ] Touch targets ≥44×44 dp (or 40×40 minimum)
- [ ] Labels for icons present (screen reader)
- [ ] Chart has alt text or summary
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] VoiceOver/TalkBack announcements correct

### Device Testing
- [ ] Tested on small screens (iPhone SE, small Android)
- [ ] Tested on large screens (iPad, Android tablet)
- [ ] Safe areas respected (notch, home indicator)
- [ ] Pull-to-refresh works on all devices
- [ ] All interactions work on touch screens

---

## APPENDIX C: PARITY MATRIX — DASHBOARD (REFERENCE VS RN)

Fill the "RN Current" column during QA to track implementation progress.

| Component | Reference Behavior (source) | RN Current | Parity Requirement (Done when…) | QA |
|-----------|----------------------------|------------|--------------------------------|-----|
| Welcome Header | "Welcome/Welcome Back" logic; name substitution; typography sizes (36 / 14) | | Implements text rules + sizes; spacing matches screenshot; contrast AA | ☐ |
| Rolling Status Badge (dashboard placement) | Renders immediately under header; tap opens Status Explained modal; mirrors header badge states | | Same badge component + states; modal opens with full copy; animations match layout spec | ☐ |
| Weekly Target | 3–4 circles (programme PPL/ULUL); completed=filled; incomplete=border with initial; tap completed → workout summary modal; calendar icon opens Consistency Calendar | | Color via `getWorkoutColor()`; tap targets 40×40; modal opens with correct `sessionId`; calendar icon opens modal | ☐ |
| Action Hub (Quick Links) | 6 buttons, 3×2 grid; "Consistency Calendar" spans 2 cols; destinations defined (Start Workout/Manage/AI Coach/etc.) | | Grid + spacing match; all routes as specified; haptics/ripple present | ☐ |
| Gym Toggle | Shows only if >1 gym; chevrons wrap; centered card; skeleton on load | | Visibility logic correct; wrap-around verified; data refreshes for new gym | ☐ |
| Next Workout | Title, duration, last workout, CTA button in workout color; navigates to `/workout?workoutId={id}`; error/empty cases handled | | Color sourced from `getWorkoutColor()`; navigation param correct; all states render | ☐ |
| All Workouts | Program title; pills per workout with color border/text; Play button navigates to workout; time-ago formatting | | Pill component matches spec; time-ago strings correct; navigation works | ☐ |
| Weekly Volume Chart | 250px tall; bars animate from 0; tooltip + legend; empty/error states defined | | Animation & tooltip wired; empty/error cards render; responsive container works | ☐ |
| Previous Workouts | Show last 3; border color by workout; "View Summary" opens modal; exercise count + duration; "View All History" button | | Border/text use `getWorkoutColor()`; modal gets `sessionId`; view-all routes correctly | ☐ |
| Pull-to-Refresh | Refreshes all dashboard data sources (summary, T-Paths, gyms, chart, history) | | Single pull refreshes every widget; spinner lifecycle correct | ☐ |
| Component Order + Stagger | Order: header→rolling badge→weekly target→…→previous workouts; stagger 0.0–0.7s (100ms steps) | | Order exact; animation timings exact; easing matches | ☐ |
| Error/Empty/Loading | Per-section states implemented verbatim (weekly target, next/all workouts, chart, previous) | | Every state reachable in dev tools; copy/visuals match | ☐ |

---

**Document Version:** 2.0 (Updated with Visual Parity Reference, Routing, User Journeys, and Parity Criteria)  
**Last Updated:** January 6, 2025  
**Status:** Ready for Implementation
