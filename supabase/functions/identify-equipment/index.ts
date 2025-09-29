// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// @ts-ignore
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

interface ExistingExercise {
  id: string; name: string; user_id: string | null;
}

const VALID_MUSCLE_GROUPS = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
  "Abdominals", "Core", "Full Body"
];

const normalizeName = (name: string): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, ' ').trim().replace(/s$/, '').replace(/[^a-z0-9\s]/g, '');
};

const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/);
  return (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}` : null;
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

    // 1. Fetch ALL exercises ONCE for efficient lookup.
    const { data: allDbExercises, error: fetchAllError } = await supabase
      .from('exercise_definitions')
      .select('*');
    if (fetchAllError) throw fetchAllError;

    let exercisesFromAI: any[] = [];
    let primaryAttemptSuccess = false;

    // --- PRIMARY ATTEMPT: Get full details in one shot ---
    const primaryPrompt = `You are an expert fitness coach. Analyze the gym equipment in the following image(s). Your task is to identify all possible exercises and provide their details. Instructions: 1. Identify all pieces of equipment shown across all images. 2. For each piece of equipment, list the most common and effective exercises. 3. Consolidate all exercises into a single list, removing duplicates. 4. Your entire response MUST be a single, clean JSON array of objects. Each object must have the following structure: { "name": "Exercise Name", "main_muscle": "Main Muscle Group (MUST be one of: ${VALID_MUSCLE_GROUPS.join(', ')})", "type": "weight" | "timed" | "bodyweight", "category": "Bilateral" | "Unilateral" | null, "movement_type": "compound" | "isolation", "movement_pattern": "Push" | "Pull" | "Legs" | "Core", "description": "A brief description of the exercise.", "pro_tip": "A short, actionable pro tip for performing the exercise.", "video_url": "Optional YouTube or instructional video URL (can be empty string if none)" } 5. Do not include any other text, markdown, or explanations outside the JSON array.`;
    const primaryGeminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: primaryPrompt }, ...base64Images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img } }))] }] }),
    });

    if (primaryGeminiResponse.ok) {
      const geminiData = await primaryGeminiResponse.json();
      const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        try {
          const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsedJson)) {
              exercisesFromAI = parsedJson;
              primaryAttemptSuccess = true;
            }
          }
        } catch (e) {
          console.warn("Primary AI attempt failed to parse. Falling back.", e);
        }
      }
    }

    // --- SECONDARY ATTEMPT (FALLBACK) ---
    if (!primaryAttemptSuccess) {
      console.log("Executing fallback: Fetching names first, then details.");
      const allIdentifiedExerciseNames = new Set<string>();
      for (const base64Image of base64Images) {
        const namePrompt = `You are an expert fitness coach. Analyze the gym equipment in this image. Your task is to identify exercises that can be performed with it. Instructions: 1. Identify the equipment. 2. List the most common and effective exercises for that equipment. 3. Your entire response MUST be a single, clean JSON array of strings, where each string is an exercise name. Do not include any other text, markdown, or explanations. Example response: ["Bench Press", "Dumbbell Row", "Squat", "Overhead Press"]`;
        const nameResponse = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: namePrompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }] }),
        });
        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          const nameText = nameData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (nameText) {
            try {
              const jsonMatch = nameText.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const names = JSON.parse(jsonMatch[0]);
                if (Array.isArray(names)) names.forEach(name => allIdentifiedExerciseNames.add(name));
              }
            } catch (e) { console.warn("Could not parse names from one image.", e); }
          }
        }
      }

      const detailedExercises = [];
      for (const aiName of allIdentifiedExerciseNames) {
        const normalizedAiName = normalizeName(aiName);
        const existingExercise = (allDbExercises || []).find((dbEx: ExistingExercise) => normalizeName(dbEx.name) === normalizedAiName && (dbEx.user_id === user.id || dbEx.user_id === null));
        if (existingExercise) continue;

        const detailPrompt = `You are an expert fitness coach. Provide details for the following exercise. Exercise Name: "${aiName}" Provide the response in a strict JSON format with the following fields: { "name": "${aiName}", "main_muscle": "Main Muscle Group (MUST be one of: ${VALID_MUSCLE_GROUPS.join(', ')})", "type": "weight" | "timed" | "bodyweight", "category": "Bilateral" | "Unilateral" | null, "movement_type": "compound" | "isolation", "movement_pattern": "Push" | "Pull" | "Legs" | "Core", "description": "A brief description of the exercise.", "pro_tip": "A short, actionable pro tip for performing the exercise.", "video_url": "Optional YouTube or instructional video URL (can be empty string if none)" } Do not include any other text or markdown outside the JSON object.`;
        const detailResponse = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: detailPrompt }] }] }),
        });
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          const detailText = detailData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (detailText) {
            try {
              const jsonMatch = detailText.match(/{[\s\S]*}/);
              if (jsonMatch) detailedExercises.push(JSON.parse(jsonMatch[0]));
            } catch (e) { console.error(`Failed to parse details for "${aiName}":`, e); }
          }
        }
      }
      exercisesFromAI = detailedExercises;
    }

    // --- FINAL PROCESSING (common for both attempts) ---
    const finalResults: any[] = [];
    const seenNormalizedNames = new Set<string>();

    for (const aiExercise of exercisesFromAI) {
      if (!aiExercise || typeof aiExercise.name !== 'string' || aiExercise.name.trim() === '' || typeof aiExercise.main_muscle !== 'string' || !VALID_MUSCLE_GROUPS.includes(aiExercise.main_muscle)) {
        console.warn("Skipping invalid exercise object from AI:", aiExercise);
        continue;
      }

      const normalizedAiName = normalizeName(aiExercise.name);
      if (seenNormalizedNames.has(normalizedAiName)) continue;

      let duplicate_status: 'none' | 'global' | 'my-exercises' = 'none';
      let foundExercise: any | null = null;

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