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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: fullPrompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorBody}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisJson = JSON.parse(openaiData.choices[0].message.content);

    const { error: logError } = await supabaseServiceRoleClient.from('ai_coach_usage_logs').insert({ user_id: user.id, used_at: new Date().toISOString() });
    if (logError) console.error("Error logging AI coach usage:", logError.message);

    return new Response(JSON.stringify({ analysis: analysisJson.analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});