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

  // 1. Remove common *redundant* equipment words.
  // Keep descriptive words like 'incline', 'decline', 'seated', 'standing', 'single arm', 'single leg', 'unilateral', 'bilateral'.
  const equipmentWordsToRemove = [
    'cable', 'dumbbell', 'barbell', 'smith machine', 'machine', 'assisted'
  ];

  equipmentWordsToRemove.forEach(word => {
    // Match as a whole word, optionally followed by space/hyphen
    normalized = normalized.replace(new RegExp(`\\b${word}\\b[\\s-]*`, 'g'), ' ');
  });

  // 2. Normalize spaces (multiple to single, then trim)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // 3. Remove plural 's' from the end of the entire string
  if (normalized.endsWith('s')) {
    normalized = normalized.slice(0, -1);
  }

  // 4. Remove all remaining non-alphanumeric characters and spaces
  normalized = normalized.replace(/[^a-z0-9]/g, '');

  return normalized;
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    console.log("[getYouTubeEmbedUrl] Input URL is null or undefined.");
    return null;
  }
  console.log(`[getYouTubeEmbedUrl] Processing URL: ${url}`);
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
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
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } );
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { base64Images } = await req.json(); // Expect an array of base64 images
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const allIdentifiedExercises: any[] = [];

    for (const base64Image of base64Images) {
      const prompt = `
        You are an expert fitness coach. Analyze the gym equipment in this image.
        Your task is to suggest exercises that can be performed with it.

        Instructions:
        1. If the equipment is versatile and can be used for many exercises (e.g., dumbbells, cable machine, squat rack), suggest the top 5-7 most common and effective exercises.
        2. If the equipment is simple and designed for only one or two primary movements (e.g., leg extension machine, pec deck, pull-up bar), suggest only those 1-2 primary exercises.
        3. For each exercise, provide its name, primary muscle group(s) (comma-separated), type ('weight' or 'timed'), category ('Bilateral', 'Unilateral', or null), a brief description, a pro tip, and an an optional YouTube embed URL.
        4. IMPORTANT: For the "main_muscle" field, you MUST only use values from this exact list: ${VALID_MUSCLE_GROUPS.join(', ')}. If an exercise works multiple muscles, select the most primary one from the list.
        5. IMPORTANT: Your entire response MUST be a single JSON array of objects, with no other text or markdown formatting.

        Example response for versatile equipment:
        [
          { "name": "Bench Press", "main_muscle": "Pectorals", "type": "weight", "category": "Bilateral", "description": "...", "pro_tip": "...", "video_url": "..." },
          { "name": "Dumbbell Row", "main_muscle": "Lats", "type": "weight", "category": "Unilateral", "description": "...", "pro_tip": "...", "video_url": "..." }
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
        console.error(`Gemini API error for one image: ${geminiResponse.status} - ${errorBody}`);
        // Continue processing other images, but log the error
        continue; 
      }

      const geminiData = await geminiResponse.json();
      const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        console.warn("AI did not return a valid response for one image.");
        continue;
      }

      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      let jsonString = jsonMatch ? jsonMatch[0] : generatedText;

      let identifiedExercisesForImage;
      try {
        identifiedExercisesForImage = JSON.parse(jsonString);
        if (!Array.isArray(identifiedExercisesForImage)) {
          identifiedExercisesForImage = [identifiedExercisesForImage]; // Wrap single object in an array
        }
        allIdentifiedExercises.push(...identifiedExercisesForImage);
      } catch (parseError) {
        console.error("AI returned an invalid format for one image:", parseError);
        continue;
      }
    }

    if (allIdentifiedExercises.length === 0) {
      return new Response(JSON.stringify({ identifiedExercises: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- DUPLICATE CHECK & URL CONVERSION ---
    // Fetch all existing exercises (global and user-owned) for robust duplicate checking
    const { data: allExistingExercises, error: fetchAllExistingError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('id, name, user_id');

    if (fetchAllExistingError) {
      console.error("Error fetching all existing exercises for duplicate check:", fetchAllExistingError.message);
      throw fetchAllExistingError;
    }

    const typedExistingExercises: ExistingExercise[] = allExistingExercises || [];

    const finalUniqueExercises: any[] = [];
    const seenNormalizedNames = new Set<string>(); // To track exercises identified in the current batch

    for (const ex of allIdentifiedExercises) {
      const normalizedAiName = normalizeName(ex.name);
      let duplicate_status: 'none' | 'global' | 'my-exercises' = 'none';
      let existing_id: string | null = null; // NEW: To store the ID of the duplicate

      // Check if already identified in this batch
      if (seenNormalizedNames.has(normalizedAiName)) {
        continue; // Skip if already processed in this batch
      }

      // Check user's custom exercises first
      const userDuplicate = typedExistingExercises.find(existingEx => existingEx.user_id === user.id && normalizeName(existingEx.name) === normalizedAiName);
      if (userDuplicate) {
        duplicate_status = 'my-exercises';
        existing_id = userDuplicate.id;
      } else {
        // If not in user's, check global library
        const globalDuplicate = typedExistingExercises.find(existingEx => existingEx.user_id === null && normalizeName(existingEx.name) === normalizedAiName);
        if (globalDuplicate) {
          duplicate_status = 'global';
          existing_id = globalDuplicate.id;
        }
      }

      // Convert YouTube URL to embed format
      console.log(`[identify-equipment] Original video_url for ${ex.name}: ${ex.video_url}`); // DEBUG
      const embedVideoUrl = getYouTubeEmbedUrl(ex.video_url);
      console.log(`[identify-equipment] Converted video_url for ${ex.name}: ${embedVideoUrl}`); // DEBUG

      finalUniqueExercises.push({
        ...ex,
        video_url: embedVideoUrl, // Update to embed URL
        duplicate_status: duplicate_status,
        existing_id: existing_id, // NEW: Add the ID to the response
      });
      seenNormalizedNames.add(normalizedAiName); // Mark as seen for this batch
    }

    return new Response(JSON.stringify({ identifiedExercises: finalUniqueExercises }), {
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