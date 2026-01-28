# Reactive Hooks Cleanup Guide

## When to Clean Up

Only proceed with cleanup after:
1. ✅ All tests pass with feature flags enabled
2. ✅ Manual testing completed successfully
3. ✅ No regressions found in production
4. ✅ Feature has been running stable for at least 1-2 weeks

## Pre-Cleanup Checklist

Before removing old code:
- [ ] Verify all feature flags are enabled and working
- [ ] Confirm no users are reporting issues
- [ ] Check error monitoring for any issues
- [ ] Ensure rollback plan is still available

---

## Cleanup Tasks

### 1. Remove Feature Flag System

**Files to delete:**
- `apps/mobile/constants/feature-flags.ts`
- `apps/mobile/hooks/useFeatureFlag.ts`

**Files to update:**
- `apps/mobile/components/dashboard/WeeklyTargetWidget.tsx` - Remove feature flag checks
- `apps/mobile/components/dashboard/PreviousWorkoutsWidget.tsx` - Remove feature flag checks
- `apps/mobile/components/dashboard/NextWorkoutCard.tsx` - Remove feature flag checks
- `apps/mobile/components/dashboard/SimpleVolumeChart.tsx` - Remove feature flag checks
- `apps/mobile/app/(tabs)/dashboard.tsx` - Remove feature flag import and log

### 2. Simplify Widget Components

For each widget, remove:
- Feature flag import
- `useFeatureFlag` hook call
- `useComparisonLogging` hook call
- `useAuth` hook call (if only used for userId with feature flag)
- Props-based data handling (use hooks only)
- Comparison logging effect
- Conditional data source selection (`useMemo` blocks that check `useReactiveHooks`)

### 3. Update Dashboard Screen

**Remove from `dashboard.tsx`:**
- Unused state variables (if widgets fetch their own data)
- `loadDashboardSnapshot()` calls that are no longer needed
- Manual refresh logic that's now handled by React Query
- Props passed to widgets that are no longer needed

**Keep:**
- Modal state management
- Callback handlers
- Sync status management

### 4. Optimize Data Context

**Potentially removable from `data-context.tsx`:**
- `loadDashboardSnapshot()` function (keep if needed for non-migrated features)
- `dashboardCache` state (React Query handles caching)
- `shouldRefreshDashboard` flag (React Query handles this)

**Keep:**
- `invalidateAllCaches()` (still useful for manual refresh)
- `handleWorkoutCompletion()` (handles points and status)
- All database methods (used by hooks)
- Sync queue functionality

### 5. Simplify Prop Types

Update widget interfaces to only include necessary props:
- Remove data props that are now fetched via hooks
- Keep callback props (onViewSummary, onDelete, etc.)
- Keep style/display props

### 6. Clean Up Tests

Update tests to:
- Remove feature flag mocking
- Test hooks-only mode
- Remove comparison testing

### 7. Documentation Updates

- Remove `REACTIVE_HOOKS_TESTING_CHECKLIST.md` (or archive)
- Remove this file (`REACTIVE_HOOKS_CLEANUP_GUIDE.md`)
- Update README with new architecture

---

## Example: Simplified WeeklyTargetWidget

After cleanup, the component would look like:

```tsx
import React, { useMemo, useState } from 'react';
import { useWeeklySummary, useUserProfile } from '../../hooks/data';
import { useAuth } from '../../app/_contexts/auth-context';

interface WeeklyTargetWidgetProps {
  onViewCalendar?: () => void;
  onViewWorkoutSummary?: (sessionId: string) => void;
  activitiesCount?: number;
  onViewActivities?: () => void;
}

export function WeeklyTargetWidget({
  onViewCalendar,
  onViewWorkoutSummary,
  activitiesCount = 0,
  onViewActivities,
}: WeeklyTargetWidgetProps) {
  const { userId } = useAuth();
  
  const { data: profileData, loading: profileLoading } = useUserProfile(userId);
  const programmeType = profileData?.programme_type || 'ppl';
  
  const { 
    data: weeklySummaryData, 
    sessionsByWorkoutType,
    loading: summaryLoading, 
  } = useWeeklySummary(userId, programmeType);
  
  const completedWorkouts = weeklySummaryData?.completed_workouts || [];
  const goalTotal = weeklySummaryData?.goal_total || 3;
  const totalSessions = weeklySummaryData?.total_sessions || 0;
  
  // ... rest of component
}
```

---

## Rollback Plan

If issues are discovered after cleanup:

1. Revert the cleanup commits
2. Re-enable feature flag system
3. Set flags to `false` to disable reactive hooks
4. Investigate and fix issues
5. Re-test before attempting cleanup again

---

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Testing | 1-2 weeks | Feature flags enabled, monitoring |
| Soft Launch | 1 week | Full rollout, monitoring |
| Cleanup | 1 day | Remove old code |
| Verification | 1 day | Final testing |

---

## Notes

- Keep this file until cleanup is complete
- Document any issues found during testing
- Update this guide if cleanup process changes
