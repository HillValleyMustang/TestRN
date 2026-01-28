import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mgbfevrzrbjjiajkqpti.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmZldnJ6cmJqamlhamtxcHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDA0NTIsImV4cCI6MjA3MDc3NjQ1Mn0.TBOWI0Q3pXfSVWsL2yHuHEnQUfPV6tHefU6-gqUblUI";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function diagnoseExerciseCounts() {
  console.log('🔍 Diagnosing exercise counts issue...\n');

  // 1. Check total exercises by movement_pattern
  console.log('📊 Part 1: Total exercises by movement_pattern');
  console.log('='.repeat(60));
  
  const { data: allExercises, error: allExError } = await supabase
    .from('exercise_definitions')
    .select('id, name, movement_pattern, user_id')
    .is('user_id', null); // Only global exercises

  if (allExError) {
    console.error('Error fetching exercises:', allExError);
    return;
  }

  const exercisesByPattern: Record<string, number> = {
    'Push': 0,
    'Pull': 0,
    'Legs': 0,
    'null': 0,
    'other': 0
  };

  allExercises?.forEach(ex => {
    if (ex.movement_pattern === 'Push') exercisesByPattern['Push']++;
    else if (ex.movement_pattern === 'Pull') exercisesByPattern['Pull']++;
    else if (ex.movement_pattern === 'Legs') exercisesByPattern['Legs']++;
    else if (ex.movement_pattern === null) exercisesByPattern['null']++;
    else exercisesByPattern['other']++;
  });

  console.log(`Total global exercises: ${allExercises?.length || 0}`);
  console.log(`  - Push exercises: ${exercisesByPattern['Push']}`);
  console.log(`  - Pull exercises: ${exercisesByPattern['Pull']}`);
  console.log(`  - Legs exercises: ${exercisesByPattern['Legs']}`);
  console.log(`  - NULL movement_pattern: ${exercisesByPattern['null']}`);
  console.log(`  - Other patterns: ${exercisesByPattern['other']}`);

  // 2. Check user's actual workout exercise counts
  console.log('\n📊 Part 2: User workout exercise counts');
  console.log('='.repeat(60));

  // You'll need to get the user ID - for now using a placeholder
  // Replace this with actual user authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('⚠️  No authenticated user. Please log in first.');
    console.log('   You can run this script after authenticating in your app.');
    return;
  }

  const userId = user.id;
  console.log(`User ID: ${userId}\n`);

  // Get user's profile to find session length
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_session_length, active_gym_id, active_t_path_id')
    .eq('id', userId)
    .single();

  if (profile) {
    console.log(`Session Length: ${profile.preferred_session_length}`);
    console.log(`Active Gym ID: ${profile.active_gym_id}`);
    console.log(`Active T-Path ID: ${profile.active_t_path_id}\n`);
  }

  // Get user's workout exercise counts
  const { data: tPaths } = await supabase
    .from('t_paths')
    .select('id, template_name, parent_t_path_id')
    .eq('user_id', userId)
    .not('parent_t_path_id', 'is', null); // Only child workouts

  if (!tPaths || tPaths.length === 0) {
    console.log('⚠️  No workouts found for this user.');
    return;
  }

  console.log(`Found ${tPaths.length} workouts:`);

  for (const tPath of tPaths) {
    const { data: exercises } = await supabase
      .from('t_path_exercises')
      .select('id, exercise_id, is_bonus_exercise, order_index')
      .eq('template_id', tPath.id)
      .order('order_index', { ascending: true });

    const mainCount = exercises?.filter(e => !e.is_bonus_exercise).length || 0;
    const bonusCount = exercises?.filter(e => e.is_bonus_exercise).length || 0;
    const totalCount = exercises?.length || 0;

    console.log(`\n  📝 ${tPath.template_name}`);
    console.log(`     T-Path ID: ${tPath.id}`);
    console.log(`     Total exercises: ${totalCount}`);
    console.log(`     Main exercises: ${mainCount}`);
    console.log(`     Bonus exercises: ${bonusCount}`);
    console.log(`     Expected for 60-90 min: 10 main + 2 bonus = 12 total`);
    
    if (totalCount < 12) {
      console.log(`     ❌ MISSING ${12 - totalCount} exercises!`);
    }
  }

  // 3. Check available exercises for each workout type
  console.log('\n📊 Part 3: Available exercises per workout type');
  console.log('='.repeat(60));

  const workoutTypes = ['Push', 'Pull', 'Legs'];
  
  for (const workoutType of workoutTypes) {
    const { data: available } = await supabase
      .from('exercise_definitions')
      .select('id, name, movement_pattern')
      .eq('movement_pattern', workoutType)
      .is('user_id', null);

    console.log(`\n  ${workoutType}:`);
    console.log(`    Available exercises: ${available?.length || 0}`);
    console.log(`    Needed for 60-90 min: 12 (10 main + 2 bonus)`);
    
    if ((available?.length || 0) < 12) {
      console.log(`    ❌ NOT ENOUGH! Missing ${12 - (available?.length || 0)} exercises`);
    } else {
      console.log(`    ✅ Sufficient exercises available`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Diagnosis complete!\n');
  
  // Summary
  console.log('💡 FINDINGS:');
  console.log('   If any workout has < 12 exercises available in the database,');
  console.log('   that\'s why you\'re seeing fewer exercises than expected.');
  console.log('   The workout generation logic can\'t create more exercises');
  console.log('   than what exists in the database.\n');
}

diagnoseExerciseCounts().catch(console.error);
