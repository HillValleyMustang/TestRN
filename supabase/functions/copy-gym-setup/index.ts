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

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    const { sourceGymId, targetGymId } = await req.json();
    if (!sourceGymId || !targetGymId) throw new Error('sourceGymId and targetGymId are required.');

    // Call the safe PostgreSQL function to handle the transactional copy
    const { data: newMainTPathId, error: rpcError } = await supabaseServiceRoleClient.rpc('clone_gym_setup', {
      source_gym_id_in: sourceGymId,
      target_gym_id_in: targetGymId,
      user_id_in: userId,
    });

    if (rpcError) {
      console.error("Error from clone_gym_setup RPC:", rpcError);
      throw rpcError;
    }

    // Handle case where source gym had no plan to copy
    if (!newMainTPathId) {
      throw new Error("The source gym does not have a valid workout plan to copy.");
    }

    // After successful copy, check if we need to make the new gym active.
    const { data: currentProfile, error: currentProfileError } = await supabaseServiceRoleClient.from('profiles').select('active_gym_id').eq('id', user.id).single();
    if (currentProfileError) throw currentProfileError;

    // If no gym is active, OR if the target gym is the active gym, update the active_t_path_id
    if (currentProfile.active_gym_id === null || currentProfile.active_gym_id === targetGymId) {
      await supabaseServiceRoleClient.from('profiles').update({ 
        active_gym_id: targetGymId, // Also set active_gym_id in case it was null
        active_t_path_id: newMainTPathId 
      }).eq('id', user.id);
    }

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);

    return new Response(JSON.stringify({ message: `Successfully copied setup to new gym.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in copy-gym-setup edge function:", message);
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: message }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});