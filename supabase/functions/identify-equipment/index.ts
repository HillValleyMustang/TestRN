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

// Define an interface for the structure of existing exercise data fetched from Supabase
interface ExistingExercise {
  id: string;
  name: string;
  user_id: string | null;
}

// NEW: List of valid muscle groups
const VALID_MUSCLE_GROUPS = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
  "Abdominals", "Core", "Full Body"
];

// Helper function to normalize exercise names for comparison
const normalizeName = (name: string): string => {
  if (!name) return '';
  let normalized = name.toLowerCase();

  // 1. Normalize spaces (multiple to single, then trim)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // 2. Remove plural 's' from the end of the entire string
  if (normalized.endsWith('s')) {
    normalized = normalized.slice(0, -1);
  }

  // 3. Remove non-alphanumeric characters, but keep spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');

  return normalized;
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } );
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { base64Images } = await req.json();
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch ALL exercises ONCE for efficient lookup.
    const { data: allDbExercises, error: fetchAllError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('*');
    if (fetchAllError) throw fetchAllError;

    // 2. Construct a single, comprehensive prompt for all images.
    const prompt = `
      You are an expert fitness coach. Analyze the gym equipment in the following image(s).
      Your task is to identify all possible exercises and provide their details.

      Instructions:
      1. Identify all pieces of equipment shown across all images.
      2. For each piece of equipment, list the most common and effective exercises.
      3. Consolidate all exercises into a single list, removing duplicates.
      4. Your entire response MUST be a single, clean JSON array of objects. Each object must have the following structure:
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
      5. Do not include any other text, markdown, or explanations outside the JSON array.
    `;

    // Prepare parts for Gemini API call, including the prompt and all images
    const geminiParts = [
      { text: prompt },
      ...base64Images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img } }))
    ];

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: geminiParts }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error(`Gemini API error: ${geminiResponse.status} - ${errorBody}`);
      throw new Error("The AI model failed to process the images.");
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      console.warn("AI did not return a valid response.");
      return new Response(JSON.stringify({ identifiedExercises: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Robustly parse and validate the AI's response.
    let exercisesFromAI: any[];
    try {
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in AI response.");
      }
      const sanitizedJsonString = jsonMatch[0].replace(/,(?=\s*[\]}])/g, '');
      exercisesFromAI = JSON.parse(sanitizedJsonString);
      if (!Array.isArray(exercisesFromAI)) {
        throw new Error("AI response was not a JSON array.");
      }
    } catch (parseError) {
      console.error("AI returned an invalid format:", parseError, "Raw text:", generatedText);
      throw new Error("The AI returned data in an unexpected format. Please try again.");
    }

    // 4. Validate each exercise and check for duplicates.
    const finalResults: any[] = [];
    const seenNormalizedNames = new Set<string>();

    for (const aiExercise of exercisesFromAI) {
      // Basic validation
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
        finalResults.push({
          ...foundExercise,
          duplicate_status: duplicate_status,
          existing_id: foundExercise.id,
        });
      } else {
        finalResults.push({
          ...aiExercise,
          video_url: getYouTubeEmbedUrl(aiExercise.video_url),
          duplicate_status: 'none',
          existing_id: null,
        });
      }
      seenNormalizedNames.add(normalizedAiName);
    }

    return new Response(JSON.stringify({ identifiedExercises: finalResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in identify-equipment edge function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});