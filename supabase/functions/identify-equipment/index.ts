// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface ExistingExercise {
  id: string; name: string; user_id: string | null; main_muscle: string; type: string;
  category: string | null; description: string | null; pro_tip: string | null;
  video_url: string | null; library_id: string | null; is_favorite: boolean | null;
  icon_url: string | null; movement_type: string | null; movement_pattern: string | null;
}

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
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');

    const { base64Images } = await req.json();
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      throw new Error('No images provided.');
    }

    const { data: allDbExercises, error: fetchAllError } = await supabase.from('exercise_definitions').select('*');
    if (fetchAllError) throw fetchAllError;

    const prompt = `
      You are an expert fitness coach. Analyze the gym equipment in the following image(s).
      Your task is to identify all possible exercises and provide their details.
      
      IMPORTANT INSTRUCTIONS:
      1. Identify all pieces of equipment shown across all images.
      2. For each piece of equipment, provide a comprehensive list of possible exercises, including common variations (e.g., incline, decline, single-arm, wide grip, narrow grip). Be creative and thorough.
      3. Aim to provide between 5 to 15 exercises in total, depending on the equipment identified. The goal is a thorough list, not just the top 3-4 most common ones.
      4. Consolidate all exercises into a single list, removing duplicates.
      5. Your entire response MUST be a single, clean JSON object with a key "exercises" which contains an array of exercise objects. Do not include any other text, markdown, or explanations outside the JSON object.
      6. Each object in the array MUST have the following structure:
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

    const messages = [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...base64Images.map(img => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }))
      ]
    }];

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4o", messages: messages, response_format: { type: "json_object" } }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorBody}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices?.[0]?.message?.content;
    if (!generatedText) return new Response(JSON.stringify({ identifiedExercises: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const exercisesFromAI = JSON.parse(generatedText).exercises || [];
    const finalResults: any[] = [];
    const seenNormalizedNames = new Set<string>();

    for (const aiExercise of exercisesFromAI) {
      if (!aiExercise || typeof aiExercise.name !== 'string' || aiExercise.name.trim() === '' || typeof aiExercise.main_muscle !== 'string' || !VALID_MUSCLE_GROUPS.includes(aiExercise.main_muscle)) continue;

      const normalizedAiName = normalizeName(aiExercise.name);
      if (seenNormalizedNames.has(normalizedAiName)) continue;

      let duplicate_status: 'none' | 'global' | 'my-exercises' = 'none';
      let foundExercise: ExistingExercise | null = null;

      const userMatch = (allDbExercises || []).find((dbEx: ExistingExercise) => dbEx.user_id === user.id && normalizeName(dbEx.name) === normalizedAiName);
      if (userMatch) {
        duplicate_status = 'my-exercises';
        foundExercise = userMatch;
      } else {
        const globalMatch = (allDbExercises || []).find((dbEx: ExistingExercise) => dbEx.user_id === null && normalizeName(dbEx.name) === normalizedAiName);
        if (globalMatch) {
          duplicate_status = 'global';
          foundExercise = globalMatch;
        }
      }

      if (foundExercise) {
        finalResults.push({ ...foundExercise, duplicate_status, existing_id: foundExercise.id });
      } else {
        finalResults.push({ ...aiExercise, video_url: getYouTubeEmbedUrl(aiExercise.video_url), duplicate_status: 'none', existing_id: null });
      }
      seenNormalizedNames.add(normalizedAiName);
    }

    return new Response(JSON.stringify({ identifiedExercises: finalResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in identify-equipment edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});