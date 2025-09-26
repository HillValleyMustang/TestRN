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

    // 2. Determine goal total
    const goal_total = programmeType === 'ulul' ? 4 : 3;

    // 3. Get start of week
    const startOfWeek = getStartOfWeekUTC(new Date());

    // 4. Query completed workout sessions for the week
    const { data: completedSessions, error: sessionsError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('id, template_name, completed_at') // Select id, name and completion time
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('completed_at', startOfWeek.toISOString()) // Use completed_at for accuracy
      .order('completed_at', { ascending: true }); // Order chronologically

    if (sessionsError) throw sessionsError;

    // 5. Format the completed workouts
    const completed_workouts = (completedSessions || []).map((session: { id: string, template_name: string | null }) => ({
      id: session.id,
      name: session.template_name || 'Ad Hoc Workout'
    }));

    // 6. Return the new data structure
    return new Response(
      JSON.stringify({
        completed_workouts: completed_workouts,
        goal_total: goal_total,
        programme_type: programmeType,
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