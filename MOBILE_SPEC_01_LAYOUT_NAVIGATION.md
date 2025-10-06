# Mobile App Specification: Layout & Navigation
**React Native Implementation for iOS/Android**

---

## 1. TOP HEADER BAR

### 1.1 Container Specs
- **Height:** 56px (14 * 4 in Tailwind = 56px, h-14)
- **Position:** Sticky top (always visible when scrolling)
- **Z-Index:** 30 (above content)
- **Background:** 
  - Default: `bg-background` (solid)
  - When scrolled: `bg-background/80` with backdrop blur
  - Border bottom: 1px solid `border` color
- **Padding:** 16px horizontal (px-4)
- **Display:** Flex row, items centered, gap 16px

### 1.2 Left Section: Hamburger Menu Button
- **Component:** Pressable button with icon
- **Icon:** `PanelLeft` from @expo/vector-icons (Ionicons name: "menu")
- **Size:** 40x40px button (size="icon")
- **Icon Size:** 20x20px (h-5 w-5)
- **Style:** Outlined button (`variant="outline"`)
- **Border:** 1px solid `border` color, rounded
- **Accessibility:** Screen reader label "Toggle Menu"

**Interaction:**
- Tap opens Sheet (side drawer) from left
- Sheet animation: slide-in from left, 300ms duration

---

### 1.3 Center Section: Rolling Status Badge

**Component Hierarchy:**
```
<Pressable> (opens modal)
  <Badge>
    <Icon />
    <Text>{status}</Text>
  </Badge>
</Pressable>
```

**Badge Container:**
- **Display:** Flex row, items centered, gap 4px
- **Padding:** 12px horizontal, 4px vertical (px-3 py-1)
- **Border Radius:** Full rounded pill
- **Border:** 1px solid (color varies by state)
- **Font:** 14px, semi-bold (text-sm font-semibold)

**Status States & Colors:**

1. **"Getting into it"** (0 weeks consistent)
   - Icon: Dumbbell (gray-400)
   - Icon Size: 16x16px (h-4 w-4)
   - Background: `#F3F4F6` (gray-100)
   - Text: `#374151` (gray-700)
   - Border: `#D1D5DB` (gray-300)
   - Dark mode: bg-gray-800, text-gray-300, border-gray-700

2. **"Building Momentum"** (1-3 weeks)
   - Icon: CheckCircle (blue-500)
   - Background: `#DBEAFE` (blue-100)
   - Text: `#1D4ED8` (blue-700)
   - Border: `#93C5FD` (blue-300)
   - Dark mode: bg-blue-800, text-blue-300, border-blue-700

3. **"In the Zone"** (4-7 weeks)
   - Icon: Flame (orange-500)
   - Background: `#FFEDD5` (orange-100)
   - Text: `#C2410C` (orange-700)
   - Border: `#FED7AA` (orange-300)
   - Dark mode: bg-orange-800, text-orange-300, border-orange-700

4. **"On Fire"** (8+ weeks)
   - Icon: Flame FILLED (red-500 color + fill)
   - Background: `#FEE2E2` (red-100)
   - Text: `#991B1B` (red-700)
   - Border: `#FECACA` (red-300)
   - Dark mode: bg-red-800, text-red-300, border-red-700

5. **"Offline"** (no internet)
   - Icon: WifiOff (red-500)
   - Background: `#FEE2E2` (red-100)
   - Text: `#991B1B` (red-700)
   - Border: `#FECACA` (red-300)
   - Text: "Offline"

6. **"Updating Plan..."** (AI generating)
   - Icon: Loader2 (spinning animation)
   - Background: `#DBEAFE` (blue-100)
   - Text: `#1D4ED8` (blue-700)
   - Border: `#93C5FD` (blue-300)
   - Animation: 360° rotation, infinite, 1s duration

7. **Temp Success Message** (exercise added/removed)
   - Icon: CheckCircle or Heart
   - Background: `#22C55E` (green-500)
   - Text: White
   - Text: Dynamic message (e.g., "Exercise Added!")
   - Duration: 3 seconds, then revert to normal status

**Status Modal (Tap to Open):**
- **Modal Type:** Bottom sheet or centered dialog
- **Title:** "Workout Status Explained"
- **Description:** "Your status reflects your workout consistency over time..."
- **Content:** Scrollable list of all status explanations
- **Each Item:**
  - Icon (20px, colored) on left
  - Title (semibold) 
  - Description (small, muted)
  - Vertical gap: 16px between items

