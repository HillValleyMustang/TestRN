import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mgbfevrzrbjjiajkqpti.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYmZldnJ6cmJqamlhamtxcHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDA0NTIsImV4cCI6MjA3MDc3NjQ1Mn0.TBOWI0Q3pXfSVWsL2yHuHEnQUfPV6tHefU6-gqUblUI";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function regenerateWorkouts() {
  console.log('🔄 Regenerating workouts with correct exercise counts...\n');

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ Authentication required. Please log in to your app first.');
    console.log('\n💡 To use this script:');
    console.log('   1. Open your mobile app');
    console.log('   2. Log in');
    console.log('   3. Then run this script again\n');
    return;
  }

  console.log(`✅ Authenticated as user: ${user.id}\n`);

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('active_t_path_id, preferred_session_length, active_gym_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('❌ Error fetching profile:', profileError);
    return;
  }

  console.log('📋 Current profile settings:');
  console.log(`   Session length: ${profile.preferred_session_length}`);
  console.log(`   Active T-Path ID: ${profile.active_t_path_id}`);
  console.log(`   Active Gym ID: ${profile.active_gym_id}\n`);

  if (!profile.active_t_path_id) {
    console.error('❌ No active T-Path found. Please complete onboarding first.');
    return;
  }

  // Get user's access token for edge function call
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('❌ No active session found.');
    return;
  }

  console.log('🔄 Calling generate-t-path edge function...\n');

  // Call the generate-t-path edge function to regenerate workouts
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-t-path`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tPathId: profile.active_t_path_id,
      preferred_session_length: profile.preferred_session_length,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Error regenerating workouts:', errorData);
    return;
  }

  const result = await response.json();
  console.log('✅ Workouts regenerated successfully!\n');

  // Verify the new exercise counts
  console.log('📊 Verifying new exercise counts...\n');

  const { data: childWorkouts } = await supabase
    .from('t_paths')
    .select('id, template_name')
    .eq('parent_t_path_id', profile.active_t_path_id)
    .not('parent_t_path_id', 'is', null);

  if (!childWorkouts || childWorkouts.length === 0) {
    console.log('⚠️  No child workouts found after regeneration.');
    return;
  }

  for (const workout of childWorkouts) {
    const { data: exercises } = await supabase
      .from('t_path_exercises')
      .select('id, is_bonus_exercise')
      .eq('template_id', workout.id);

    const mainCount = exercises?.filter(e => !e.is_bonus_exercise).length || 0;
    const bonusCount = exercises?.filter(e => e.is_bonus_exercise).length || 0;
    const totalCount = exercises?.length || 0;

    console.log(`  📝 ${workout.template_name}`);
    console.log(`     Total: ${totalCount} exercises`);
    console.log(`     Main: ${mainCount} | Bonus: ${bonusCount}`);
    
    const expectedTotal = profile.preferred_session_length === '60-90' ? 12 : 
                         profile.preferred_session_length === '45-60' ? 9 :
                         profile.preferred_session_length === '30-45' ? 8 : 6;
    
    if (totalCount === expectedTotal) {
      console.log(`     ✅ Correct count!\n`);
    } else {
      console.log(`     ⚠️  Expected ${expectedTotal} exercises\n`);
    }
  }

  console.log('🎉 Done! Check your mobile app to see the updated workouts.');
}

regenerateWorkouts().catch(console.error);
