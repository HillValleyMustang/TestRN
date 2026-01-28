// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { 
  generateWorkoutPlanForTPath,
  RegenerationSummary,
  UserProfile
} from '../_shared/workout-generation.ts';
import { getOrCreateMainTPath } from '../_shared/t-path-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseServiceRoleClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    await supabaseServiceRoleClient.from('profiles').update({ 
      t_path_generation_status: 'in_progress', 
      t_path_generation_error: null 
    }).eq('id', userId);

    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('programme_type, preferred_session_length, primary_goal, preferred_muscles, health_notes, active_gym_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) throw new Error('User profile not found.');
    if (!profile.programme_type) throw new Error('User has no core programme type set.');

    // Get or create THE SINGLE main t-path (gym_id = NULL)
    const mainTPathId = await getOrCreateMainTPath(
      supabaseServiceRoleClient,
      user.id,
      profile.programme_type,
      {
        primary_goal: profile.primary_goal,
        preferred_muscles: profile.preferred_muscles,
        health_notes: profile.health_notes
      }
    );

    // Delete ALL existing child workouts for this main t-path (across all gyms)
    const { data: oldChildren, error: fetchOldError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id')
      .eq('parent_t_path_id', mainTPathId)
      .eq('user_id', user.id);

    if (fetchOldError) throw fetchOldError;

    if (oldChildren && oldChildren.length > 0) {
      const childIds = oldChildren.map((c: { id: string }) => c.id);
      await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', childIds);
      await supabaseServiceRoleClient.from('t_paths').delete().in('id', childIds);
    }

    // Generate new child workouts for EACH gym using the shared personalization logic
    const { data: userGyms, error: gymsError } = await supabaseServiceRoleClient
      .from('gyms')
      .select('id')
      .eq('user_id', user.id);
    if (gymsError) throw gymsError;

    // Build user profile for workout generation
    const userProfileForGeneration: UserProfile = {
      active_gym_id: profile.active_gym_id,
      health_notes: profile.health_notes,
      preferred_muscles: profile.preferred_muscles
    };

    let latestSummary: RegenerationSummary | null = null;

    for (const gym of userGyms || []) {
      console.log(`[regenerate-all-user-plans] Generating workouts for gym ${gym.id}`);
      
      // Use the shared workout generation logic (same as duration changes)
      const summary = await generateWorkoutPlanForTPath(
        supabaseServiceRoleClient,
        user.id,
        mainTPathId,
        profile.preferred_session_length,
        gym.id,
        userProfileForGeneration
      );
      
      console.log(`[regenerate-all-user-plans] Gym ${gym.id} processed. Summary: ${summary.workouts.length} workouts generated`);
      
      // Keep the summary from the active gym to show to the user
      if (gym.id === profile.active_gym_id) {
        latestSummary = summary;
      }
    }

    // Update profile to point to this main t-path and save the regeneration summary
    await supabaseServiceRoleClient
      .from('profiles')
      .update({ 
        active_t_path_id: mainTPathId,
        t_path_generation_status: 'completed',
        t_path_generation_error: null,
        t_path_generation_summary: latestSummary
      })
      .eq('id', user.id);

    console.log(`[regenerate-all-user-plans] Successfully regenerated all plans for user ${userId}`);

    return new Response(JSON.stringify({ 
      message: 'All workout plans regenerated successfully.',
      summary: latestSummary
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in regenerate-all-user-plans edge function:", message);
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ 
        t_path_generation_status: 'failed', 
        t_path_generation_error: message 
      }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
