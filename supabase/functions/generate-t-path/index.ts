// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { 
  generateWorkoutPlanForTPath,
  RegenerationSummary,
  UserProfile
} from '../_shared/workout-generation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- EDGE FUNCTION HANDLER ---

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // @ts-ignore
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let userId: string | null = null;
  let oldSessionLength: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    await supabase.from('profiles').update({ 
      t_path_generation_status: 'in_progress', 
      t_path_generation_error: null 
    }).eq('id', userId);

    const { tPathId, preferred_session_length, old_session_length } = await req.json();
    oldSessionLength = old_session_length;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_gym_id, health_notes, preferred_muscles')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) throw new Error('User profile not found.');

    const { data: userGyms, error: gymsError } = await supabase
      .from('gyms')
      .select('id')
      .eq('user_id', userId);
    
    if (gymsError) throw gymsError;

    // Build user profile for workout generation
    const userProfileForGeneration: UserProfile = {
      active_gym_id: profile.active_gym_id,
      health_notes: profile.health_notes,
      preferred_muscles: profile.preferred_muscles
    };

    let latestSummary: RegenerationSummary | null = null;
    
    for (const gym of userGyms || []) {
      console.log(`[generate-t-path] Generating workouts for gym ${gym.id}`);
      
      const summary = await generateWorkoutPlanForTPath(
        supabase, 
        userId, 
        tPathId, 
        preferred_session_length, 
        gym.id, 
        userProfileForGeneration
      );
      
      console.log(`[generate-t-path] Gym ${gym.id} processed. Summary: ${summary.workouts.length} workouts generated. Is active gym: ${gym.id === profile.active_gym_id}`);
      
      if (gym.id === profile.active_gym_id) {
        latestSummary = summary;
      }
    }

    console.log(`[generate-t-path] Final summary to save: ${latestSummary ? `${latestSummary.workouts.length} workouts` : 'NULL'}`);

    await supabase.from('profiles').update({
      t_path_generation_status: 'completed',
      t_path_generation_error: null,
      t_path_generation_summary: latestSummary
    }).eq('id', userId);

    return new Response(JSON.stringify({ 
      message: 'Success',
      summary: latestSummary
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[generate-t-path] Error:", message);
    
    if (userId) {
      // Rollback session length if it was changed
      if (oldSessionLength) {
        await supabase.from('profiles').update({ preferred_session_length: oldSessionLength }).eq('id', userId);
      }
      await supabase.from('profiles').update({ 
        t_path_generation_status: 'failed', 
        t_path_generation_error: message 
      }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
