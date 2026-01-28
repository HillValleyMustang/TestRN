# Exercise Count Issue - Root Cause and Fix

## Problem Summary

You're seeing **7-8 exercises** per workout instead of the expected **12 exercises** (10 main + 2 bonus) for 60-90 minute workouts.

## Root Cause

The exercises in your database are missing the `movement_pattern` field values. The workout generation logic filters exercises by `movement_pattern` ('Push', 'Pull', 'Legs'), but when these values are NULL, it can't find enough exercises to assign to each workout.

### What the code expects:
```typescript
// From generate-t-path/index.ts lines 136-138
workoutSpecificPools['Push'] = exercises.filter(ex => ex.movement_pattern === 'Push');
workoutSpecificPools['Pull'] = exercises.filter(ex => ex.movement_pattern === 'Pull');
workoutSpecificPools['Legs'] = exercises.filter(ex => ex.movement_pattern === 'Legs');
```

If `movement_pattern` is NULL, these filters return empty arrays, causing the workout to have fewer exercises than expected.

## Fix Steps

### Step 1: Apply the Migration

You need to apply the migration that sets `movement_pattern` based on `main_muscle`:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20260122_populate_movement_patterns.sql`
4. Run the migration
5. Check the output to see how many exercises were updated

**Option B: Using Supabase CLI** (if you have it set up)
```bash
npx supabase link
npx supabase db push
```

### Step 2: Verify the Migration

Run this SQL query in your Supabase SQL Editor to verify:

```sql
SELECT 
  movement_pattern,
  COUNT(*) as exercise_count
FROM exercise_definitions
GROUP BY movement_pattern
ORDER BY movement_pattern;
```

Expected output:
- Push: >= 12 exercises
- Pull: >= 12 exercises  
- Legs: >= 12 exercises

If any category has fewer than 12 exercises, you'll need to add more exercises to that category.

### Step 3: Regenerate Your Workouts

After the migration is applied, you need to regenerate your workouts so they pick up the corrected exercise data.

**Option A: Using the regeneration script (recommended)**
```bash
cd "/Users/craigd/dyad-apps/Test RN/TestRN"
npx tsx scripts/regenerate-workouts.ts
```

**Option B: Via the mobile app**
1. Open your mobile app
2. Go to Profile/Settings
3. Change your session length to a different value (e.g., from 60-90 to 45-60)
4. Wait for it to regenerate
5. Change it back to 60-90
6. This will trigger a full regeneration with the correct exercise counts

**Option C: Manual SQL (advanced)**
If you prefer to do it manually, run the SQL queries in `scripts/fix-exercise-counts.sql`.

### Step 4: Verify the Fix

Check your mobile app workout screen:
- **Push**: Should show 12 exercises (10 main + 2 bonus)
- **Pull**: Should show 12 exercises (10 main + 2 bonus)  
- **Legs**: Should show 12 exercises (10 main + 2 bonus)

You can also run the diagnostic script to verify:
```bash
npx tsx scripts/diagnose-all-exercises.ts
```

## What the Migration Does

The migration maps exercises to movement patterns based on their primary muscle group:

- **Push**: Pectorals, Deltoids, Triceps, Core/Abdominals
- **Pull**: Lats, Traps, Biceps, Rhomboids, Erector Spinae
- **Legs**: Quadriceps, Hamstrings, Glutes, Calves, Hip Flexors

## If You Still Have Issues

If after applying the migration and regenerating workouts you still see incorrect counts:

1. Check if you have enough exercises in each category:
   ```sql
   SELECT movement_pattern, COUNT(*) 
   FROM exercise_definitions 
   GROUP BY movement_pattern;
   ```

2. Run the full diagnostic:
   ```bash
   npx tsx scripts/diagnose-all-exercises.ts
   ```

3. Check if the `is_bonus_exercise` flag is being set correctly:
   ```sql
   SELECT 
     tp.template_name,
     COUNT(CASE WHEN tpe.is_bonus_exercise = false THEN 1 END) as main_count,
     COUNT(CASE WHEN tpe.is_bonus_exercise = true THEN 1 END) as bonus_count
   FROM t_paths tp
   JOIN t_path_exercises tpe ON tp.id = tpe.template_id
   WHERE tp.parent_t_path_id IS NOT NULL
   GROUP BY tp.id, tp.template_name;
   ```

## Expected Exercise Counts by Session Length

| Session Length | Main Exercises | Bonus Exercises | Total |
|---------------|----------------|-----------------|-------|
| 15-30 min     | 3              | 3               | 6     |
| 30-45 min     | 5              | 3               | 8     |
| 45-60 min     | 7              | 2               | 9     |
| 60-90 min     | 10             | 2               | 12    |

## Files Created for This Fix

- `supabase/migrations/20260122_populate_movement_patterns.sql` - Migration to set movement_pattern
- `scripts/fix-exercise-counts.sql` - SQL queries for verification
- `scripts/regenerate-workouts.ts` - Script to regenerate workouts
- `scripts/diagnose-all-exercises.ts` - Diagnostic script
- `EXERCISE_COUNT_FIX.md` - This document

---

Let me know if you encounter any issues applying the fix!
