// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkoutSession {
  session_date: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all workout sessions for the user, ordered by date
    const { data: workoutSessions, error: sessionsError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('session_date')
      .eq('user_id', user_id)
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
      // If no workout in the last 7 days, status is "Ready to Start"
      const { error: updateError } = await supabaseServiceRoleClient
        .from('profiles')
        .update({ rolling_workout_status: 'Ready to Start' })
        .eq('id', user_id);
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ status: 'Ready to Start', consecutivePeriods: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If there's a workout in the current 7-day period, start counting consecutive periods backwards
    consecutivePeriods = 1;
    let currentPeriodEndDate = new Date(currentDate);
    currentPeriodEndDate.setDate(currentDate.getDate() - 7); // End of the *previous* 7-day period

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
      status = "Ready to Start";
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
      .eq('id', user_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ status, consecutivePeriods }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in calculate-rolling-status edge function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});