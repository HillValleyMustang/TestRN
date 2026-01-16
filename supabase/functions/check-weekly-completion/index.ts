// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to initialize Supabase client with service role key
const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Helper function to get Monday (week start) for a given date
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = day === 0 ? 6 : day - 1; // Days to subtract to get to Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCSeconds(0, 0);
  d.setUTCMilliseconds(0);
  return d;
};

// Helper function to get required workout names for a programme type
const getRequiredWorkouts = (programmeType: string): string[] => {
  if (programmeType === 'ulul') {
    return ['Upper Body A', 'Upper Body B', 'Lower Body A', 'Lower Body B'];
  } else if (programmeType === 'ppl') {
    return ['Push', 'Pull', 'Legs'];
  }
  return [];
};

// Check weekly completion for a single user
const checkUserWeeklyCompletion = async (
  supabase: any,
  userId: string,
  activeTPathId: string | null,
  weekStart: Date
): Promise<void> => {
  if (!activeTPathId) {
    console.log(`[check-weekly-completion] User ${userId} has no active T-path, skipping`);
    return;
  }

  // Get T-path settings to determine programme type
  const { data: tpathData, error: tpathError } = await supabase
    .from('t_paths')
    .select('settings')
    .eq('id', activeTPathId)
    .single();

  if (tpathError || !tpathData?.settings) {
    console.error(`[check-weekly-completion] Error fetching T-path for user ${userId}:`, tpathError);
    return;
  }

  const programmeType = (tpathData.settings as { tPathType?: string }).tPathType;
  if (!programmeType || (programmeType !== 'ppl' && programmeType !== 'ulul')) {
    console.log(`[check-weekly-completion] User ${userId} has invalid programme type: ${programmeType}, skipping`);
    return;
  }

  const requiredWorkouts = getRequiredWorkouts(programmeType);
  if (requiredWorkouts.length === 0) {
    console.log(`[check-weekly-completion] No required workouts for programme type ${programmeType}, skipping`);
    return;
  }

  // Check if we've already processed this week
  const weekStartStr = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
  const { data: existingRecord, error: recordError } = await supabase
    .from('user_weekly_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .single();

  if (recordError && recordError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
    console.error(`[check-weekly-completion] Error checking existing record for user ${userId}:`, recordError);
    return;
  }

  // If already processed (both bonus and penalty), skip
  if (existingRecord?.points_awarded && existingRecord?.penalty_applied) {
    console.log(`[check-weekly-completion] Week ${weekStartStr} already processed for user ${userId}, skipping`);
    return;
  }

  // Get all workouts completed in the previous week
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6); // Sunday
  weekEnd.setUTCHours(23, 59, 59, 999);

  const { data: workouts, error: workoutsError } = await supabase
    .from('workout_sessions')
    .select('id, template_name, session_date')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('session_date', weekStart.toISOString())
    .lte('session_date', weekEnd.toISOString());

  if (workoutsError) {
    console.error(`[check-weekly-completion] Error fetching workouts for user ${userId}:`, workoutsError);
    return;
  }

  // Extract unique workout names (case-insensitive matching)
  const completedWorkoutNames = new Set<string>();
  workouts?.forEach(workout => {
    if (workout.template_name) {
      const normalizedName = workout.template_name.trim();
      completedWorkoutNames.add(normalizedName);
    }
  });

  // Check if all required workouts were completed
  const allRequiredCompleted = requiredWorkouts.every(required =>
    Array.from(completedWorkoutNames).some(completed =>
      completed.toLowerCase().includes(required.toLowerCase())
    )
  );

  console.log(`[check-weekly-completion] User ${userId}, week ${weekStartStr}: completed=${allRequiredCompleted}, workouts=${Array.from(completedWorkoutNames).join(', ')}`);

  // Get current points
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error(`[check-weekly-completion] Error fetching profile for user ${userId}:`, profileError);
    return;
  }

  const currentPoints = profile?.total_points || 0;

  // Upsert weekly completion record
  const completionRecord = {
    user_id: userId,
    week_start: weekStartStr,
    programme_type: programmeType,
    completed: allRequiredCompleted,
    points_awarded: existingRecord?.points_awarded || false,
    penalty_applied: existingRecord?.penalty_applied || false,
    updated_at: new Date().toISOString()
  };

  const { error: upsertError } = await supabase
    .from('user_weekly_completions')
    .upsert(completionRecord, {
      onConflict: 'user_id,week_start'
    });

  if (upsertError) {
    console.error(`[check-weekly-completion] Error upserting completion record for user ${userId}:`, upsertError);
    return;
  }

  // Award bonus for complete week
  if (allRequiredCompleted && !existingRecord?.points_awarded) {
    const newPoints = currentPoints + 10;
    const { error: pointsError } = await supabase
      .from('profiles')
      .update({
        total_points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (pointsError) {
      console.error(`[check-weekly-completion] Error awarding bonus points for user ${userId}:`, pointsError);
    } else {
      console.log(`[check-weekly-completion] Awarded +10 points to user ${userId} for complete week ${weekStartStr}`);
      
      // Update completion record
      await supabase
        .from('user_weekly_completions')
        .update({
          points_awarded: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('week_start', weekStartStr);
    }
  }

  // Apply penalty for incomplete week
  if (!allRequiredCompleted && !existingRecord?.penalty_applied) {
    const newPoints = Math.max(0, currentPoints - 5); // Never go below 0
    const { error: pointsError } = await supabase
      .from('profiles')
      .update({
        total_points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (pointsError) {
      console.error(`[check-weekly-completion] Error applying penalty points for user ${userId}:`, pointsError);
    } else {
      console.log(`[check-weekly-completion] Applied -5 points penalty to user ${userId} for incomplete week ${weekStartStr} (${currentPoints} -> ${newPoints})`);
      
      // Update completion record
      await supabase
        .from('user_weekly_completions')
        .update({
          penalty_applied: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('week_start', weekStartStr);
    }
  }
};

// Main handler
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();

  try {
    // Parse request body for optional parameters
    // Handle both empty bodies and JSON bodies gracefully
    let body: any = {};
    try {
      const contentType = req.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await req.text();
        if (text) {
          body = JSON.parse(text);
        }
      }
    } catch (parseError) {
      // If body parsing fails, continue with empty body (for cron job calls without body)
      console.log('[check-weekly-completion] No request body or invalid JSON, using defaults');
    }
    const { user_id, weeks } = body as { user_id?: string; weeks?: string[] };

    // If user_id is provided, check only that user for specified weeks or all missed weeks
    if (user_id) {
      console.log(`[check-weekly-completion] Client-side check for user ${user_id}`);
      
      // Get user's active T-path
      const { data: profile, error: profileError } = await supabaseServiceRoleClient
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', user_id)
        .single();

      if (profileError || !profile?.active_t_path_id) {
        return new Response(
          JSON.stringify({ message: 'User has no active T-path', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If specific weeks provided, check those. Otherwise check all missed weeks
      let weeksToCheck: Date[] = [];
      
      if (weeks && weeks.length > 0) {
        weeksToCheck = weeks.map(w => new Date(w));
      } else {
        // Calculate missed weeks from last processed to now
        const today = new Date();
        const todayWeekStart = getWeekStart(today);
        const maxWeekStart = new Date(todayWeekStart);
        maxWeekStart.setUTCDate(maxWeekStart.getUTCDate() - 7); // Don't check current week

        // Get last processed week
        const { data: lastProcessed, error: lastProcessedError } = await supabaseServiceRoleClient
          .from('user_weekly_completions')
          .select('week_start')
          .eq('user_id', user_id)
          .order('week_start', { ascending: false })
          .limit(1)
          .single();

        let startWeekStart: Date;
        if (!lastProcessedError && lastProcessed?.week_start) {
          startWeekStart = new Date(lastProcessed.week_start);
          startWeekStart.setUTCDate(startWeekStart.getUTCDate() + 7); // Next week after last processed
        } else {
          // Check last 4 weeks if no record exists
          startWeekStart = new Date(todayWeekStart);
          startWeekStart.setUTCDate(startWeekStart.getUTCDate() - 28); // 4 weeks ago
        }

        // Generate weeks to check
        const currentCheck = new Date(startWeekStart);
        while (currentCheck <= maxWeekStart) {
          weeksToCheck.push(new Date(currentCheck));
          currentCheck.setUTCDate(currentCheck.getUTCDate() + 7);
        }
      }

      if (weeksToCheck.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No weeks to check', processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process each week for this user
      let processed = 0;
      let errors = 0;

      for (const weekStart of weeksToCheck) {
        try {
          await checkUserWeeklyCompletion(
            supabaseServiceRoleClient,
            user_id,
            profile.active_t_path_id,
            weekStart
          );
          processed++;
        } catch (error) {
          console.error(`[check-weekly-completion] Error processing week ${weekStart.toISOString().split('T')[0]} for user ${user_id}:`, error);
          errors++;
        }
      }

      return new Response(
        JSON.stringify({
          message: 'User weekly completion check completed',
          user_id,
          weeks_checked: weeksToCheck.length,
          processed,
          errors
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default behavior: Check all users for previous week (cron job mode)
    // Calculate previous week's Monday (week start)
    const today = new Date();
    const lastWeekStart = getWeekStart(today);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7); // Previous week's Monday

    console.log(`[check-weekly-completion] Cron job mode: Checking weekly completion for week starting ${lastWeekStart.toISOString().split('T')[0]}`);

    // Get all users with active T-paths
    const { data: profiles, error: profilesError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('id, active_t_path_id')
      .not('active_t_path_id', 'is', null);

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('[check-weekly-completion] No users with active T-paths found');
      return new Response(
        JSON.stringify({ message: 'No users with active T-paths found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-weekly-completion] Processing ${profiles.length} users`);

    // Process each user
    let processed = 0;
    let errors = 0;

    for (const profile of profiles) {
      try {
        await checkUserWeeklyCompletion(
          supabaseServiceRoleClient,
          profile.id,
          profile.active_t_path_id,
          lastWeekStart
        );
        processed++;
      } catch (error) {
        console.error(`[check-weekly-completion] Error processing user ${profile.id}:`, error);
        errors++;
      }
    }

    console.log(`[check-weekly-completion] Completed: ${processed} users processed, ${errors} errors`);

    return new Response(
      JSON.stringify({
        message: 'Weekly completion check completed',
        week_start: lastWeekStart.toISOString().split('T')[0],
        processed,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[check-weekly-completion] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
