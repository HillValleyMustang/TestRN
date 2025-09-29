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

// Type definitions for clarity
interface ExistingExercise {
  id: string;
  name: string;
  user_id: string | null;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  library_id: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
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
    console.log("[identify-equipment] Function invoked.");
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
    console.log(`[identify-equipment] User authenticated: ${user.id}`);

    const { base64Images } = await req.json();
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      throw new Error('No images provided.');
    }
    console.log(`[identify-equipment] Received ${base64Images.length} image(s) for analysis.`);

    // 1. Fetch ALL exercises ONCE for efficient lookup.
    const { data: allDbExercises, error: fetchAllError } = await supabase
      .from('exercise_definitions')
      .select('*');
    if (fetchAllError) throw fetchAllError;
    console.log(`[identify-equipment] Fetched ${allDbExercises?.length || 0} existing exercises from DB.`);

    // 2. Construct a more robust prompt.
    const prompt = `
      You are an expert fitness coach. Analyze the gym equipment in the following image(s).
      Your task is to identify all possible exercises and provide their details.
      
      IMPORTANT INSTRUCTIONS:
      1. Identify all pieces of equipment shown across all images.
      2. For each piece of equipment, list the most common and effective exercises.
      3. Consolidate all exercises into a single list, removing duplicates.
      4. Your entire response MUST be a single, clean JSON array of objects. Do not include any other text, markdown, or explanations outside the JSON array.
      5. Each object in the array MUST have the following structure:
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
      
      EXAMPLE OF A VALID RESPONSE:
      [
        {
          "name": "Dumbbell Bench Press",
          "main_muscle": "Pectorals",
          "type": "weight",
          "category": "Bilateral",
          "movement_type": "compound",
          "movement_pattern": "Push",
          "description": "A classic chest exercise performed with dumbbells on a flat bench.",
          "pro_tip": "Keep your shoulder blades retracted and down to protect your shoulders.",
          "video_url": "https://www.youtube.com/embed/example123"
        }
      ]
    `;

    // 3. Make the API call to Gemini.
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...base64Images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img } }))] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("[identify-equipment] Gemini API error response:", errorBody);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("[identify-equipment] Raw response from Gemini:", generatedText);

    if (!generatedText) {
      console.log("[identify-equipment] Gemini returned an empty response text.");
      return new Response(JSON.stringify({ identifiedExercises: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Clean and parse the response.
    let exercisesFromAI: any[] = [];
    try {
      // Clean the text: remove markdown backticks and any text outside the main array.
      const cleanedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        exercisesFromAI = JSON.parse(jsonMatch[0]);
        console.log(`[identify-equipment] Successfully parsed ${exercisesFromAI.length} exercises from AI response.`);
      } else {
        throw new Error("No JSON array found in the AI response.");
      }
    } catch (e) {
      console.error("[identify-equipment] Failed to parse Gemini response as JSON:", e);
      throw new Error("AI generated an invalid response format. Please try again.");
    }

    // 5. Final processing and duplicate check.
    const finalResults: any[] = [];
    const seenNormalizedNames = new Set<string>();

    for (const aiExercise of exercisesFromAI) {
      if (!aiExercise || typeof aiExercise.name !== 'string' || aiExercise.name.trim() === '' || typeof aiExercise.main_muscle !== 'string' || !VALID_MUSCLE_GROUPS.includes(aiExercise.main_muscle)) {
        console.warn("[identify-equipment] Skipping invalid exercise object from AI:", aiExercise);
        continue;
      }

      const normalizedAiName = normalizeName(aiExercise.name);
      if (seenNormalizedNames.has(normalizedAiName)) {
        console.log(`[identify-equipment] Skipping duplicate AI suggestion: "${aiExercise.name}"`);
        continue;
      }

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
        console.log(`[identify-equipment] AI suggestion "${aiExercise.name}" matched existing exercise ID ${foundExercise.id} with status: ${duplicate_status}`);
        finalResults.push({ ...foundExercise, duplicate_status, existing_id: foundExercise.id });
      } else {
        console.log(`[identify-equipment] AI suggestion "${aiExercise.name}" is a new exercise.`);
        finalResults.push({ ...aiExercise, video_url: getYouTubeEmbedUrl(aiExercise.video_url), duplicate_status: 'none', existing_id: null });
      }
      seenNormalizedNames.add(normalizedAiName);
    }

    console.log(`[identify-equipment] Final processing complete. Returning ${finalResults.length} exercises.`);
    return new Response(JSON.stringify({ identifiedExercises: finalResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in identify-equipment edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});