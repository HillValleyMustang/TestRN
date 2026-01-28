# Reactive Hooks Migration Testing Checklist

## Overview
This document provides a comprehensive testing checklist for validating the reactive hooks migration.
The migration introduces a feature flag system that allows gradual rollout of reactive data fetching.

## Feature Flags
The following feature flags control the migration:

| Flag | Purpose |
|------|---------|
| `USE_REACTIVE_HOOKS` | Master flag - enables all reactive hooks |
| `USE_REACTIVE_WEEKLY_TARGET` | WeeklyTargetWidget uses hooks |
| `USE_REACTIVE_PREVIOUS_WORKOUTS` | PreviousWorkoutsWidget uses hooks |
| `USE_REACTIVE_NEXT_WORKOUT` | NextWorkoutCard uses hooks |
| `USE_REACTIVE_VOLUME_CHART` | SimpleVolumeChart uses hooks |
| `USE_REACTIVE_GYM_TOGGLE` | GymToggle uses hooks |
| `ENABLE_COMPARISON_LOGGING` | Enables debug comparison logging |

## How to Enable Reactive Hooks for Testing

1. Open `apps/mobile/constants/feature-flags.ts`
2. Set `USE_REACTIVE_HOOKS: true`
3. Set individual component flags to `true` as needed
4. Restart the app

Or programmatically:
```typescript
import { enableAllReactiveHooks } from '../constants/feature-flags';
enableAllReactiveHooks(); // Only in development
```

---

## Unit Tests

### Data Hooks Tests
Run: `npm test -- --testPathPattern="hooks/data"`

- [ ] `useWorkoutHistory.test.ts` - All tests pass
- [ ] `useRecentWorkouts.test.ts` - All tests pass
- [ ] `useWeeklySummary.test.ts` - All tests pass
- [ ] `useUserProfile.test.ts` - All tests pass
- [ ] `useGyms.test.ts` - All tests pass
- [ ] `useTPaths.test.ts` - All tests pass
- [ ] `useVolumeHistory.test.ts` - All tests pass
- [ ] `useNextWorkout.test.ts` - All tests pass

---

## Integration Tests

### With Feature Flags OFF (Default Behavior)

#### Dashboard Loading
- [ ] Dashboard loads correctly on app start
- [ ] All widgets display correct data
- [ ] No errors in console

#### Workout Completion Flow
- [ ] Complete a workout
- [ ] Dashboard refreshes and shows updated data
- [ ] Weekly target widget updates
- [ ] Previous workouts widget shows new workout
- [ ] Volume chart updates

#### Workout Deletion Flow
- [ ] Delete a workout from Previous Workouts
- [ ] Dashboard refreshes correctly
- [ ] All widgets update to reflect deletion

### With Feature Flags ON (Reactive Mode)

Enable flags:
```typescript
USE_REACTIVE_HOOKS: true,
USE_REACTIVE_WEEKLY_TARGET: true,
USE_REACTIVE_PREVIOUS_WORKOUTS: true,
USE_REACTIVE_NEXT_WORKOUT: true,
USE_REACTIVE_VOLUME_CHART: true,
```

#### Dashboard Loading
- [ ] Dashboard loads correctly on app start
- [ ] All widgets display correct data
- [ ] No errors in console
- [ ] Log shows "Reactive hooks mode ENABLED"

#### Workout Completion Flow
- [ ] Complete a workout
- [ ] Weekly target widget updates AUTOMATICALLY (no manual refresh)
- [ ] Previous workouts widget updates AUTOMATICALLY
- [ ] Next workout card updates AUTOMATICALLY
- [ ] Volume chart updates AUTOMATICALLY
- [ ] No jarring transitions or flickers

#### Workout Deletion Flow
- [ ] Delete a workout from Previous Workouts
- [ ] All widgets update AUTOMATICALLY
- [ ] No need for pull-to-refresh
- [ ] Dashboard remains responsive

#### Gym Switching
- [ ] Switch active gym
- [ ] Dashboard updates to reflect new gym
- [ ] Next workout may change based on gym

#### T-Path Changes
- [ ] Change active T-Path in profile
- [ ] Return to dashboard
- [ ] Next workout updates to reflect new T-Path

