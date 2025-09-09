// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkoutSession {
  session_date: string;
}

// Helper function to initialize Supabase client with service role key
const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Helper to log user-specific errors
const logUserAlert = async (supabase: any, userId: string, title: string, message: string, type: string = 'system_error') => {
  const { error: insertAlertError } = await supabase.from('user_alerts').insert({
    id: uuidv4(),
    user_id: userId,
    title: title,
    message: message,
    type: type,
    created_at: new Date().toISOString(),
    is_read: false,
  });
  if (insertAlertError) {
    console.error(`Failed to log user alert for user ${userId}:`, insertAlertError.message);
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let userId: string | null = null; // Declare userId here to be accessible in catch block

  try {
    const { user_id } = await req.json();
    userId = user_id; // Assign to outer scope userId

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all workout sessions for the user, ordered by date
    const { data: workoutSessions, error: sessionsError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('session_date')
      .eq('user_id', userId)
      .order('session_date', { ascending: false }); // Order descending to easily check recent activity

    if (sessionsError) throw sessionsError;

    const uniqueWorkoutDates = new Set<string>();
    (workoutSessions || []).forEach((session: WorkoutSession) => {
      uniqueWorkoutDates.add(new Date(session.session_date).toISOString().split('T')[0]);
    });

    let consecutivePeriods = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // Check the most recent 7-day period
    let hasWorkoutInCurrentPeriod = false;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(currentDate.getDate() - i);
      if (uniqueWorkoutDates.has(checkDate.toISOString().split('T')[0])) {
        hasWorkoutInCurrentPeriod = true;
        break;
      }
    }

    if (!hasWorkoutInCurrentPeriod) {
      // If no workout in the last 7 days, status is "Getting into it"
      const { error: updateError } = await supabaseServiceRoleClient
        .from('profiles')
        .update({ rolling_workout_status: 'Getting into it' })
        .eq('id', userId);
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ status: 'Getting into it', consecutivePeriods: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If there's a workout in the current 7-day period, start counting consecutive periods backwards
    consecutivePeriods = 1;
    let currentPeriodEndDate = new Date(currentDate);
    currentPeriodEndDate.setDate(currentPeriodEndDate.getDate() - 7); // End of the *previous* 7-day period

    while (true) {
      let foundWorkoutInPeriod = false;
      const periodStartDate = new Date(currentPeriodEndDate);
      periodStartDate.setDate(currentPeriodEndDate.getDate() - 6); // Start of the 7-day period

      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(periodStartDate);
        checkDate.setDate(periodStartDate.getDate() + i);
        if (uniqueWorkoutDates.has(checkDate.toISOString().split('T')[0])) {
          foundWorkoutInPeriod = true;
          break;
        }
      }

      if (foundWorkoutInPeriod) {
        consecutivePeriods++;
        currentPeriodEndDate.setDate(currentPeriodEndDate.getDate() - 7); // Move to the next previous period
      } else {
        break; // No workout found in this 7-day period, streak ends
      }
    }

    let status: string;
    if (consecutivePeriods === 0) {
      status = "Getting into it"; // Changed from "Ready to Start"
    } else if (consecutivePeriods >= 1 && consecutivePeriods <= 3) {
      status = "Building Momentum";
    } else if (consecutivePeriods >= 4 && consecutivePeriods <= 7) {
      status = "In the Zone";
    } else { // 8+ consecutive periods
      status = "On Fire";
    }

    const { error: updateError } = await supabaseServiceRoleClient
      .from('profiles')
      .update({ rolling_workout_status: status })
      .eq('id', userId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ status, consecutivePeriods }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in calculate-rolling-status edge function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    if (userId) {
      await logUserAlert(supabaseServiceRoleClient, userId, "Rolling Status Update Error", `An error occurred while updating your rolling workout status: ${message}`, "system_error");
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});