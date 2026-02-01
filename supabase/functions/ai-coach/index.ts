// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExerciseDef { name: string; main_muscle: string; }
interface SetLog {
  session_id: string; weight_kg: number | null; reps: number | null; time_seconds: number | null;
  exercise_definitions: Pick<ExerciseDef, 'name' | 'main_muscle'> | null;
}
interface WorkoutSession { id: string; session_date: string; template_name: string | null; rating: number | null; }

// @ts-ignore
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Check daily usage limit (2 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const { count: usageCount, error: usageError } = await supabaseServiceRoleClient
      .from('ai_coach_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('used_at', today.toISOString())
      .lt('used_at', tomorrow.toISOString());

    if (usageError) throw new Error(`Failed to check usage: ${usageError.message}`);

    if (usageCount !== null && usageCount >= 2) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached. You can use AI Coach 2 times per day.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId } = await req.json();
    let prompt: string;
    let workoutHistory;

    if (sessionId) {
      const { data: sessions, error: sessionError } = await supabaseClient.from('workout_sessions').select('id, session_date, template_name, rating').eq('id', sessionId).eq('user_id', user.id).returns<WorkoutSession[]>();
      if (sessionError) throw sessionError;
      if (!sessions || sessions.length === 0) return new Response(JSON.stringify({ analysis: "Specific workout session not found." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      
      const { data: setLogs, error: setLogsError } = await supabaseClient.from('set_logs').select('session_id, weight_kg, reps, time_seconds, exercise_definitions(name, main_muscle)').eq('session_id', sessionId).returns<SetLog[]>();
      if (setLogsError) throw setLogsError;

      workoutHistory = sessions.map((s: WorkoutSession) => ({ ...s, exercises: setLogs?.filter((l: SetLog) => l.session_id === s.id).map((l: SetLog) => ({ name: l.exercise_definitions?.name, muscle: l.exercise_definitions?.main_muscle, weight: l.weight_kg, reps: l.reps, time: l.time_seconds })) }));
      prompt = `Analyze the following single workout session... Provide a concise, encouraging, and actionable analysis specific to this workout... Your response must be a JSON object with a single key "analysis" containing the markdown formatted string. Example: {"analysis": "**Overall Impression**\\n..."}`;
    } else {
      // Check eligibility: 6 workouts AND 30 days since first workout
      const { count: totalWorkouts, error: countError } = await supabaseClient
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) throw countError;

      if (totalWorkouts === null || totalWorkouts < 6) {
        return new Response(
          JSON.stringify({ error: 'You need at least 6 completed workouts to use AI Coach.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: firstWorkout, error: firstWorkoutError } = await supabaseClient
        .from('workout_sessions')
        .select('session_date')
        .eq('user_id', user.id)
        .order('session_date', { ascending: true })
        .limit(1)
        .single();

      if (firstWorkoutError && firstWorkoutError.code !== 'PGRST116') {
        throw firstWorkoutError;
      }

      if (firstWorkout) {
        const firstDate = new Date(firstWorkout.session_date);
        const now = new Date();
        const daysSinceFirst = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceFirst < 30) {
          return new Response(
            JSON.stringify({ error: 'You need at least 30 days of training history to use AI Coach.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: sessions, error: sessionsError } = await supabaseClient.from('workout_sessions').select('id, session_date, template_name, rating').eq('user_id', user.id).gte('session_date', thirtyDaysAgo.toISOString()).returns<WorkoutSession[]>();
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return new Response(JSON.stringify({ analysis: "Not enough workout data from the last 30 days to provide an analysis." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      
      const sessionIds = sessions.map((s: WorkoutSession) => s.id);
      const { data: setLogs, error: setLogsError } = await supabaseClient.from('set_logs').select('session_id, weight_kg, reps, time_seconds, exercise_definitions(name, main_muscle)').in('session_id', sessionIds).returns<SetLog[]>();
      if (setLogsError) throw setLogsError;

      workoutHistory = sessions.map((s: WorkoutSession) => ({ ...s, exercises: setLogs?.filter((l: SetLog) => l.session_id === s.id).map((l: SetLog) => ({ name: l.exercise_definitions?.name, muscle: l.exercise_definitions?.main_muscle, weight: l.weight_kg, reps: l.reps, time: l.time_seconds })) }));
      prompt = `Analyze the following workout history from the last 30 days... Provide a concise, encouraging, and actionable analysis... Your response must be a JSON object with a single key "analysis" containing the markdown formatted string. Example: {"analysis": "**Overall Progress**\\n..."}`;
    }

    const fullPrompt = `${prompt}\n\nWorkout Data:\n${JSON.stringify(workoutHistory, null, 2)}`;

    // Log usage BEFORE calling Gemini to prevent race conditions
    const { error: logError } = await supabaseServiceRoleClient
      .from('ai_coach_usage_logs')
      .insert({ user_id: user.id, used_at: new Date().toISOString() });

    if (logError) {
      console.error("Error logging AI coach usage:", logError.message);
      throw new Error('Failed to log usage');
    }

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates[0].content.parts[0].text;
    const analysisJson = JSON.parse(responseText);

    return new Response(JSON.stringify({ analysis: analysisJson.analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});