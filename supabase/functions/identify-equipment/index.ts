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

    // 1. Fetch ALL exercises ONCE (user-owned and global) for efficient lookup.
    const { data: allDbExercises, error: fetchAllError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('*');
    if (fetchAllError) throw fetchAllError;

    const allIdentifiedExerciseNames = new Set<string>();

    for (const base64Image of base64Images) {
      // 2. SIMPLIFIED PROMPT: Ask only for exercise names.
      const prompt = `
        You are an expert fitness coach. Analyze the gym equipment in this image.
        Your task is to identify exercises that can be performed with it.

        Instructions:
        1. Identify the equipment.
        2. List the most common and effective exercises for that equipment.
        3. Your entire response MUST be a single, clean JSON array of strings, where each string is an exercise name. Do not include any other text, markdown, or explanations.

        Example response:
        ["Bench Press", "Dumbbell Row", "Squat", "Overhead Press"]
      `;

      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
              ]
            }
          ],
        }),
      });

      if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        console.error(`Gemini API error for one image: ${geminiResponse.status} - ${errorBody}`);
        continue;
      }

      const geminiData = await geminiResponse.json();
      const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        console.warn("AI did not return a valid response for one image.");
        continue;
      }

      let exerciseNamesFromAI: string[];
      try {
        const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;
        const sanitizedJsonString = jsonMatch[0].replace(/,(?=\s*[\]}])/g, '');
        exerciseNamesFromAI = JSON.parse(sanitizedJsonString);
        if (!Array.isArray(exerciseNamesFromAI) || !exerciseNamesFromAI.every(item => typeof item === 'string')) {
            console.warn("AI response was not a simple array of strings.", generatedText);
            continue;
        }
      } catch (parseError) {
        console.error("AI returned an invalid format for one image:", parseError, "Raw text:", generatedText);
        continue;
      }
      
      exerciseNamesFromAI.forEach(name => allIdentifiedExerciseNames.add(name));
    }

    if (allIdentifiedExerciseNames.size === 0) {
      return new Response(JSON.stringify({ identifiedExercises: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Match AI names against our database and determine duplicate status.
    const finalResults: any[] = [];
    const seenNormalizedNames = new Set<string>();

    for (const aiName of allIdentifiedExerciseNames) {
      const normalizedAiName = normalizeName(aiName);
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
        seenNormalizedNames.add(normalizedAiName);
      } else {
        // 4. If not found, make a second, focused AI call for details.
        const detailPrompt = `
          You are an expert fitness coach. Provide details for the following exercise.
          Exercise Name: "${aiName}"

          Provide the response in a strict JSON format with the following fields:
          {
            "name": "${aiName}",
            "main_muscle": "Main Muscle Group (MUST be one of: ${VALID_MUSCLE_GROUPS.join(', ')})",
            "type": "weight" | "timed" | "bodyweight",
            "category": "Bilateral" | "Unilateral" | null,
            "movement_type": "compound" | "isolation",
            "movement_pattern": "Push" | "Pull" | "Legs" | "Core",
            "description": "A brief description of the exercise.",
            "pro_tip": "A short, actionable pro tip for performing the exercise.",
            "video_url": "Optional YouTube or instructional video URL (can be empty string if none)"
          }
          
          Do not include any other text or markdown outside the JSON object.
        `;

        const detailResponse = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: detailPrompt }] }] }),
        });

        if (!detailResponse.ok) {
          console.error(`Gemini detail API error for "${aiName}": ${detailResponse.status}`);
          continue;
        }

        const detailData = await detailResponse.json();
        const detailText = detailData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!detailText) continue;

        try {
          const jsonMatch = detailText.match(/{[\s\S]*}/);
          if (!jsonMatch) continue;
          const sanitizedJsonString = jsonMatch[0].replace(/,(?=\s*[\]}])/g, '');
          const newExerciseData = JSON.parse(sanitizedJsonString);

          if (newExerciseData.name && newExerciseData.name.trim() !== '') {
            finalResults.push({
              ...newExerciseData,
              video_url: getYouTubeEmbedUrl(newExerciseData.video_url),
              duplicate_status: 'none',
              existing_id: null,
            });
            seenNormalizedNames.add(normalizedAiName);
          }
        } catch (parseError) {
          console.error(`Failed to parse details for "${aiName}":`, parseError, "Raw text:", detailText);
        }
      }
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