# Workout Deletion Cache Invalidation Fix

## Issue Summary

Workout deletion was failing to properly update the dashboard UI. While the deletion worked at the database level, the workout would remain visible in:
- Previous workouts section
- Weekly target modal/card
- Weekly volume chart
- Manual refresh didn't help

## Root Cause Analysis

### 1. React Key Warning
**Location**: `apps/mobile/components/dashboard/PreviousWorkoutsWidget.tsx:138`

**Problem**: The dashboard component was mapping workout data incorrectly, causing duplicate React keys:
```tsx
// Before (incorrect)
workouts={(recentWorkouts || []).map((workout: any) => ({
  id: workout.id,
  sessionId: workout.id,  // Duplicate IDs!
  template_name: workout.template_name || 'Ad Hoc Workout',
  // ...
}))}
```

### 2. Cache Invalidation Race Condition
**Location**: `apps/mobile/app/_hooks/useWorkoutQueries.ts:181-227`

**Problem**: Multiple cache clearing operations were happening in conflicting order:
- Database cache clearing was happening after React Query invalidation
- No coordination between database layer and React Query layer
- Stale data was being restored from cached sources

### 3. Insufficient Database Cache Clearing
**Location**: `apps/mobile/app/_lib/database.ts:2431-2449`

**Problem**: Database cache clearing was happening too late and not comprehensively enough:
- Only clearing session cache
- Not clearing analytics cache, stats cache, or volume cache
- Cache clearing happening after deletion rather than before

## Implemented Fixes

### 1. Fixed React Key Mapping
**File**: `apps/mobile/app/(tabs)/dashboard-new.tsx:332-342`

```tsx
// After (corrected)
<PreviousWorkoutsWidget
  workouts={(recentWorkouts || []).map((workout: any) => ({
    id: workout.session?.id || workout.id, // Ensure unique key
    sessionId: workout.session?.id || workout.id,
    template_name: workout.session?.template_name || workout.template_name || 'Ad Hoc Workout',
    completed_at: workout.session?.completed_at || workout.completed_at || workout.session?.session_date,
    exercise_count: workout.exercise_count,
    duration_string: workout.session?.duration_string || workout.duration_string ?? undefined,
  }))}
```

**Changes**:
- Ensured unique keys by properly accessing nested session data
- Fixed data mapping to handle both `recentWorkouts` array format and nested session objects
- Added proper fallbacks for all data fields

### 2. Enhanced Cache Invalidation Strategy
**File**: `apps/mobile/app/_hooks/useWorkoutQueries.ts:181-227`

**Changes**:
- **Pre-deletion cache clearing**: Clear database caches BEFORE deletion
- **Aggressive React Query invalidation**: Use `removeQueries` with predicate to remove all user-related queries
- **Sequential invalidation**: Clear database first, then React Query, then force refetch
- **Timing coordination**: Add small delays to ensure operations complete in order

```tsx
// Clear database caches FIRST before deletion
console.log('[DeleteWorkout] Clearing database caches before deletion');
database.clearAllCachesForUser(session.user_id);

// Clear React Query cache more aggressively
queryClient.removeQueries({
  predicate: (query) => {
    return query.queryKey.some(key => 
      typeof key === 'string' && key.includes(session.user_id)
    );
  }
});

// Force immediate refetch with timing coordination
setTimeout(() => {
  queryClient.refetchQueries({
    queryKey: queryKeys.workoutSessions(session.user_id),
  });
  // ... additional refetches
}, 100);
```

### 3. Comprehensive Database Cache Clearing
**File**: `apps/mobile/app/_lib/database.ts:2431-2457`

**Changes**:
- **Pre-deletion clearing**: Clear ALL caches before performing deletion
- **Multiple cache layers**: Clear session cache, analytics cache, stats cache, volume cache
- **Verification logging**: Added detailed logging to track cache clearing operations
- **Post-deletion clearing**: Clear caches again after deletion to ensure no stale data

```tsx
async deleteWorkoutSession(sessionId: string): Promise<void> {
  // Get user_id first
  const session = await db.getFirstAsync<{ user_id: string }>(...);
  
  // Clear ALL caches immediately before deletion
  if (session?.user_id) {
    console.log('[Database] Clearing ALL caches before deletion for user:', session.user_id);
    this.clearAllCachesForUser(session.user_id);
    
    // Clear analytics and stats caches specifically
    Object.keys(this.analyticsCache).forEach(key => {
      if (key.includes(session.user_id)) {
        delete this.analyticsCache[key];
      }
    });
  }
  
  // Perform deletion
  await db.runAsync('DELETE FROM set_logs WHERE session_id = ?', [sessionId]);
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
  
  // Clear caches one more time after deletion
  if (session?.user_id) {
    this.clearAllCachesForUser(session.user_id);
  }
}
```

### 4. Simplified Lifecycle Hook
**File**: `apps/mobile/app/_hooks/useWorkoutLifecycle.ts:50-72`

**Changes**:
- Removed redundant cache clearing from lifecycle hook
- Let the mutation handler handle all cache management
- Prevent race conditions between multiple cache clearing operations

## Expected Results

After these fixes, workout deletion should:

1. **✅ Remove workout immediately from UI** - No more stale data showing
2. **✅ Update all dashboard components** - Previous workouts, weekly target, volume chart
3. **✅ Clear React key warnings** - Unique keys for all list items
4. **✅ Survive manual refresh** - Data stays deleted after screen refresh
5. **✅ Work consistently** - No race conditions or cache restoration issues

## Testing Recommendations

1. **Delete a workout** from the previous workouts section
2. **Verify immediate UI update** - Workout should disappear instantly
3. **Check all dashboard components**:
   - Previous workouts list
   - Weekly target widget
   - Volume chart
4. **Manual refresh** - Pull down to refresh, data should stay deleted
5. **Multiple deletions** - Test deleting several workouts in sequence

## Technical Notes

- **Cache TTL values**: Sessions (5min), Stats (2min), Analytics (3min), Volume (10min)
- **Query invalidation**: Uses both `invalidateQueries` and `removeQueries` for comprehensive clearing
- **Database operations**: Sequential clearing → deletion → verification → final clearing
- **React Query coordination**: Timing delays ensure operations complete in proper order

## Files Modified

1. `apps/mobile/app/(tabs)/dashboard-new.tsx` - Fixed data mapping and React keys
2. `apps/mobile/app/_hooks/useWorkoutQueries.ts` - Enhanced cache invalidation strategy
3. `apps/mobile/app/_lib/database.ts` - Comprehensive cache clearing before/after deletion
4. `apps/mobile/app/_hooks/useWorkoutLifecycle.ts` - Removed redundant cache clearing

## Prevention Measures

To prevent similar issues in the future:

1. **Consistent cache clearing strategy** across all data operations
2. **Proper React key handling** in all list components
3. **Sequential operation ordering** for database + cache operations
4. **Comprehensive logging** to track cache state changes
5. **Test coverage** for deletion workflows across all UI components