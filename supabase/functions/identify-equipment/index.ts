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
  id: string; // Added ID for potential future use or more complex matching
  name: string;
  user_id: string | null;
  library_id: string | null; // Added library_id for more robust matching
}

// Helper function to normalize exercise names for comparison
const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/cable /g, '') // Remove common prefixes
    .replace(/dumbbell /g, '')
    .replace(/machine /g, '')
    .replace(/smith machine /g, '')
    .replace(/barbell /g, '')
    .replace(/seated /g, '')
    .replace(/standing /g, '')
    .replace(/incline /g, '')
    .replace(/flat /g, '')
    .replace(/press /g, '') // Remove common suffixes/words
    .replace(/row /g, '')
    .replace(/curl /g, '')
    .replace(/raise /g, '')
    .replace(/fly /g, '')
    .replace(/pushdown /g, '')
    .replace(/extension /g, '')
    .replace(/lunge /g, '')
    .replace(/kickback /g, '')
    .replace(/crunch /g, '')
    .replace(/plank /g, '')
    .replace(/pull /g, '')
    .replace(/dip /g, '')
    .replace(/squat /g, '')
    .replace(/deadlift /g, '')
    .replace(/twist /g, '')
    .replace(/bridge /g, '')
    .replace(/jump /g, '')
    .replace(/burpee /g, '')
    .replace(/swing /g, '')
    .replace(/raise /g, '')
    .replace(/extension /g, '')
    .replace(/sit /g, '')
    .replace(/leg /g, '')
    .replace(/body /g, '')
    .replace(/upper /g, '')
    .replace(/lower /g, '')
    .replace(/push /g, '')
    .replace(/pull /g, '')
    .replace(/legs /g, '')
    .replace(/abs /g, '')
    .replace(/core /g, '')
    .replace(/glutes /g, '')
    .replace(/quads /g, '')
    .replace(/hamstrings /g, '')
    .replace(/calves /g, '')
    .replace(/pectorals /g, '')
    .replace(/deltoids /g, '')
    .replace(/lats /g, '')
    .replace(/traps /g, '')
    .replace(/biceps /g, '')
    .replace(/triceps /g, '')
    .replace(/forearms /g, '')
    .replace(/inner thighs /g, '')
    .replace(/outer glutes /g, '')
    .replace(/rear delts /g, '')
    .replace(/full body /g, '')
    .replace(/ /g, '') // Remove remaining spaces
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
};

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

    // --- DUPLICATE CHECK & URL CONVERSION ---
    // Fetch all existing exercises (global and user-owned) for robust duplicate checking
    const { data: allExistingExercises, error: fetchAllExistingError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('id, name, user_id, library_id');

    if (fetchAllExistingError) {
      console.error("Error fetching all existing exercises for duplicate check:", fetchAllExistingError.message);
      throw fetchAllExistingError;
    }

    const normalizedGlobalNames = new Map<string, ExistingExercise>();
    const normalizedUserNames = new Map<string, ExistingExercise>();

    (allExistingExercises || []).forEach((ex: ExistingExercise) => {
      const normalized = normalizeName(ex.name);
      if (ex.user_id === null) {
        normalizedGlobalNames.set(normalized, ex);
      } else if (ex.user_id === user.id) {
        normalizedUserNames.set(normalized, ex);
      }
    });

    const exercisesWithProcessedStatus = identifiedExercises.map((ex: any) => {
      const normalizedAiName = normalizeName(ex.name);
      let duplicate_status: 'none' | 'global' | 'my-exercises' = 'none';

      // Check user's custom exercises first
      if (normalizedUserNames.has(normalizedAiName)) {
        duplicate_status = 'my-exercises';
      } else if (normalizedGlobalNames.has(normalizedAiName)) {
        // If not in user's, check global library
        duplicate_status = 'global';
      }

      // Convert YouTube URL to embed format
      const embedVideoUrl = getYouTubeEmbedUrl(ex.video_url);

      return {
        ...ex,
        video_url: embedVideoUrl, // Update to embed URL
        duplicate_status: duplicate_status,
      };
    });

    return new Response(JSON.stringify({ identifiedExercises: exercisesWithProcessedStatus }), {
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