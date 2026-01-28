import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mgbfevrzrbjjiajkqpti.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmZldnJ6cmJqamlhamtxcHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDA0NTIsImV4cCI6MjA3MDc3NjQ1Mn0.TBOWI0Q3pXfSVWsL2yHuHEnQUfPV6tHefU6-gqUblUI";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function diagnoseAllExercises() {
  console.log('🔍 Checking ALL exercises in database...\n');

  // Get ALL exercises (global + user-specific)
  const { data: allExercises, error: allExError } = await supabase
    .from('exercise_definitions')
    .select('id, name, movement_pattern, user_id, main_muscle');

  if (allExError) {
    console.error('Error fetching exercises:', allExError);
    return;
  }

  console.log(`📊 Total exercises in database: ${allExercises?.length || 0}\n`);

  // Count by user_id
  const globalCount = allExercises?.filter(e => e.user_id === null).length || 0;
  const userCount = allExercises?.filter(e => e.user_id !== null).length || 0;

  console.log(`  - Global exercises (user_id IS NULL): ${globalCount}`);
  console.log(`  - User-specific exercises: ${userCount}\n`);

  // Count by movement_pattern (all exercises)
  console.log('📊 Breakdown by movement_pattern (ALL exercises):');
  const byPattern: Record<string, number> = {};
  allExercises?.forEach(ex => {
    const pattern = ex.movement_pattern || 'NULL';
    byPattern[pattern] = (byPattern[pattern] || 0) + 1;
  });

  Object.entries(byPattern).sort((a, b) => b[1] - a[1]).forEach(([pattern, count]) => {
    console.log(`  - ${pattern}: ${count} exercises`);
  });

  console.log('\n📊 Breakdown by main_muscle (top 10):');
  const byMuscle: Record<string, number> = {};
  allExercises?.forEach(ex => {
    const muscle = ex.main_muscle || 'NULL';
    byMuscle[muscle] = (byMuscle[muscle] || 0) + 1;
  });

  Object.entries(byMuscle)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([muscle, count]) => {
      console.log(`  - ${muscle}: ${count} exercises`);
    });

  // Sample some exercises
  console.log('\n📝 Sample exercises (first 10):');
  allExercises?.slice(0, 10).forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name}`);
    console.log(`     - movement_pattern: ${ex.movement_pattern || 'NULL'}`);
    console.log(`     - main_muscle: ${ex.main_muscle || 'NULL'}`);
    console.log(`     - user_id: ${ex.user_id || 'NULL (global)'}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('💡 ANALYSIS:\n');
  
  if (globalCount === 0) {
    console.log('❌ PROBLEM: No global exercises found!');
    console.log('   The workout generation logic expects global exercises');
    console.log('   with user_id = NULL and movement_pattern set to Push/Pull/Legs.\n');
  }

  const pushCount = allExercises?.filter(e => e.movement_pattern === 'Push').length || 0;
  const pullCount = allExercises?.filter(e => e.movement_pattern === 'Pull').length || 0;
  const legsCount = allExercises?.filter(e => e.movement_pattern === 'Legs').length || 0;

  console.log(`Movement pattern counts:`);
  console.log(`  - Push: ${pushCount} (need 12 for 60-90 min workouts)`);
  console.log(`  - Pull: ${pullCount} (need 12 for 60-90 min workouts)`);
  console.log(`  - Legs: ${legsCount} (need 12 for 60-90 min workouts)`);

  if (pushCount < 12 || pullCount < 12 || legsCount < 12) {
    console.log('\n❌ PROBLEM: Not enough exercises with movement_pattern set!');
    console.log('   This is why you\'re seeing fewer exercises than expected.');
  }
}

diagnoseAllExercises().catch(console.error);
