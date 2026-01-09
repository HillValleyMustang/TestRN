# Weekly Target Debug Investigation Plan

## Issue Analysis

From your logs, I can see the problem:

**Current State:**
- `weeklySummary.total_sessions = 1` (showing as "1/3 workouts completed")
- `goalTotal = 3` (PPL program)
- `completedWorkouts = 1` (only 1 workout completed this week)

**Expected State:**
- You mentioned you've been doing "loads" of testing, so `totalSessions` should be much higher

## Root Cause Investigation

The issue is likely in the **weekly summary calculation**. Looking at your logs:

```
LOG  Weekly summary calculation: {"completedWorkouts": [{"date": "2025-12-29T23:02:15.245Z", "name": "Push"}], "currentWeekWorkouts": 5, "endOfWeek": "2026-01-04T23:59:59.999Z", "goalTotal": 3, "programmeType": "ppl", "startOfWeek": "2025-12-29T00:00:00.000Z", "totalRecentWorkouts": 5, "uniqueWorkouts": 1}
```

**Key observations:**
- `currentWeekWorkouts: 5` - This suggests 5 workouts this week
- `totalRecentWorkouts: 5` - This also suggests 5 recent workouts  
- `completedWorkouts: 1` - But only 1 is being counted as completed
- `total_sessions` in widget shows as 1, not 5

## Investigation Plan

### 1. **Data Source Analysis**
The `totalSessions` should come from the dashboard data context. Need to check:
- How `weeklySummary.total_sessions` is calculated
- Whether it's using local database or Supabase data
- If there's a filtering issue (e.g., only counting certain types of workouts)

### 2. **Time Window Analysis**
The logs show:
- `startOfWeek: "2025-12-29T00:00:00.000Z"`
- `endOfWeek: "2026-01-04T23:59:59.999Z"`

Need to verify:
- Are all your test workouts within this time window?
- Is there a timezone issue affecting the date calculations?

### 3. **Data Flow Debugging**
Need to add logging to track:
- What data is returned from the data context
- What data is passed to the WeeklyTargetWidget
- What the widget receives as props

### 4. **Supabase Data Verification**
Use Supabase MCP to query:
- All workout_sessions for your user in the current week
- Verify session counts match expectations
- Check if there are any filtering conditions being applied

## Next Steps

1. **Add debug logging** to track the data flow from data context → dashboard → widget
2. **Query Supabase directly** to verify actual session counts
3. **Check the weekly summary calculation logic** in the data context
4. **Verify timezone handling** in date calculations

The discrepancy between `currentWeekWorkouts: 5` and `total_sessions: 1` suggests the issue is in how the data is being processed or passed between components.