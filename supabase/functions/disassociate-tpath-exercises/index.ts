// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for elevated permissions
    // @ts-ignore
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate the user using the JWT from the client's Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      console.error('Unauthorized: No user session found or user fetch error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`User authenticated: ${user.id}`);

    const { oldTPathId, newTPathId } = await req.json();
    console.log(`Received oldTPathId: ${oldTPathId}, newTPathId: ${newTPathId}`);

    // 1. Find all child workouts (is_bonus = true) associated with the oldTPathId
    if (oldTPathId) {
      console.log(`Fetching child workouts for old T-Path: ${oldTPathId}`);
      const { data: oldChildWorkouts, error: fetchChildWorkoutsError } = await supabaseServiceRoleClient
        .from('t_paths')
        .select('id')
        .eq('parent_t_path_id', oldTPathId)
        .eq('is_bonus', true) // Ensure we only target child workouts
        .eq('user_id', user.id); // Ensure they belong to the current user

      if (fetchChildWorkoutsError) {
        console.error('Error fetching old child workouts:', fetchChildWorkoutsError.message);
        throw fetchChildWorkoutsError;
      }

      if (oldChildWorkouts && oldChildWorkouts.length > 0) {
        const oldChildWorkoutIds = oldChildWorkouts.map((w: { id: string }) => w.id);
        console.log(`Found old child workout IDs: ${oldChildWorkoutIds.join(', ')}`);

        // 2. Delete associated t_path_exercises for these old child workouts
        console.log('Deleting t_path_exercises for old child workouts...');
        const { error: deleteTPathExercisesError } = await supabaseServiceRoleClient
          .from('t_path_exercises')
          .delete()
          .in('template_id', oldChildWorkoutIds);

        if (deleteTPathExercisesError) {
          console.error('Error deleting t_path_exercises:', deleteTPathExercisesError.message);
          throw deleteTPathExercisesError;
        }
        console.log('Successfully deleted t_path_exercises for old child workouts.');
      } else {
        console.log('No old child workouts found for disassociation.');
      }
    } else {
      console.log('No oldTPathId provided, skipping disassociation of exercises.');
    }

    // 3. Update the user's active_t_path_id in their profiles table
    console.log(`Updating user profile active_t_path_id to ${newTPathId} for user ${user.id}`);
    const { error: updateProfileError } = await supabaseServiceRoleClient
      .from('profiles')
      .update({ active_t_path_id: newTPathId })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError.message);
      throw updateProfileError;
    }
    console.log('User profile active_t_path_id updated successfully.');

    return new Response(
      JSON.stringify({ message: 'T-Path switched and old exercises disassociated successfully.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during T-Path switch.";
    console.error('Unhandled error in disassociate-tpath-exercises edge function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});