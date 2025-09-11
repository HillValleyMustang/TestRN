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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
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
      Analyze the gym equipment in this image. Identify a single, primary exercise that can be performed with it.
      Provide its name, primary muscle group(s) (comma-separated),
      its type ('weight', 'timed', or 'body_weight'), its category ('Bilateral', 'Unilateral', or null),
      a brief description, a practical pro tip, and a relevant YouTube embed URL.

      IMPORTANT: Respond ONLY with a JSON object. Do NOT include any other text or markdown.
      Example:
      {
        "name": "Exercise Name",
        "main_muscle": "Main Muscle Group(s)",
        "type": "weight",
        "category": "Bilateral",
        "description": "A brief description.",
        "pro_tip": "A short, actionable pro tip.",
        "video_url": "https://www.youtube.com/embed/..."
      }
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

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    let jsonString = jsonMatch ? jsonMatch[0] : generatedText;

    let identifiedExercise;
    try {
      identifiedExercise = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error("AI returned an invalid format. Please try again.");
    }

    if (!identifiedExercise.name || !identifiedExercise.main_muscle || !identifiedExercise.type) {
      throw new Error("AI could not extract essential exercise details.");
    }

    // --- DUPLICATE CHECK & HANDLING (REVISED LOGIC) ---
    // Check for an existing exercise (user-owned OR global) with the same name.
    const { data: existingExercises, error: duplicateCheckError } = await supabaseClient
      .from('exercise_definitions')
      .select('id, user_id, location_tags')
      .ilike('name', identifiedExercise.name.trim())
      .or(`user_id.eq.${user.id},user_id.is.null`);

    if (duplicateCheckError) throw duplicateCheckError;

    let finalExercise = { ...identifiedExercise, id: null, isDuplicate: false };

    if (existingExercises && existingExercises.length > 0) {
      // Prioritize user-owned exercise if both exist
      const userOwnedMatch = existingExercises.find((ex: { user_id: string | null }) => ex.user_id === user.id);
      const existingMatch = userOwnedMatch || existingExercises[0];
      
      finalExercise = { ...finalExercise, id: existingMatch.id, isDuplicate: true };

      // If it's a user-owned exercise and a locationTag was provided, update its tags.
      if (existingMatch.user_id === user.id && locationTag) {
        const currentTags = existingMatch.location_tags || [];
        if (!currentTags.includes(locationTag)) {
          const newTags = [...currentTags, locationTag];
          const { error: updateError } = await supabaseClient
            .from('exercise_definitions')
            .update({ location_tags: newTags })
            .eq('id', existingMatch.id);
          if (updateError) throw updateError;
        }
      }
    } else {
      // It's a new exercise, so we insert it as a user-owned exercise.
      const { data: newExercise, error: insertError } = await supabaseClient
        .from('exercise_definitions')
        .insert({
          name: identifiedExercise.name,
          main_muscle: identifiedExercise.main_muscle,
          type: identifiedExercise.type,
          category: identifiedExercise.category,
          description: identifiedExercise.description,
          pro_tip: identifiedExercise.pro_tip,
          video_url: identifiedExercise.video_url,
          user_id: user.id,
          location_tags: locationTag ? [locationTag] : [],
        })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      finalExercise.id = newExercise.id;
    }

    return new Response(JSON.stringify({ identifiedExercise: finalExercise, isDuplicate: finalExercise.isDuplicate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});