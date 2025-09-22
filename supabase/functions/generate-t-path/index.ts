// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { generateWorkoutPlanForTPath } from '../_shared/workout-generation-utils.ts';

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

    const { tPathId, preferred_session_length } = await req.json();
    if (!tPathId || !preferred_session_length) {
      throw new Error("Missing tPathId or preferred_session_length.");
    }

    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('active_gym_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) throw new Error('User profile not found.');

    const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('settings')
      .eq('id', tPathId)
      .single();
    if (tPathError || !tPathData) throw new Error('T-Path not found.');
    const equipmentMethod = (tPathData.settings as { equipmentMethod?: string })?.equipmentMethod;
    const useStaticDefaults = equipmentMethod === 'skip';

    await generateWorkoutPlanForTPath(
      supabaseServiceRoleClient,
      user.id,
      tPathId,
      preferred_session_length,
      profile.active_gym_id,
      useStaticDefaults
    );

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);

    return new Response(JSON.stringify({ message: 'Workout plan regeneration initiated successfully.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in generate-t-path edge function:", message);
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: message }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});