---

## Manual Testing Checklist

### Basic Functionality

#### App Start
- [ ] App starts without crashes
- [ ] Dashboard loads within 3 seconds
- [ ] All widgets appear with correct data
- [ ] No blank/empty states unless expected

#### Screen Focus
- [ ] Navigate away from dashboard
- [ ] Return to dashboard
- [ ] Data refreshes appropriately
- [ ] No duplicate network requests

#### Pull-to-Refresh
- [ ] Pull to refresh works
- [ ] Loading indicator appears
- [ ] Data updates after refresh
- [ ] No UI flicker

### Widget-Specific Testing

#### WeeklyTargetWidget
- [ ] Shows correct completed workouts count
- [ ] Shows correct goal total (3 for PPL, 4 for ULUL)
- [ ] Circle colors match workout types
- [ ] Clicking completed circle shows workout summary
- [ ] Multiple sessions of same type opens selector modal

#### PreviousWorkoutsWidget
- [ ] Shows last 3 workouts
- [ ] Workout cards have correct colors
- [ ] Time ago displays correctly
- [ ] Sync status badge shows correctly
- [ ] View button opens workout summary
- [ ] Delete button triggers confirmation
- [ ] View All navigates to history

#### NextWorkoutCard
- [ ] Shows correct next workout
- [ ] Workout name has correct color
- [ ] Start Workout button works
- [ ] Info button shows modal
- [ ] Weekly completion badge shows when appropriate
- [ ] Error states display correctly (no gym, no T-path)

#### SimpleVolumeChart
- [ ] Shows 7 days of data
- [ ] Bars have correct heights
- [ ] Colors match workout types
- [ ] Y-axis labels are correct
- [ ] Empty state shows when no data

### Edge Cases

#### Empty States
- [ ] New user with no workouts - shows appropriate empty states
- [ ] User with no gyms - shows "No active gym" message
- [ ] User with no T-path - shows appropriate message

#### Network Issues
- [ ] Airplane mode - app continues to work with cached data
- [ ] Slow network - loading states appear appropriately
- [ ] Network recovery - data syncs correctly

#### Error Handling
- [ ] Invalid data - doesn't crash, shows error state
- [ ] API errors - handled gracefully
- [ ] Database errors - logged appropriately

### Performance Testing

#### Memory
- [ ] No memory leaks after extended use
- [ ] Memory usage stays stable
- [ ] React DevTools shows no unusual patterns

#### Render Performance
- [ ] Dashboard renders smoothly
- [ ] No visible jank or stuttering
- [ ] List scrolling is smooth
- [ ] No unnecessary re-renders

#### Data Fetching
- [ ] Initial load time is acceptable
- [ ] Data updates are snappy
- [ ] Cache hits reduce network requests

---

## Comparison Testing (Development Only)

With `ENABLE_COMPARISON_LOGGING: true`:

1. Enable both props mode and hooks mode for the same widget
2. Check console logs for "[Comparison]" entries
3. Verify that data matches between old and new code paths

Example log output:
```
[WeeklyTargetWidget] [Comparison] Props vs Hooks data: {
  propsCompletedCount: 2,
  hooksCompletedCount: 2,
  propsGoalTotal: 3,
  hooksGoalTotal: 3
}
```

- [ ] All comparison logs show matching data
- [ ] No unexpected differences between props and hooks data

---

## Rollback Procedure

If issues are found:

1. Open `apps/mobile/constants/feature-flags.ts`
2. Set `USE_REACTIVE_HOOKS: false`
3. All component-specific flags will be ignored
4. App immediately reverts to old code path
5. No app restart required

---

## Sign-Off

| Test Category | Tester | Date | Status |
|---------------|--------|------|--------|
| Unit Tests | | | |
| Integration Tests (Flags OFF) | | | |
| Integration Tests (Flags ON) | | | |
| Manual Testing | | | |
| Performance Testing | | | |
| Comparison Testing | | | |

**Notes:**

---

## Known Issues

(Document any known issues or limitations here)

---

## Future Improvements

- Add React Query DevTools integration
- Implement optimistic updates for mutations
- Consider adding Suspense boundaries for loading states
- Evaluate hook stale times for optimal caching