---

### 1.4 Right Section: Notification Bell + User Avatar

**Layout:** Flex row, gap 8px, aligned right

#### 1.4.1 Notification Bell Button
- **Component:** Pressable with Popover
- **Button Size:** 40x40px (size="icon")
- **Icon:** Bell, 16x16px (h-4 w-4)
- **Style:** Outlined button

**Unread Badge (when unreadCount > 0):**
- **Position:** Absolute, top-right (-8px, -8px)
- **Size:** 20x20px circle (h-5 w-5)
- **Background:** Destructive/red
- **Text:** White, 12px, centered
- **Content:** Number of unread notifications
- **Max Display:** "99+" if over 99

**Popover (Tap to Open):**
- **Width:** 320px (w-80)
- **Align:** End (right side of button)
- **Padding:** 16px
- **Max Height:** 288px (h-72) with scroll

**Popover Header:**
- **Display:** Flex row, space-between
- **Title:** "Notifications" (14px, medium)
- **Right Button:** "Mark all as read" (if unread > 0)
  - Icon: CheckCheck (16px)
  - Variant: Ghost
  - Size: Small

**Notification Item:**
- **Padding:** 8px
- **Border Radius:** 6px (rounded-md)
- **Background:** Unread = accent color, Read = transparent
- **Icon (if error):** AlertCircle (16px, destructive color)
- **Title:** 14px, semibold
- **Message:** 12px, muted
- **Timestamp:** 12px, muted, top margin 4px

---

#### 1.4.2 User Avatar Dropdown
- **Button:** 32x32px circular avatar
- **Variant:** Ghost (no background until pressed)
- **Border Radius:** Full circle

**Avatar Display:**
- If has photo: Show user photo
- If no photo: Show initials (first letter of email, uppercase)
- Background: Muted color
- Text: Foreground color, centered

**Dropdown Menu (Tap to Open):**
- **Width:** 224px (w-56)
- **Align:** End
- **Padding:** 8px

**Menu Header:**
- **User Name:** 14px, medium (from user_metadata.first_name or "Athlete")
- **Email:** 12px, muted
- **Separator:** 1px line, margin 8px vertical

**Menu Items:**
1. **Profile**
   - Icon: User (16px)
   - Text: "Profile"
   - Action: Navigate to /profile

2. **Separator**

3. **Log out**
   - Icon: LogOut (16px)
   - Text: "Log out"
   - Action: Sign out + navigate to /login

---

## 2. HAMBURGER MENU SHEET

### 2.1 Sheet Container
- **Side:** Left
- **Width:** Full width on mobile, max 360px (sm:max-w-xs)
- **Background:** Background color
- **Animation:** Slide in from left, 300ms ease-in-out
- **Overlay:** Dark overlay (60% opacity) when open

### 2.2 Navigation Links
**Container:**
- **Display:** Grid, gap 4px (gap-1)
- **Padding:** 4px vertical (py-1)
- **Overflow:** Scroll if content exceeds viewport
- **Font:** 18px, medium (text-lg)

**Each Link:**
- **Display:** Flex row, items centered, gap 8px
- **Padding:** 8px horizontal, 6px vertical (px-2 py-1.5)
- **Border Radius:** 8px (rounded-lg)
- **Transition:** Colors, 200ms

**Active State:**
- Background: `action` color (primary blue)
- Text: `action-foreground` (white)
- Font: Semibold
- Shadow: Medium shadow (shadow-md)
- Icon: Same color as text

**Inactive State:**
- Background: Transparent
- Text: Foreground color
- Hover: Muted background
- Icon: Primary color

**Navigation Items (in order):**
1. Dashboard - Home icon (16px)
2. History - History icon
3. Activities - BarChart3 icon
4. Exercises - Dumbbell icon
5. Management - LayoutTemplate icon
6. Profile - User icon
7. Workout - Dumbbell icon

**Separator:**
- 1px horizontal line
- Margin: 8px vertical (my-2)

**Log Activity Button:**
- **Variant:** Primary (default)
- **Display:** Flex row, gap 8px, left aligned
- **Padding:** 8px horizontal, 6px vertical
- **Font:** 18px, medium
- **Icon:** Plus (16px), primary-foreground color
- **Background:** Primary color
- **Hover:** Primary/90

