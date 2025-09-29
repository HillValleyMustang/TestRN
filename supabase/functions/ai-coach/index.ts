// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Inlined CORS headers to resolve deployment issue
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define types for the data we're fetching
interface ExerciseDef {
  name: string;
  main_muscle: string;
}

interface SetLog {
  session_id: string;
  weight_kg: number | null;
  reps: number | null;
  time_seconds: number | null;
  exercise_definitions: Pick<ExerciseDef, 'name' | 'main_muscle'> | null; // Pick only 'name' and 'main_muscle'
}

interface WorkoutSession {
  id: string;
  session_date: string;
  template_name: string | null; // Keep template_name for existing workout_sessions
  rating: number | null; // ADDED: rating to workout session
}

// @ts-ignore
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// @ts-ignore
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Initialize Supabase client with service role key for logging
    // @ts-ignore
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { sessionId } = await req.json(); // NEW: Get sessionId from request body

    let sessions: WorkoutSession[] | null;
    let setLogs: SetLog[] | null;
    let prompt: string;

    if (sessionId) {
      // Fetch data for a specific session
      const { data: specificSession, error: specificSessionError } = await supabaseClient
        .from('workout_sessions')
        .select('id, session_date, template_name, rating')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .returns<WorkoutSession[]>();

      if (specificSessionError) throw specificSessionError;
      sessions = specificSession;

      if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ analysis: "Specific workout session not found." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: specificSetLogs, error: specificSetLogsError } = await supabaseClient
        .from('set_logs')
        .select('session_id, weight_kg, reps, time_seconds, exercise_definitions(name, main_muscle)')
        .eq('session_id', sessionId)
        .returns<SetLog[]>();

      if (specificSetLogsError) throw specificSetLogsError;
      setLogs = specificSetLogs;

      const workoutHistory = sessions.map((sessionItem: WorkoutSession) => {
        const logsForSession = setLogs?.filter((log: SetLog) => log.session_id === sessionItem.id);
        return {
          date: sessionItem.session_date,
          name: sessionItem.template_name,
          rating: sessionItem.rating,
          exercises: logsForSession?.map((log: SetLog) => ({
            name: log.exercise_definitions?.name,
            muscle: log.exercise_definitions?.main_muscle,
            weight: log.weight_kg,
            reps: log.reps,
            time: log.time_seconds,
          }))
        };
      });

      prompt = `
        You are an expert AI fitness coach. Analyze the following single workout session.
        The workout session includes a 'rating' from 1 to 5, where 5 is excellent and 1 is very poor.
        Provide a concise, encouraging, and actionable analysis specific to this workout.
        
        Your analysis should include:
        1.  **Overall Impression**: A brief summary of the session's performance and the user's rating.
        2.  **Highlights**: Identify strong performances or exercises where the user excelled.
        3.  **Areas for Improvement**: Suggest specific exercises or aspects of this workout that could be improved next time. Be gentle and encouraging.
        4.  **Next Session Focus**: Provide a clear, actionable suggestion for what the user could focus on in their *next* workout of this type.

        Keep the entire response under 250 words. Format your response using markdown for readability (e.g., use headings like **Highlights** and bullet points).

        Here is the user's workout session:
        ${JSON.stringify(workoutHistory, null, 2)}
      `;

    } else {
      // Existing logic for last 30 days analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentSessions, error: recentSessionsError } = await supabaseClient
        .from('workout_sessions')
        .select('id, session_date, template_name, rating')
        .eq('user_id', user.id)
        .gte('session_date', thirtyDaysAgo.toISOString())
        .returns<WorkoutSession[]>();

      if (recentSessionsError) throw recentSessionsError;
      sessions = recentSessions;

      if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ analysis: "Not enough workout data from the last 30 days to provide an analysis. Go log some workouts!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const sessionIds = sessions.map((s: WorkoutSession) => s.id);
      const { data: recentSetLogs, error: recentSetLogsError } = await supabaseClient
        .from('set_logs')
        .select('session_id, weight_kg, reps, time_seconds, exercise_definitions(name, main_muscle)')
        .in('session_id', sessionIds)
        .returns<SetLog[]>();

      if (recentSetLogsError) throw recentSetLogsError;
      setLogs = recentSetLogs;

      const workoutHistory = sessions.map((sessionItem: WorkoutSession) => {
        const logsForSession = setLogs?.filter((log: SetLog) => log.session_id === sessionItem.id);
        return {
          date: sessionItem.session_date,
          name: sessionItem.template_name,
          rating: sessionItem.rating,
          exercises: logsForSession?.map((log: SetLog) => ({
            name: log.exercise_definitions?.name,
            muscle: log.exercise_definitions?.main_muscle,
            weight: log.weight_kg,
            reps: log.reps,
            time: log.time_seconds,
          }))
        };
      });

      prompt = `
        You are an expert AI fitness coach. Analyze the following workout history from the last 30 days for a user.
        Each workout session includes a 'rating' from 1 to 5, where 5 is excellent and 1 is very poor.
        Provide a concise, encouraging, and actionable analysis.
        
        Your analysis should include:
        1.  **Overall Progress**: A brief summary of their consistency and progress, considering both performance and how they rated their sessions.
        2.  **Strengths**: Identify muscle groups or exercises where they are performing well or showing consistent improvement, especially noting high-rated sessions.
        3.  **Weaknesses/Areas for Improvement**: Identify muscle groups that are trained less frequently or exercises where progress is stalling. Pay attention to low-rated sessions – these might indicate discomfort, dislike, or excessive challenge. Be gentle and encouraging in your wording.
        4.  **Exercise Suggestions**: Recommend 1-2 specific exercises to help them with their weaknesses. Briefly explain why you are recommending them.

        Keep the entire response under 250 words. Format your response using markdown for readability (e.g., use headings like **Strengths** and bullet points).

        Here is the user's workout history:
        ${JSON.stringify(workoutHistory, null, 2)}
      `;
    }

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const analysis = geminiData.candidates[0].content.parts[0].text;

    // Log AI coach usage to the new table
    const { error: logError } = await supabaseServiceRoleClient
      .from('ai_coach_usage_logs')
      .insert({ user_id: user.id, used_at: new Date().toISOString() });

    if (logError) {
      console.error("Error logging AI coach usage:", logError.message);
      // Don't throw error, just log it, as the main function still succeeded
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});