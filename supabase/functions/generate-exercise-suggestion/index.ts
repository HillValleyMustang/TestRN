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
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// @ts-ignore
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

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
    console.log("[getYouTubeEmbedUrl] Input URL is null or undefined.");
    return null;
  }
  console.log(`[getYouTubeEmbedUrl] Processing URL: ${url}`);
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  if (match && match[1]) {
    const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
    console.log(`[getYouTubeEmbedUrl] Extracted video ID: ${match[1]}, Embed URL: ${embedUrl}`);
    return embedUrl;
  }
  console.log(`[getYouTubeEmbedUrl] No YouTube video ID found in URL: ${url}`);
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

    // Authenticate the user using the JWT from the client's Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } );
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { main_muscle, type, category, saveScope = 'global' } = await req.json(); // Default to 'global'

    if (!main_muscle || !type) {
      return new Response(JSON.stringify({ error: 'Missing main_muscle or type parameters.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `
      You are an expert fitness coach. Generate a single, unique exercise suggestion based on the following criteria.
      The exercise should be suitable for a general gym setting.
      
      Criteria:
      - Main Muscle: ${main_muscle}
      - Type: ${type}
      ${category ? `- Category: ${category}` : ''}

      Provide the response in a strict JSON format with the following fields:
      {
        "name": "Exercise Name",
        "main_muscle": "Main Muscle Group (e.g., Pectorals, Quadriceps)",
        "type": "weight" | "timed",
        "category": "Bilateral" | "Unilateral" | null,
        "movement_type": "compound" | "isolation",
        "movement_pattern": "Push" | "Pull" | "Legs" | "Core",
        "description": "A brief description of the exercise.",
        "pro_tip": "A short, actionable pro tip for performing the exercise.",
        "video_url": "Optional YouTube or instructional video URL (can be empty string if none)"
      }
      
      Ensure the 'name' is unique and descriptive. Do not include any other text or markdown outside the JSON.
    `;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates[0].content.parts[0].text;

    let newExerciseData;
    try {
      // More robust JSON parsing: find the JSON object within the response text
      const jsonMatch = generatedText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in AI response.");
      }
      const jsonString = jsonMatch[0];
      newExerciseData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", generatedText);
      throw new Error("AI generated an invalid response format.");
    }

    // --- Start Validation ---
    if (!newExerciseData || !newExerciseData.name || newExerciseData.name.trim() === '') {
        console.error("AI generated an exercise without a name. Discarding.", newExerciseData);
        return new Response(JSON.stringify({ error: "AI failed to generate a valid exercise with a name. Please try again." }), {
            status: 200, // Return 200 OK with an error message in the body
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    // --- End Validation ---

    // --- Start Duplicate Check (after parsing Gemini response) ---
    const { data: allExistingExercises, error: fetchAllExistingError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('name, user_id');

    if (fetchAllExistingError) {
      console.error("Error fetching all existing exercises for duplicate check:", fetchAllExistingError.message);
      throw fetchAllExistingError;
    }

    const typedExistingExercises: ExistingExercise[] = allExistingExercises || [];
    const normalizedAiName = normalizeName(newExerciseData.name);

    const isDuplicate = typedExistingExercises.some(existingEx => {
      const normalizedExistingName = normalizeName(existingEx.name);
      // Check for global duplicate OR user-specific duplicate
      return normalizedExistingName === normalizedAiName && (existingEx.user_id === null || existingEx.user_id === user.id);
    });

    if (isDuplicate) {
      return new Response(JSON.stringify({ error: `AI suggested an exercise similar to one that already exists: "${newExerciseData.name}". Please try generating another.` }), {
        status: 200, // Return 200 OK with an error message in the body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- End Duplicate Check ---

    // Generate a unique library_id for this AI-generated exercise
    const newLibraryId = `ai_gen_${uuidv4()}`;

    // Insert the new exercise into the public.exercise_definitions table as a global exercise
    const { data: insertedExercise, error: insertError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .insert({
        name: newExerciseData.name,
        main_muscle: newExerciseData.main_muscle,
        type: newExerciseData.type,
        category: newExerciseData.category,
        movement_type: newExerciseData.movement_type,
        movement_pattern: newExerciseData.movement_pattern,
        description: newExerciseData.description,
        pro_tip: newExerciseData.pro_tip,
        video_url: newExerciseData.video_url,
        user_id: saveScope === 'user' ? user.id : null, // Use user.id if scope is 'user'
        library_id: saveScope === 'user' ? null : newLibraryId, // Only set library_id for global
      })
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, movement_type, movement_pattern') // Specify columns
      .single();

    if (insertError) {
      console.error("Error inserting AI-generated exercise:", insertError.message);
      throw insertError;
    }

    return new Response(JSON.stringify({ newExercise: insertedExercise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in generate-exercise-suggestion edge function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 200, // Always return 200, even for internal errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});