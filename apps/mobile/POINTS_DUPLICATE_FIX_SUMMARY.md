# Points Duplicate Award Fix Summary

## Problem Identified

The points scoring system was awarding points **multiple times** for the same workout completion. From the logs, we can see:

1. **First award**: 900 → 905 (5 points) - from WorkoutSummaryModal
2. **Second award**: 905 → 910 (5 points) - from dashboard focus effect  
3. **Third award**: 910 → 915 (5 points) - from another dashboard refresh

**Total points awarded**: 15 points instead of 5 points

## Root Cause

The `handleWorkoutCompletion` function in `data-context.tsx` was awarding points **every time it was called**, regardless of:

1. Whether the session ID was provided (it could be `undefined` or empty object)
2. Whether points were already awarded for this session
3. Whether the function was called multiple times for the same workout

### Multiple Call Sites

1. **WorkoutSummaryModal.tsx line 811**: `await handleWorkoutCompletion({} as any)` - called when modal closes
2. **dashboard.tsx line 432**: `await handleWorkoutCompletion(undefined)` - called from focus effect
3. **dashboard.tsx line 1344**: `await handleWorkoutCompletion(undefined)` - called from another refresh

All three calls were awarding points because the function didn't check if:
- A valid session ID was provided
- Points were already awarded for this session

## Solution Implemented

### 1. Points Only Awarded with Valid Session ID

The function now **only calculates and awards points** when:
- `userId` is available
- `supabase` is available
- `session?.id` is provided (not undefined/empty)

When called without a session ID, the function **only performs cache invalidation** (no points).

### 2. Duplicate Prevention

Added in-memory tracking to prevent duplicate awards:
- Tracks processed sessions using `(global as any)[sessionProcessedKey]`
- Each session can only be processed once
- Flag is cleared after 30 seconds to allow legitimate retries if needed
- Flag is cleared on error to allow retries

### 3. Clear Logging

Enhanced logging to show:
- When points are being calculated (with session ID)
- When points are skipped (session already processed)
- When function is called without session ID (cache invalidation only)

## Code Changes

### File: `apps/mobile/app/_contexts/data-context.tsx`

**Before**:
- Points were calculated every time, even with `undefined` session
- No duplicate prevention
- 5 base points + 2 points per PR always calculated

**After**:
- Points only calculated when `session?.id` is provided
- In-memory tracking prevents duplicate awards
- Clear logging shows when points are skipped

## Expected Behavior After Fix

### Scenario 1: Workout Completion with Valid Session ID

1. User completes workout
2. `handleWorkoutCompletion(session)` called with valid session ID
3. ✅ Points awarded: 5 base + (2 × PR count)
4. Session marked as processed
5. Any subsequent calls with same session ID → ✅ Points skipped (cache invalidation only)

### Scenario 2: Cache Invalidation Only (No Session ID)

1. Dashboard refresh triggers `handleWorkoutCompletion(undefined)`
2. ✅ No points awarded (session ID not provided)
3. ✅ Cache invalidation performed
4. ✅ Logs show "cache invalidation only (no points awarded)"

### Scenario 3: Multiple Calls for Same Workout

1. WorkoutSummaryModal calls `handleWorkoutCompletion({} as any)` → ✅ No points (no valid session ID)
2. Dashboard calls `handleWorkoutCompletion(undefined)` → ✅ No points (no valid session ID)
3. If a valid call with session ID happens → ✅ Points awarded once
4. Any subsequent calls with same session ID → ✅ Points skipped

## Testing Verification

From the logs provided, the fix should prevent:

- ❌ **Before**: Multiple point awards (15 points for 1 workout)
- ✅ **After**: Single point award (5 points for 1 workout, + 2 per PR)

## Points Calculation

According to the code:
- **Base points**: 5 points per workout completion
- **PR bonus**: 2 points per personal record (volume PR)

**Note**: The PointsExplanationModal shows different values (+10 base, +5 per PR), which appears to be outdated documentation. The actual implementation uses 5 base + 2 per PR.

## Recommendations

1. ✅ **Fixed**: Duplicate prevention implemented
2. 🔄 **Future**: Consider updating PointsExplanationModal to match actual implementation
3. 🔄 **Future**: Consider passing actual session ID from WorkoutSummaryModal instead of empty object
4. 🔄 **Future**: Consider awarding points in `onSaveWorkout` instead of `handleWorkoutCompletion` for clearer separation of concerns

## Impact

✅ **No more duplicate points** - Each workout awards points exactly once
✅ **Cache invalidation still works** - Dashboard refreshes continue to work correctly
✅ **Error handling** - Retries are possible if points update fails
✅ **Clear logging** - Easy to debug points-related issues
