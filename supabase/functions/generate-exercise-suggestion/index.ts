// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface ExistingExercise { id: string; name: string; user_id: string | null; }

const VALID_MUSCLE_GROUPS = [ "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", "Abdominals", "Core", "Full Body" ];
const normalizeName = (name: string): string => name ? name.toLowerCase().replace(/\s+/g, ' ').trim().replace(/s$/, '').replace(/[^a-z0-9\s]/g, '') : '';
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/);
  return (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}` : url;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');

    const { main_muscle, type, category, saveScope = 'global' } = await req.json();
    if (!main_muscle || !type) throw new Error('Missing main_muscle or type parameters.');

    const prompt = `
      You are an expert fitness coach. Generate a single, unique exercise suggestion based on the following criteria.
      The exercise should be suitable for a general gym setting.
      
      Criteria:
      - Main Muscle: ${main_muscle}
      - Type: ${type}
      ${category ? `- Category: ${category}` : ''}

      Your entire response MUST be a single, clean JSON object with the exact following structure. Do not include any other text or markdown.
      {
        "name": "Exercise Name",
        "main_muscle": "Main Muscle Group (MUST be one of: ${VALID_MUSCLE_GROUPS.join(', ')})",
        "type": "weight" | "timed" | "bodyweight",
        "category": "Bilateral" | "Unilateral" | null,
        "movement_type": "compound" | "isolation",
        "movement_pattern": "Push" | "Pull" | "Legs" | "Core",
        "description": "A brief description of the exercise.",
        "pro_tip": "A short, actionable pro tip for performing the exercise.",
        "video_url": "Optional YouTube or instructional video URL (can be empty string if none)"
      }
    `;

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorBody}`);
    }

    const openaiData = await openaiResponse.json();
    const newExerciseData = JSON.parse(openaiData.choices[0].message.content);

    if (!newExerciseData || !newExerciseData.name || newExerciseData.name.trim() === '') {
      throw new Error("AI failed to generate a valid exercise with a name.");
    }

    const { data: allExistingExercises, error: fetchAllError } = await supabaseServiceRoleClient.from('exercise_definitions').select('name, user_id');
    if (fetchAllError) throw fetchAllError;

    const normalizedAiName = normalizeName(newExerciseData.name);
    const isDuplicate = (allExistingExercises || []).some((ex: ExistingExercise) => normalizeName(ex.name) === normalizedAiName && (ex.user_id === null || ex.user_id === user.id));

    if (isDuplicate) {
      throw new Error(`AI suggested an exercise similar to one that already exists: "${newExerciseData.name}". Please try generating another.`);
    }

    const newLibraryId = `ai_gen_${uuidv4()}`;
    const { data: insertedExercise, error: insertError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .insert({
        ...newExerciseData,
        video_url: getYouTubeEmbedUrl(newExerciseData.video_url),
        user_id: saveScope === 'user' ? user.id : null,
        library_id: saveScope === 'user' ? null : newLibraryId,
      })
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, movement_type, movement_pattern')
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ newExercise: insertedExercise }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in generate-exercise-suggestion edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});