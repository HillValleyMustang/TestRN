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

    const { base64Image } = await req.json();

    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'No image provided.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `
      Analyze the gym equipment in this image. Identify the specific equipment.
      Provide its name, primary muscle group(s) (comma-separated if multiple, e.g., "Pectorals, Deltoids"),
      its type ('weight' or 'timed'), its category ('Bilateral', 'Unilateral', or null if not applicable),
      a brief description of how to use it, a practical pro tip for performing the exercise,
      and a relevant YouTube video URL (can be an empty string if none found).

      IMPORTANT: Respond ONLY with a JSON object. Do NOT include any other text, markdown formatting (like \`\`\`json), or conversational phrases. The response must be a pure JSON string.
      Example:
      {
        "name": "Exercise Name",
        "main_muscle": "Main Muscle Group(s)",
        "type": "weight" | "timed",
        "category": "Bilateral" | "Unilateral" | null,
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
              { inlineData: { mimeType: 'image/jpeg', data: base64Image } } // Assuming JPEG, adjust if needed
            ]
          }
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error response:", errorBody);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("AI did not return a valid response.");
    }

    // Use a regex to extract the JSON object from the generated text
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    let jsonString = jsonMatch ? jsonMatch[0] : generatedText; // Fallback to full text if no match

    let identifiedExercise;
    try {
      identifiedExercise = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", jsonString);
      throw new Error("AI returned an invalid format. Please try again or use manual entry.");
    }

    // Validate essential fields
    if (!identifiedExercise.name || !identifiedExercise.main_muscle || !identifiedExercise.type) {
      throw new Error("AI could not extract essential exercise details. Please try a different photo or use manual entry.");
    }

    // Return the identified exercise data to the client
    return new Response(JSON.stringify({ identifiedExercise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in identify-equipment edge function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});