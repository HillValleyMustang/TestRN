# Mobile App Specification: Dashboard Page
**React Native Implementation for iOS/Android**

---

## 1. PAGE STRUCTURE

### 1.1 Layout Container
- **Padding:** 8px (p-2) on mobile
- **Vertical Gap:** 24px (gap-6) between all cards
- **Background:** `background` color
- **Scroll:** Vertical scroll with pull-to-refresh

### 1.2 Component Order (Top to Bottom)
1. Welcome Header
2. Weekly Target Widget
3. Action Hub (Quick Links)
4. Gym Toggle (conditional: only if >1 gym)
5. Next Workout Card
6. All Workouts Quick Start
7. Weekly Volume Chart
8. Previous Workouts Card

### 1.3 Staggered Animations
Each card has a fade-in-slide-up animation with delays:
- Header: 0s
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
   - Background: Workout color (e.g., `bg-workout-push` #228B22 for Push)
   - Icon: CheckCircle (20px, white)
   - Text Color: White
   - No border
   - Cursor: Pointer
   - Hover: Scale 110%
   - Click: Opens workout summary modal

2. **Incomplete Circle:**
   - Background: Card background
   - Border: 2px solid workout color
   - Text: First letter of workout name
     - "U" for Upper Body A/B
     - "L" for Lower Body A/B
     - "P" for Push
     - "P" for Pull
     - "L" for Legs
   - Text Color: Workout color
   - No hover/click

**Workout Colors:**
- Push: #228B22 (forest green)
- Pull: #F89C4D (orange)
- Legs: #B645D9 (purple)
- Upper Body A: #1e3a8a (dark blue)
- Upper Body B: #EF4444 (red)
- Lower Body A: #0891b2 (cyan)
- Lower Body B: #6b21a8 (purple)

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
     - Action: Navigate to /workout
  2. Manage Exercises
     - Icon: Dumbbell (16px)
     - Action: Navigate to /manage-exercises
  3. Manage T-Paths
     - Icon: LayoutTemplate (16px)
     - Action: Navigate to /manage-t-paths
  4. Profile Settings (Edit)
     - Icon: Settings (16px)
     - Action: Navigate to /profile?tab=settings&edit=true

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
- **Background:** Workout color (dynamic)
- **Text:** "Start Workout" (white)
- **Action:** Navigate to /workout?workoutId={id}

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
  - Action: Navigate to /profile

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
- **Border Color:** Workout color
- **Text Color:** Workout color
- **Scale:** 95% (scale-95)
- **Shadow:** None

**Icon (Left):**
- **Size:** 24x24px (w-6 h-6)
- **Color:** Workout color
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
- **Color:** Workout color

**Last Completed:**
- **Size:** 12px (text-xs)
- **Weight:** Medium (500)
- **Line Height:** Tight
- **Color:** Workout color, 80% opacity

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
- **Action:** Navigate to /workout?workoutId={id}

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
- **Responsive:** Yes (ResponsiveContainer)

**Chart Type:** Bar Chart (Recharts)

**Chart Configuration:**
- **Margin:** { top: 5, right: 10, left: 10, bottom: 5 }
- **Grid:** Dashed lines (strokeDasharray="3 3")

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
  - Offset: -10
  - Size: 12px

**Bar:**
- **Data Key:** "volume"
- **Fill:** Primary color (hsl(var(--primary)))
- **Name:** "Volume"

**Tooltip:**
- **Formatter:** "{value.toLocaleString()} kg"
- **Label:** "Volume"

**Legend:**
- **Shown:** Yes

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
- **Border Color:** Workout color (e.g., border-workout-push)
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
- **Color:** Workout color
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
- **Action:** Opens workout summary modal with sessionId

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
- **Action:** Navigate to /workout-history

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
- **Props:** sessionId
- **Content:** Complete workout summary (exercises, sets, reps, weight, PRs, duration)

### 10.2 Consistency Calendar Modal
- **Trigger:** Tap calendar icon in Weekly Target header OR tap Consistency Calendar in Action Hub
- **Content:** Calendar view of all workouts/activities with color-coded days

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

## 11. DATA REQUIREMENTS

### 11.1 User Profile Data
- `profiles.full_name` or `first_name` - for welcome message
- `profiles.created_at` - to determine "Welcome" vs "Welcome Back"
- `profiles.programme_type` - "ppl" or "ulul" for Weekly Target
- `profiles.active_t_path_id` - for Next Workout and All Workouts
- `profiles.preferred_session_length` - for duration estimation
- `profiles.active_gym_id` - for gym toggle and filtering

### 11.2 Weekly Summary Data
- `completed_workouts` array:
  - `id` (session ID)
  - `name` (workout name)
- `goal_total` (target workouts per week)
- `programme_type` ("ppl" or "ulul")
- `completed_activities` array (optional):
  - `id`, `type`, `distance`, `time`, `date`

### 11.3 T-Paths Data
- `groupedTPaths` array of grouped T-Paths:
  - `mainTPath`:
    - `id`, `template_name`, `gym_id`
  - `childWorkouts` array:
    - `id`, `template_name`, `last_completed_at`

### 11.4 Gyms Data
- `userGyms` array:
  - `id`, `name`
- `activeGym`:
  - `id`, `name`

### 11.5 Workout Exercises Cache
- `workoutExercisesCache` object:
  - Key: workout ID
  - Value: array of exercises with `is_bonus_exercise` flag

### 11.6 Volume Chart Data
- Array of { date, volume } for last 7 days

### 11.7 Workout History Data
- Last 3 sessions:
  - `id`, `template_name`, `completed_at`, `exercise_count`, `duration_string`

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

### 12.2 Implementation
- Use ScrollView with `refreshControl` prop (React Native)
- Set `refreshing` state during data fetch
- Clear `refreshing` after all data loaded

---

## 13. RESPONSIVE BEHAVIOR

### 13.1 Mobile (Default)
- **Padding:** 8px horizontal
- **Cards:** Full width
- **Grids:** Single column (except Action Hub)
- **Buttons:** Full width or icon size

### 13.2 Tablet/Desktop
- **Padding:** 16px horizontal
- **Max Width:** Consider constraining to readable width
- **Grids:** 2 columns where appropriate (All Workouts)
- **Flex Rows:** Next Workout uses row layout on larger screens

---

## 14. WORKOUT COLOR SYSTEM

### 14.1 Color Palette
```typescript
const WORKOUT_COLORS = {
  'push': '#228B22',
  'push-light': '#2ea32e',
  'pull': '#F89C4D',
  'pull-light': '#fab86d',
  'legs': '#B645D9',
  'legs-light': '#c966e3',
  'upper-body-a': '#1e3a8a',
  'upper-body-a-light': '#2563eb',
  'upper-body-b': '#EF4444',
  'upper-body-b-light': '#F87171',
  'lower-body-a': '#0891b2',
  'lower-body-a-light': '#06b6d4',
  'lower-body-b': '#6b21a8',
  'lower-body-b-light': '#9333ea',
  'bonus': '#F59E0B',
  'bonus-light': '#FBBF24',
  'ad-hoc': '#F59E0B',
  'ad-hoc-light': '#FBBF24',
};
```

### 14.2 Color Application
- **Weekly Target Circles:** Background when completed, border when incomplete
- **Next Workout Button:** Background color
- **Workout Pills:** Border, text, icon color
- **Previous Workouts Cards:** Border color, text color

### 14.3 Mapping Function
```typescript
function getWorkoutColor(workoutName: string): string {
  // Match exact names and shortened variants
  // Return hex color for background/border
}
```

---

## 15. ANIMATIONS & TRANSITIONS

### 15.1 Card Entrance Animations
- **Type:** Fade-in-slide-up
- **Duration:** 400ms
- **Delays:** Staggered 100ms increments
- **Transform:** translateY(-10px) → translateY(0)
- **Opacity:** 0 → 1
- **Easing:** ease-out

### 15.2 Button Interactions
- **Hover:** Shadow increase (sm → md), 200ms
- **Active:** Scale 98%, shadow decrease, 100ms
- **Tap Feedback:** Use platform-specific (iOS haptic, Android ripple)

### 15.3 Pill Animations
- **Scale:** 95% (unselected) → 100% (hover) → 95% (active)
- **Transition:** all 200ms ease-out

### 15.4 Chart Animations
- **Bars:** Animate from 0 height to data height, 500ms
- **Easing:** ease-in-out

---

## 16. ERROR HANDLING

### 16.1 Data Fetch Errors
- **Weekly Target:** Show error message with icon, allow retry
- **Next Workout:** Show error state with explanation
- **All Workouts:** Show error state
- **Volume Chart:** Show error card, prevent crash
- **Previous Workouts:** Show error message

### 16.2 Missing Data Scenarios
- **No Active Gym:** Clear message + link to profile settings
- **No Active T-Path:** Onboarding prompt
- **Empty Workout List:** Encouraging empty state message
- **No Volume Data:** Prompt to log workouts

### 16.3 Network Errors
- **Pull-to-refresh:** Enable for manual retry
- **Toast Messages:** Show network error toasts
- **Offline Mode:** Indicate offline status in UI

---

## 17. ACCESSIBILITY

### 17.1 Touch Targets
- **Minimum:** 44x44px for all interactive elements
- **Circles:** 40x40px (acceptable for adults)
- **Buttons:** 40x40px minimum (icon buttons)
- **Pills:** 56px height (exceeds minimum)

### 17.2 Screen Readers
- **Workout Names:** Read full name, not abbreviations
- **Circles:** Announce "Completed" or "Incomplete" + workout name
- **Buttons:** Descriptive labels (e.g., "View workout summary for Push workout")
- **Charts:** Provide data table alternative or summary

### 17.3 Color Contrast
- **Text on Colored Backgrounds:** Ensure WCAG AA (4.5:1)
- **Workout Colors:** All meet contrast requirements with white text
- **Border Colors:** Distinguishable from background

---

## 18. IMPLEMENTATION CHECKLIST

### Core Components
- [ ] Welcome header with dynamic greeting
- [ ] Weekly Target Widget with colored circles
- [ ] Action Hub with 6 quick links
- [ ] Gym Toggle with carousel navigation
- [ ] Next Workout Card with colored button
- [ ] All Workouts Quick Start with pills
- [ ] Weekly Volume Chart (Recharts or native)
- [ ] Previous Workouts Card with workout cards

### Data Integration
- [ ] Fetch weekly summary from Supabase
- [ ] Fetch grouped T-Paths and workouts
- [ ] Fetch gym data and active gym
- [ ] Fetch workout exercises cache for duration
- [ ] Fetch volume chart data
- [ ] Fetch workout history (last 3)

### Interactions
- [ ] Pull-to-refresh functionality
- [ ] Tap completed circle → workout summary modal
- [ ] Tap calendar icon → consistency calendar modal
- [ ] Tap action buttons → respective modals/dialogs
- [ ] Tap gym chevrons → switch active gym
- [ ] Tap Start Workout → navigate with workoutId
- [ ] Tap Play button → navigate with workoutId
- [ ] Tap Eye button → workout summary modal
- [ ] Tap View All History → workout history page

### Visual Polish
- [ ] Staggered entrance animations (8 delays)
- [ ] Fast fade-in for content reveals
- [ ] Workout color system applied consistently
- [ ] Shadows and elevations matching design
- [ ] Border radius and spacing consistency

### Testing
- [ ] Test with PPL program (3 circles)
- [ ] Test with ULUL program (4 circles)
- [ ] Test with multiple gyms (toggle shows)
- [ ] Test with single gym (toggle hidden)
- [ ] Test with no active gym (error states)
- [ ] Test with no workouts completed (empty states)
- [ ] Test with all error scenarios
- [ ] Test pull-to-refresh on various data states
- [ ] Test on small and large screens
- [ ] Test with screen readers
