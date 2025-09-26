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

    // 1. Fetch the user's workout_plan (programme_type) from their profile
    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('programme_type')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') { // No rows found
        return new Response(JSON.stringify({ error: 'User profile not found or programme type not set.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw profileError;
    }

    const programmeType = profile?.programme_type;
    if (!programmeType) {
      return new Response(JSON.stringify({ error: 'User programme type not defined.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Determine the start of the current week (Monday at midnight UTC)
    const startOfWeek = getStartOfWeekUTC(new Date());

    // 3. Query workout_sessions to get a COUNT of workouts completed by the user since the start of the week
    const { count: completedCount, error: countError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('session_date', startOfWeek.toISOString());

    if (countError) throw countError;

    // 4. Based on the workout_plan, create a goal object
    let goal: { total: number; workouts: { name: string }[] };
    if (programmeType === 'ulul') {
      const workoutNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
      goal = { 
        total: 4, 
        workouts: workoutNames.map(name => ({ name })) 
      };
    } else if (programmeType === 'ppl') {
      const pplSequence = ['Push', 'Pull', 'Legs'];
      const numWorkoutsToShow = Math.max(3, completedCount || 0);
      const workouts = [];
      for (let i = 0; i < numWorkoutsToShow; i++) {
        workouts.push({ name: pplSequence[i % 3] });
      }
      goal = { 
        total: 3, // The "official" goal is still 3
        workouts: workouts
      };
    } else {
      goal = { total: 0, workouts: [] };
    }

    // 5. Return a single JSON object
    return new Response(
      JSON.stringify({
        completed_count: completedCount || 0,
        goal: goal,
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