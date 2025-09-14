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
  name: string;
  user_id: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the service role client for all database operations within the function
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate the user using the JWT from the client's Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { base64Image } = await req.json();
    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'No image provided.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `
      You are an expert fitness coach. Analyze the gym equipment in this image.
      Your task is to suggest exercises that can be performed with it.

      Instructions:
      1. If the equipment is versatile and can be used for many exercises (e.g., dumbbells, cable machine, squat rack), suggest the top 5-7 most common and effective exercises.
      2. If the equipment is simple and designed for only one or two primary movements (e.g., leg extension machine, pec deck, pull-up bar), suggest only those 1-2 primary exercises.
      3. For each exercise, provide its name, primary muscle group(s) (comma-separated), type ('weight' or 'timed'), category ('Bilateral', 'Unilateral', or null), a brief description, a pro tip, and an optional YouTube embed URL.
      4. IMPORTANT: Your entire response MUST be a single JSON array of objects, with no other text or markdown formatting.

      Example response for versatile equipment:
      [
        { "name": "Bench Press", "main_muscle": "Pectorals", "type": "weight", "category": "Bilateral", "description": "...", "pro_tip": "...", "video_url": "..." },
        { "name": "Dumbbell Row", "main_muscle": "Back, Biceps", "type": "weight", "category": "Unilateral", "description": "...", "pro_tip": "...", "video_url": "..." }
      ]

      Example response for simple equipment:
      [
        { "name": "Leg Extension", "main_muscle": "Quadriceps", "type": "weight", "category": "Bilateral", "description": "...", "pro_tip": "...", "video_url": "..." }
      ]
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
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error("AI did not return a valid response.");

    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    let jsonString = jsonMatch ? jsonMatch[0] : generatedText;

    let identifiedExercises;
    try {
      identifiedExercises = JSON.parse(jsonString);
      if (!Array.isArray(identifiedExercises)) {
        identifiedExercises = [identifiedExercises]; // Wrap single object in an array
      }
    } catch (parseError) {
      throw new Error("AI returned an invalid format. Please try again.");
    }

    if (identifiedExercises.length === 0) {
      return new Response(JSON.stringify({ identifiedExercises: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- DUPLICATE CHECK ---
    const exerciseNames = identifiedExercises.map((ex: any) => ex.name.trim());
    
    const { data: existingExercises, error: duplicateCheckError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('name, user_id')
      .in('name', exerciseNames);

    if (duplicateCheckError) {
      console.error("Error checking for duplicate exercises:", duplicateCheckError.message);
      throw duplicateCheckError;
    }

    const typedExistingExercises: ExistingExercise[] = existingExercises || [];

    const existingGlobalNames = new Set(typedExistingExercises.filter((ex: ExistingExercise) => ex.user_id === null).map((ex: ExistingExercise) => ex.name));
    const existingUserNames = new Set(typedExistingExercises.filter((ex: ExistingExercise) => ex.user_id === user.id).map((ex: ExistingExercise) => ex.name));

    const exercisesWithDuplicateStatus = identifiedExercises.map((ex: any) => {
      const trimmedName = ex.name.trim();
      let duplicate_status: 'none' | 'global' | 'my-exercises' = 'none';
      if (existingUserNames.has(trimmedName)) {
        duplicate_status = 'my-exercises';
      } else if (existingGlobalNames.has(trimmedName)) {
        duplicate_status = 'global';
      }
      return {
        ...ex,
        duplicate_status: duplicate_status,
      };
    });

    return new Response(JSON.stringify({ identifiedExercises: exercisesWithDuplicateStatus }), {
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