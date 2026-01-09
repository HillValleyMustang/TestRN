# Weekly Target Debug Implementation Plan

## Debugging Strategy

Based on the investigation, I need to add debugging to track the data flow and identify where the session count discrepancy occurs.

## Implementation Plan

### 1. **Add Debug Logging to Dashboard**

Add console logs in the dashboard to track:
- Weekly summary data from data context
- Props being passed to WeeklyTargetWidget
- Widget rendering with actual values

**Location**: `apps/mobile/app/(tabs)/dashboard.tsx` around line 1035

```javascript
// Add before WeeklyTargetWidget render
console.log('[Dashboard] Weekly Target Data:', {
  completedWorkouts: weeklySummary.completed_workouts,
  goalTotal: weeklySummary.goal_total, 
  programmeType: weeklySummary.programme_type,
  totalSessions: weeklySummary.total_sessions,
  rawWeeklySummary: weeklySummary
});
```

### 2. **Add Debug Logging to WeeklyTargetWidget**

Add console logs in the widget to track:
- Props received
- Progress text calculation
- Additional workouts logic

**Location**: `apps/mobile/components/dashboard/WeeklyTargetWidget.tsx` around line 46

```javascript
// Add at the beginning of the component
console.log('[WeeklyTargetWidget] Props received:', {
  completedWorkouts,
  goalTotal,
  programmeType, 
  totalSessions,
  activitiesCount
});

console.log('[WeeklyTargetWidget] Calculated values:', {
  progressText,
  hasAdditionalWorkouts: totalSessions ? totalSessions > goalTotal : false,
  additionalWorkoutsCount: Math.min(Math.max(0, (totalSessions || 0) - completedWorkouts.length), 7 - goalTotal)
});
```

### 3. **Query Supabase Data**

Use Supabase MCP to verify actual session counts in the database:

```sql
-- Query all workout sessions for the current week
SELECT 
  COUNT(*) as total_sessions,
  COUNT(DISTINCT template_name) as unique_workouts,
  COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_sessions
FROM workout_sessions 
WHERE user_id = '75f2b1bb-55f6-4366-a542-3dc1672ccb25'
  AND session_date >= '2025-12-29T00:00:00.000Z'
  AND session_date <= '2026-01-04T23:59:59.999Z';
```

### 4. **Check Data Context Logic**

Investigate the `loadDashboardSnapshot` function to see how `total_sessions` is calculated:
- Is it using local database or Supabase?
- Are there any filtering conditions?
- How does it relate to `currentWeekWorkouts` vs `total_sessions`?

## Expected Debug Output

After adding the logging, we should see:
1. What data the dashboard receives from the data context
2. What data is passed to the widget
3. What the widget actually receives and calculates
4. How this compares to the actual database data

## Next Steps After Debugging

Once we identify where the discrepancy occurs:
1. Fix the data calculation logic
2. Ensure proper data flow between components
3. Verify the fixes work correctly
4. Remove debug logging

This systematic approach will help identify whether the issue is in:
- Data retrieval from database
- Data processing in data context
- Data passing between components
- Widget calculation logic