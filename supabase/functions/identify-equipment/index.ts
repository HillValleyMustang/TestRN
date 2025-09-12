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
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { base64Image, locationTag } = await req.json();

    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'No image provided.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `
      Analyze the gym equipment in this image. Identify ALL distinct pieces of equipment that can be used for exercises.
      For each piece of equipment, suggest a primary exercise.
      Provide the response in a strict JSON array format. Each object in the array should have the following fields:
      {
        "name": "Exercise Name",
        "main_muscle": "Main Muscle Group(s) (comma-separated, e.g., Pectorals, Deltoids)",
        "type": "weight" | "timed" | "body_weight",
        "category": "Bilateral" | "Unilateral" | null,
        "description": "A brief description of the exercise.",
        "pro_tip": "A short, actionable pro tip for performing the exercise.",
        "video_url": "Optional YouTube or instructional video URL (can be empty string if none)"
      }
      
      Ensure 'name', 'main_muscle', and 'type' are always present. If no equipment is identifiable, return an empty array.
      Do not include any other text or markdown outside the JSON array.
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

    if (!generatedText) {
      throw new Error("AI did not return a valid response.");
    }

    let identifiedExercises: any[];
    try {
      identifiedExercises = JSON.parse(generatedText);
      if (!Array.isArray(identifiedExercises)) {
        throw new Error("AI returned a non-array format.");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON array:", generatedText);
      throw new Error("AI returned an invalid format. Please try again.");
    }

    const processedExercises = [];
    for (const exercise of identifiedExercises) {
      if (!exercise.name || !exercise.main_muscle || !exercise.type) {
        console.warn("Skipping AI-identified exercise due to missing essential details:", exercise);
        continue; // Skip exercises with missing essential details
      }

      // --- DUPLICATE CHECK & HANDLING ---
      const { data: existingExercises, error: duplicateCheckError } = await supabaseClient
        .from('exercise_definitions')
        .select('id, user_id, library_id, location_tags')
        .ilike('name', exercise.name.trim())
        .or(`user_id.eq.${user.id},user_id.is.null`);

      if (duplicateCheckError) throw duplicateCheckError;

      let finalExerciseId: string | null = null;
      let isDuplicate = false;
      let existingLocationTags: string[] = [];

      if (existingExercises && existingExercises.length > 0) {
        // Prioritize user-owned exercise if both exist
        const userOwnedMatch = existingExercises.find((ex: { user_id: string | null }) => ex.user_id === user.id);
        const existingMatch = userOwnedMatch || existingExercises[0];
        
        finalExerciseId = existingMatch.id;
        isDuplicate = true;
        existingLocationTags = existingMatch.location_tags || [];

        // If it's a user-owned exercise and a locationTag was provided, update its tags.
        if (existingMatch.user_id === user.id && locationTag && !existingLocationTags.includes(locationTag)) {
          const newTags = [...existingLocationTags, locationTag];
          const { error: updateError } = await supabaseClient
            .from('exercise_definitions')
            .update({ location_tags: newTags })
            .eq('id', existingMatch.id);
          if (updateError) throw updateError;
          existingLocationTags = newTags; // Update for the response
        }
      } else {
        // It's a new exercise, so we insert it as a user-owned exercise.
        const { data: newExercise, error: insertError } = await supabaseClient
          .from('exercise_definitions')
          .insert({
            name: exercise.name,
            main_muscle: exercise.main_muscle,
            type: exercise.type,
            category: exercise.category,
            description: exercise.description,
            pro_tip: exercise.pro_tip,
            video_url: exercise.video_url,
            user_id: user.id,
            library_id: null, // User-created, not from global library
            location_tags: locationTag ? [locationTag] : [],
            icon_url: 'https://i.imgur.com/2Y4Y4Y4.png', // Default icon
          })
          .select('id, location_tags')
          .single();
        
        if (insertError) throw insertError;
        finalExerciseId = newExercise.id;
        existingLocationTags = newExercise.location_tags || [];
      }

      processedExercises.push({
        ...exercise, // Include all AI-identified details
        id: finalExerciseId,
        isDuplicate: isDuplicate,
        location_tags: existingLocationTags, // Return the updated tags
      });
    }

    return new Response(JSON.stringify({ identifiedExercises: processedExercises }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error('Error in /identify-equipment edge function:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});