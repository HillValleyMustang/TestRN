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
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

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

    const { main_muscle, type, category } = await req.json();

    if (!main_muscle || !type) {
      return new Response(JSON.stringify({ error: 'Missing main_muscle or type parameters.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        "type": "weight" | "timed" | "body_weight",
        "category": "Bilateral" | "Unilateral" | null,
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
      newExerciseData = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", generatedText);
      throw new Error("AI generated an invalid response format.");
    }

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
        description: newExerciseData.description,
        pro_tip: newExerciseData.pro_tip,
        video_url: newExerciseData.video_url,
        user_id: null, // Mark as a global exercise
        library_id: newLibraryId, // Assign the unique AI-generated library ID
      })
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id') // Specify columns
      .single();

    if (insertError) {
      console.error("Error inserting AI-generated exercise:", insertError.message);
      throw insertError;
    }

    return new Response(JSON.stringify({ newExercise: insertedExercise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});