**Interaction:**
- Tap link: Navigate + close sheet
- Tap Log Activity: Open Activity Dialog + close sheet

---

## 3. BOTTOM TAB NAVIGATION

### 3.1 Container Specs
- **Position:** Fixed bottom (always visible)
- **Z-Index:** 10
- **Width:** Full width
- **Height:** 64px (h-16)
- **Background:** Background color
- **Border Top:** 1px solid border color

### 3.2 Tab Bar Layout
- **Display:** Grid, 5 columns (grid-cols-5)
- **Each Tab:** Equal width, 20% of container

### 3.3 Tab Items (in order)

1. **Dashboard**
   - Route: /dashboard
   - Icon: Home
   - Label: "Dashboard" (hidden, accessibility only)

2. **Workout**
   - Route: /workout
   - Icon: Dumbbell (barbell in Ionicons)
   - Label: "Workout"

3. **Exercises**
   - Route: /exercises
   - Icon: BookOpen (book in Ionicons)
   - Label: "Exercises"

4. **Progress**
   - Route: /progress
   - Icon: BarChart3 (bar-chart in Ionicons)
   - Label: "Progress"

5. **Profile**
   - Route: /profile
   - Icon: User (person in Ionicons)
   - Label: "Profile"

### 3.4 Tab Styling

**Container (each tab):**
- **Display:** Flex column, centered
- **Gap:** 4px (gap-1)
- **Padding Top:** 8px (pt-2)
- **Font:** 12px, medium (text-xs font-medium)
- **Transition:** Colors, 200ms

**Icon:**
- **Size:** 20x20px (h-5 w-5)
- **Stroke Width:** 2.5 (thicker lines)

**Active State:**
- Icon Color: `action` (primary blue)
- Text Color: `action`

**Inactive State:**
- Icon Color: `muted-foreground` (gray)
- Text Color: `muted-foreground`
- Hover: `foreground/80` (slightly darker)

**Labels:**
- **Display:** NONE (icons only)
- **Accessibility:** Screen reader only

---

## 4. WORKOUT-AWARE NAVIGATION

### 4.1 Unsaved Changes Guard
All navigation (tab bar + sheet menu) checks for unsaved workout changes before navigating.

**Logic:**
```
If hasUnsavedChanges:
  1. Prevent default navigation
  2. Show confirmation dialog:
     - Title: "Unsaved Changes"
     - Message: "You have unsaved changes in your workout. Are you sure you want to leave?"
     - Buttons: 
       - "Cancel" (stay on page)
       - "Discard Changes" (navigate away)
```

**Implementation:**
- Use WorkoutFlowContext to track `hasUnsavedChanges`
- Wrap all navigation in guards
- Only applies when on /workout screen with active workout

---

## 5. THEME & COLORS

### 5.1 Color Tokens (React Native)
```typescript
export const Colors = {
  // Base
  background: '#FFFFFF',      // Light mode
  foreground: '#0A0A0A',
  
  // UI Elements
  card: '#FFFFFF',
  border: '#E5E7EB',
  
  // Actions
  action: '#3B82F6',          // Primary blue
  actionForeground: '#FFFFFF',
  actionPrimary: '#3B82F6',
  
  // Text
  mutedForeground: '#6B7280',
  
  // Status
  destructive: '#EF4444',
  
  // Chart colors (for status badges)
  chart2: '#F97316',          // Orange for streak
  chart5: '#8B5CF6',          // Purple for volume
};
```

### 5.2 Spacing System
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px

### 5.3 Border Radius
- **sm:** 4px
- **md:** 6px
- **lg:** 8px
- **full:** 9999px (pill/circle)

### 5.4 Shadows
- **sm:** elevation 2 (Android), shadowRadius 2 (iOS)
- **md:** elevation 4, shadowRadius 4
- **lg:** elevation 8, shadowRadius 8

---

## 6. ANIMATIONS & TRANSITIONS

### 6.1 Sheet Menu
- **Enter:** Slide from left, 300ms ease-in-out
- **Exit:** Slide to left, 300ms ease-in-out
- **Overlay:** Fade in/out, 200ms

