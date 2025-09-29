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

// Helper to get the start of the current week (Monday at midnight UTC)
const getStartOfWeekUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
  const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday (UTC)
  d.setUTCDate(diff);
  return d;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    userId = user.id;

    // 1. Fetch the user's profile to get active T-Path and fallback programme type
    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('programme_type, active_t_path_id') // Select both fields
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') { // No rows found
        return new Response(JSON.stringify({ error: 'User profile not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw profileError;
    }

    let programmeType = profile?.programme_type; // Fallback value

    // If an active T-Path is set, use its settings as the source of truth
    if (profile?.active_t_path_id) {
      const { data: activeTPath, error: tPathError } = await supabaseServiceRoleClient
        .from('t_paths')
        .select('settings')
        .eq('id', profile.active_t_path_id)
        .single();
      
      if (tPathError && tPathError.code !== 'PGRST116') {
        console.error(`Error fetching active T-Path (${profile.active_t_path_id}) settings:`, tPathError.message);
        // Don't throw, just log and fall back to profile.programme_type
      } else if (activeTPath?.settings && typeof activeTPath.settings === 'object' && 'tPathType' in activeTPath.settings) {
        programmeType = (activeTPath.settings as { tPathType: string }).tPathType;
      }
    }

    if (!programmeType) {
      return new Response(JSON.stringify({ error: 'User programme type not defined.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Determine goal total
    const goal_total = programmeType === 'ulul' ? 4 : 3;

    // 3. Get start of week
    const startOfWeek = getStartOfWeekUTC(new Date());

    // 4. Query completed workout sessions for the week
    const { data: completedSessions, error: sessionsError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('id, template_name, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('completed_at', startOfWeek.toISOString())
      .order('completed_at', { ascending: true });

    if (sessionsError) throw sessionsError;

    // NEW: Query completed activities for the week
    const { data: completedActivities, error: activitiesError } = await supabaseServiceRoleClient
      .from('activity_logs')
      .select('id, activity_type, distance, time, log_date')
      .eq('user_id', userId)
      .gte('log_date', startOfWeek.toISOString());

    if (activitiesError) throw activitiesError;

    // 5. Format the completed workouts
    const completed_workouts = (completedSessions || []).map((session: { id: string, template_name: string | null }) => ({
      id: session.id,
      name: session.template_name || 'Ad Hoc Workout'
    }));

    // NEW: Format completed activities
    const completed_activities_details = (completedActivities || []).map((activity: any) => ({
        id: activity.id,
        type: activity.activity_type,
        distance: activity.distance,
        time: activity.time,
        date: activity.log_date,
    }));

    // 6. Return the new data structure
    return new Response(
      JSON.stringify({
        completed_workouts: completed_workouts,
        goal_total: goal_total,
        programme_type: programmeType,
        completed_activities: completed_activities_details,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in get-weekly-workout-summary edge function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});