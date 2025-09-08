// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { getSupabaseClients, getMaxMinutes, getWorkoutNamesForSplit } from './utils.ts';
import { processSingleChildWorkout } from './workout_processor.ts';
import { ExerciseDefinitionForWorkoutGeneration, TPathData, ProfileData } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Main Serve Function ---
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function: generate-t-path started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');

    const { supabaseAuthClient, supabaseServiceRoleClient } = getSupabaseClients(authHeader);

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    console.log(`User authenticated: ${user.id}`);

    const { tPathId } = await req.json();
    if (!tPathId) throw new Error('tPathId is required');
    console.log(`Received tPathId (main T-Path ID): ${tPathId}`);

    // --- IMMEDIATE RESPONSE ---
    // Send a 200 OK response immediately to unblock the client.
    // The rest of the function will continue to execute in the background.
    // This is a common pattern for long-running tasks in serverless functions.
    const response = new Response(
      JSON.stringify({ message: 'T-Path generation initiated successfully (background process).', functionId: 'N/A' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // --- ASYNCHRONOUS BACKGROUND WORK ---
    // Use a self-executing async function to perform the heavy work
    // This allows the main `serve` function to return `response` immediately.
    (async () => {
      try {
        // Step 1: Fetch T-Path details and user's preferred session length
        console.log(`[Background] Fetching T-Path details for ID: ${tPathId} and user profile for preferred session length.`);
        const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
          .from('t_paths')
          .select('id, template_name, settings, user_id')
          .eq('id', tPathId)
          .eq('user_id', user.id)
          .single();
        if (tPathError) throw tPathError;
        if (!tPathData) throw new Error('Main T-Path not found or does not belong to user.');
        const tPath: TPathData = tPathData;
        console.log('[Background] Fetched T-Path data:', tPath);

        const { data: profileData, error: profileError } = await supabaseServiceRoleClient
          .from('profiles')
          .select('preferred_session_length')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        const preferredSessionLength = (profileData as ProfileData)?.preferred_session_length;
        console.log('[Background] Fetched profile data, preferred_session_length:', preferredSessionLength);

        const tPathSettings = tPath.settings as { tPathType?: string };
        if (!tPathSettings || !tPathSettings.tPathType) throw new Error('Invalid T-Path settings.');
        
        const workoutSplit = tPathSettings.tPathType;
        const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
        console.log(`[Background] Workout split: ${workoutSplit}, Max Minutes: ${maxAllowedMinutes}`);

        const workoutNames = getWorkoutNamesForSplit(workoutSplit);
        console.log('[Background] Workout names to process:', workoutNames);

        // Step 2: Fetch all user-owned and global exercises for efficient lookup
        console.log('[Background] Fetching all user-owned and global exercises for lookup map...');
        const { data: allUserAndGlobalExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient
          .from('exercise_definitions')
          .select('id, library_id, user_id, icon_url')
          .or(`user_id.eq.${user.id},user_id.is.null`);
        if (fetchAllExercisesError) throw fetchAllExercisesError;
        const exerciseLookupMap = new Map<string, ExerciseDefinitionForWorkoutGeneration>();
        (allUserAndGlobalExercises as ExerciseDefinitionForWorkoutGeneration[]).forEach(ex => {
          exerciseLookupMap.set(ex.id, ex);
          if (ex.library_id) {
            exerciseLookupMap.set(ex.library_id, ex);
          }
        });
        console.log(`[Background] Fetched ${exerciseLookupMap.size} user and global exercises for lookup.`);

        // Step 3: Process each workout (child T-Path)
        const generatedWorkouts = [];
        for (const workoutName of workoutNames) {
          console.log(`[Background] Starting processSingleChildWorkout for: ${workoutName}`);
          const result = await processSingleChildWorkout(
            supabaseServiceRoleClient,
            user,
            tPath,
            workoutName,
            workoutSplit,
            maxAllowedMinutes,
            exerciseLookupMap
          );
          generatedWorkouts.push(result);
          console.log(`[Background] Finished processSingleChildWorkout for: ${workoutName}. Result:`, result);
        }
        console.log('Edge Function: generate-t-path background process finished successfully.');

      } catch (backgroundError: any) {
        console.error('Edge Function: generate-t-path background process failed:', backgroundError);
        // Log this error, but don't re-throw as the main response has already been sent.
        // Consider adding a mechanism to notify the user of background failures (e.g., a notification table).
      }
    })();

    return response; // Return the immediate response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('Unhandled error in generate-t-path edge function (before background spawn):', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});