### 6.2 Popovers (Notification, User Menu)
- **Enter:** Scale from 95% to 100%, fade in, 200ms
- **Exit:** Scale to 95%, fade out, 150ms

### 6.3 Tab Changes
- **Color Transition:** 200ms ease-in-out
- **No slide animation** (instant route change)

### 6.4 Rolling Status Badge
- **Temp Message:** Fade in 300ms, hold 3s, fade out 300ms
- **Loading Spinner:** 360° rotation, 1s infinite

### 6.5 Scroll Effects
- **Header Backdrop Blur:** Activates when scrollY > 50px
- **Transition:** 300ms ease-in-out
- **Effect:** Background opacity 80%, blur radius 12px

---

## 7. ACCESSIBILITY

### 7.1 Touch Targets
- **Minimum Size:** 44x44px for all interactive elements
- **Tab Buttons:** 64px height (exceeds minimum)
- **Header Buttons:** 40x40px (acceptable for adults)

### 7.2 Screen Reader Labels
- All icons have accessible labels
- "Toggle Menu" for hamburger
- Tab names for bottom nav (even though visually hidden)
- Badge states are announced

### 7.3 Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Badge backgrounds provide sufficient contrast
- Active/inactive states clearly distinguishable

---

## 8. MOBILE-SPECIFIC CONSIDERATIONS

### 8.1 Safe Area Handling
- **Header:** Respect top safe area (notch, status bar)
- **Bottom Nav:** Respect bottom safe area (home indicator)
- **Sheet:** Full height with safe area padding

### 8.2 Platform Differences

**iOS:**
- Use native blur effect for scrolled header
- Haptic feedback on tab change
- Swipe-back gesture enabled

**Android:**
- Material elevation for header shadow
- Ripple effect on button presses
- Hardware back button closes sheet

### 8.3 Gestures
- **Sheet:** Swipe left to close
- **Popovers:** Tap outside to close
- **Tab Bar:** No swipe gestures (conflicts with page content)

---

## 9. DATA REQUIREMENTS

### 9.1 User Data (from Supabase)
- `profiles.rolling_workout_status` - for status badge
- `session.user.email` - for avatar initial
- `session.user.user_metadata.first_name` - for user name
- `session.user.user_metadata.avatar_url` - for avatar photo

### 9.2 Notifications Data
- `get_notifications_with_read_status()` RPC - global notifications
- `user_alerts` table - user-specific alerts
- Combined, sorted by `created_at` DESC

### 9.3 Real-time Updates
- Rolling status updates when workout completed
- Notification count updates on new notification
- Temp status messages from workout actions

---

## 10. COMPONENT HIERARCHY

```
App Root
├── Header (Sticky Top)
│   ├── Hamburger Button → Sheet
│   │   └── Navigation Links
│   │       └── Log Activity Button
│   └── Right Section
│       ├── Rolling Status Badge → Modal
│       ├── Notification Bell → Popover
│       └── User Avatar → Dropdown
│
├── Page Content (Scrollable)
│   └── [Screen Components]
│
└── Bottom Tab Navigation (Fixed Bottom)
    ├── Dashboard Tab
    ├── Workout Tab
    ├── Exercises Tab
    ├── Progress Tab
    └── Profile Tab
```

---

## 11. IMPLEMENTATION CHECKLIST

### Header Components
- [ ] Create Header component with sticky positioning
- [ ] Implement hamburger menu button
- [ ] Build Sheet component with navigation links
- [ ] Create Rolling Status Badge with all 7 states
- [ ] Build Status Info Modal
- [ ] Create Notification Bell with popover
- [ ] Implement unread count badge
- [ ] Build User Avatar dropdown
- [ ] Add scroll-based backdrop blur

### Bottom Navigation
- [ ] Create TabBar component
- [ ] Configure 5 tabs with correct icons
- [ ] Implement active/inactive styling
- [ ] Add workout-aware navigation guards

### Interactions
- [ ] Sheet open/close animations
- [ ] Popover positioning and animations
- [ ] Navigation with unsaved changes dialog
- [ ] Pull-to-refresh on scrollable content

### Testing
- [ ] Test all navigation flows
- [ ] Verify status badge states
- [ ] Test notification interactions
- [ ] Verify safe area handling on real devices
- [ ] Test with screen readers
- [ ] Verify touch target sizes
