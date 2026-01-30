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
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Types ---

interface DetectedEquipment {
  category: string;
  items: string[];
}

interface ExistingExercise {
  id: string;
  name: string;
  user_id: string | null;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  library_id: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
}

interface AnalyzeGymCompleteRequest {
  base64Images: string[];
  gymId: string;
  generateExercises: boolean;
  programmeType: 'ulul' | 'ppl' | null;
}

// --- Constants ---

const VALID_MUSCLE_GROUPS = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", "Triceps",
  "Quadriceps", "Hamstrings", "Glutes", "Calves", "Abdominals", "Core", "Full Body"
];

// --- Utility Functions ---

const normalizeName = (name: string): string =>
  name ? name.toLowerCase().replace(/\s+/g, ' ').trim().replace(/s$/, '').replace(/[^a-z0-9\s]/g, '') : '';

const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) return url;
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/);
  return (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const mapMovementPattern = (mainMuscle: string, targetProgramme: 'ulul' | 'ppl'): string => {
  const upperBodyPushMuscles = ['Pectorals', 'Deltoids', 'Triceps'];
  const upperBodyPullMuscles = ['Lats', 'Traps', 'Biceps'];
  const lowerBodyMuscles = ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'];
  const coreMuscles = ['Abdominals', 'Core'];

  if (targetProgramme === 'ulul') {
    if (upperBodyPushMuscles.includes(mainMuscle) || upperBodyPullMuscles.includes(mainMuscle)) return 'Upper';
    if (lowerBodyMuscles.includes(mainMuscle)) return 'Lower';
    if (coreMuscles.includes(mainMuscle)) return 'Core';
    return 'Upper';
  } else {
    if (upperBodyPushMuscles.includes(mainMuscle)) return 'Push';
    if (upperBodyPullMuscles.includes(mainMuscle)) return 'Pull';
    if (lowerBodyMuscles.includes(mainMuscle)) return 'Legs';
    if (coreMuscles.includes(mainMuscle)) return 'Core';
    return 'Push';
  }
};

// --- Exercise Cache (5-minute TTL) ---

let exerciseCache: { exercises: ExistingExercise[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedExercises(supabase: any): Promise<ExistingExercise[]> {
  const now = Date.now();
  if (exerciseCache && (now - exerciseCache.timestamp) < CACHE_TTL) {
    console.log('[analyze-gym-complete] Using cached exercises');
    return exerciseCache.exercises;
  }

  console.log('[analyze-gym-complete] Fetching exercises from database');
  const { data, error } = await supabase.from('exercise_definitions').select('*');
  if (error) throw error;

  exerciseCache = { exercises: data || [], timestamp: now };
  return exerciseCache.exercises;
}

// --- Prompt Builder ---

function buildGeminiPrompt(generateExercises: boolean, programmeType: 'ulul' | 'ppl'): string {
  const equipmentPrompt = `You are a gym equipment detection expert and fitness coach. Analyze the provided gym photos.

TASK 1 - EQUIPMENT DETECTION:
Identify ONLY the PRIMARY equipment — the main piece of equipment the user is photographing and wants to use.

CRITICAL RULES:
- ONLY detect equipment that is the clear focus/subject of the photo (large in frame, centred, foreground).
- IGNORE equipment racks, shelves, or storage areas in the background (e.g. dumbbell racks, weight plate storage).
- IGNORE other machines/equipment that are clearly not the subject of the photo.
- If a specific machine is in the foreground (e.g. shoulder press machine, leg press, cable machine), detect ONLY that machine.
- Do NOT list dumbbells, barbells, or free weights unless they are the ONLY equipment in the photo and clearly the subject.

Organize into these 8 categories:
1. Free Weights (dumbbells, barbells, weight plates, kettlebells, etc.)
2. Benches & Racks (flat bench, incline bench, squat rack, power rack, etc.)
3. Cable Machines (cable crossover, lat pulldown, cable row, etc.)
4. Cardio Equipment (treadmill, bike, rower, elliptical, etc.)
5. Plate-Loaded Machines (leg press, hack squat, chest press, etc.)
6. Resistance Machines (leg curl, leg extension, pec deck, etc.)
7. Functional Training (pull-up bar, dip station, TRX, resistance bands, etc.)
8. Accessories (medicine balls, foam rollers, exercise mats, etc.)

Only include categories and items that are clearly visible in the photo(s). Be specific about weight ranges when visible. Analyze ALL provided images and consolidate equipment found across all images into a single list.`;

  if (!generateExercises) {
    return `${equipmentPrompt}

Respond with JSON in this exact format:
{
  "equipment": [
    {"category": "Free Weights", "items": ["Dumbbells (5-50kg)", "Barbells", "Weight Plates"]},
    {"category": "Benches & Racks", "items": ["Flat Bench", "Squat Rack"]}
  ]
}`;
  }

  const programmeContext = programmeType === 'ulul'
    ? 'The user follows an Upper/Lower split (ULUL). Movement patterns should be labeled as "Upper" (for all upper body exercises including chest, shoulders, back, arms), "Lower" (for all lower body exercises including quads, hamstrings, glutes, calves), or "Core".'
    : 'The user follows a Push/Pull/Legs split (PPL). Movement patterns should be labeled as "Push" (chest, shoulders, triceps), "Pull" (back, biceps), "Legs" (quads, hamstrings, glutes, calves), or "Core".';

  const movementPatternValues = programmeType === 'ulul'
    ? '"Upper" | "Lower" | "Core"'
    : '"Push" | "Pull" | "Legs" | "Core"';

  return `${equipmentPrompt}

TASK 2 - EXERCISE GENERATION:
Based STRICTLY on the equipment you detected in Task 1, generate exercises that can be performed using ONLY that equipment.

PROGRAMME CONTEXT: ${programmeContext}

CRITICAL ACCURACY RULES:
- Generate exercises ONLY for the PRIMARY equipment detected in Task 1.
- If you detected a single machine (e.g. shoulder press machine, leg press, cable machine), generate ONLY exercises for that specific machine.
- DO NOT add dumbbell, barbell, or free weight exercises unless free weights were the PRIMARY equipment detected (not just visible in background).
- DO NOT suggest exercises for equipment racks, storage shelves, or background equipment.
- If the machine only supports 2-3 exercises, return only those 2-3 exercises. Do NOT pad the list with unrelated exercises.
- Quality over quantity: 2 accurate machine-specific exercises is better than 10 exercises that include background equipment.
- Example: If you detected "Shoulder Press Machine", return only shoulder press variations (seated shoulder press, machine military press). Do NOT add dumbbell lateral raises, dumbbell curls, or any other dumbbell exercises even if dumbbells are visible in the background.

INSTRUCTIONS:
1. For each piece of detected equipment, list the exercises it actually supports that fit the user's ${programmeType === 'ulul' ? 'Upper/Lower' : 'Push/Pull/Legs'} programme.
2. Include common variations ONLY if the detected equipment supports them (e.g. incline bench press only if an incline bench was detected).
3. Consolidate all exercises into a single list, removing duplicates.
4. Each exercise MUST have:
   - "name": Exercise name
   - "main_muscle": MUST be one of: ${VALID_MUSCLE_GROUPS.join(', ')}
   - "type": "weight" | "timed" | "bodyweight"
   - "category": "Bilateral" | "Unilateral" | null
   - "movement_type": "compound" | "isolation"
   - "movement_pattern": ${movementPatternValues} (IMPORTANT: Match this to the ${programmeType === 'ulul' ? 'Upper/Lower' : 'Push/Pull/Legs'} programme)
   - "description": A brief description of the exercise
   - "pro_tip": A short, actionable pro tip for performing the exercise
   - "video_url": Optional YouTube URL (can be empty string if none)

Respond with JSON in this exact format:
{
  "equipment": [
    {"category": "Free Weights", "items": ["Dumbbells (5-50kg)", "Barbells", "Weight Plates"]},
    {"category": "Benches & Racks", "items": ["Flat Bench", "Squat Rack"]}
  ],
  "exercises": [
    {
      "name": "Barbell Bench Press",
      "main_muscle": "Pectorals",
      "type": "weight",
      "category": "Bilateral",
      "movement_type": "compound",
      "movement_pattern": "${programmeType === 'ulul' ? 'Upper' : 'Push'}",
      "description": "Lie on flat bench, lower barbell to chest, press up",
      "pro_tip": "Keep shoulder blades pinched together",
      "video_url": ""
    }
  ]
}`;
}

// --- Main Handler ---

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Store values for error handling
  let userId: string | undefined;
  let imageCount: number = 0;
  let gymId: string | undefined;

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');

    userId = user.id;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // --- Parse Request ---
    const { base64Images, gymId: requestGymId, generateExercises = true, programmeType }: AnalyzeGymCompleteRequest = await req.json();
    gymId = requestGymId;

    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      throw new Error('No images provided.');
    }

    imageCount = base64Images.length;

    if (base64Images.length > 12) {
      throw new Error('Maximum of 12 images can be analysed per request. Please select fewer images.');
    }

    // --- Rate Limiting ---
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit (max 5 analyses per hour)
    const { count: hourlyCount, error: hourlyError } = await supabase
      .from('gym_analysis_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('used_at', oneHourAgo.toISOString());

    if (hourlyError) {
      console.error('[analyze-gym-complete] Error checking hourly rate limit:', hourlyError);
    } else if (hourlyCount && hourlyCount >= 5) {
      throw new Error('You\'ve reached the hourly limit of 5 gym analyses. Please wait a bit before trying again. This helps us manage costs and prevent abuse.');
    }

    // Check daily limit (max 20 analyses per day)
    const { count: dailyCount, error: dailyError } = await supabase
      .from('gym_analysis_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('used_at', oneDayAgo.toISOString());

    if (dailyError) {
      console.error('[analyze-gym-complete] Error checking daily rate limit:', dailyError);
    } else if (dailyCount && dailyCount >= 20) {
      throw new Error('You\'ve reached the daily limit of 20 gym analyses. This limit resets at midnight. Please try again tomorrow.');
    }

    // Check for rapid successive analyses (anti-spam: max 1 per 30 seconds)
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    const { data: recentAnalysis, error: recentError } = await supabase
      .from('gym_analysis_usage_logs')
      .select('used_at')
      .eq('user_id', user.id)
      .gte('used_at', thirtySecondsAgo.toISOString())
      .order('used_at', { ascending: false })
      .limit(1);

    if (recentError) {
      console.error('[analyze-gym-complete] Error checking recent analysis:', recentError);
    } else if (recentAnalysis && recentAnalysis.length > 0) {
      throw new Error('Please wait a moment before analysing again. This helps prevent spam and ensures the best experience for everyone.');
    }

    // --- Build Gemini Prompt ---
    const tPathType: 'ulul' | 'ppl' = programmeType || 'ppl';
    console.log('[analyze-gym-complete] Programme type:', tPathType, '| Generate exercises:', generateExercises);

    const promptText = buildGeminiPrompt(generateExercises, tPathType);

    // --- Prepare Gemini Request ---
    const parts: any[] = [{ text: promptText }];

    for (const base64Image of base64Images) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Image
        }
      });
    }

    // --- Call Gemini API ---
    console.log('[analyze-gym-complete] Calling Gemini API with', base64Images.length, 'images');
    const startTime = Date.now();

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.15,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      })
    });

    const elapsed = Date.now() - startTime;
    console.log('[analyze-gym-complete] Gemini API responded in', elapsed, 'ms');

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('[analyze-gym-complete] Gemini API error:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        body: errorBody
      });
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    if (!responseText) {
      return new Response(JSON.stringify({
        equipment: [],
        identifiedExercises: [],
        rawResponse: '{}'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Parse Response ---
    let parsedResponse: { equipment?: DetectedEquipment[]; exercises?: any[] };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[analyze-gym-complete] JSON parse error:', parseError);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Gemini response as JSON');
      }
    }

    const equipment = parsedResponse.equipment || [];
    const exercisesFromAI = parsedResponse.exercises || [];

    console.log('[analyze-gym-complete] Detected equipment categories:', equipment.length,
      '| AI exercises:', exercisesFromAI.length);

    // --- Process Exercises (Duplicate Detection) ---
    let identifiedExercises: any[] = [];

    if (generateExercises && exercisesFromAI.length > 0) {
      // Fetch exercises for duplicate detection
      const allDbExercises = await getCachedExercises(supabase);

      // Build lookup maps (O(1) per lookup instead of O(n))
      const userExerciseMap = new Map<string, ExistingExercise>();
      const globalExerciseMap = new Map<string, ExistingExercise>();

      for (const dbEx of allDbExercises) {
        const key = normalizeName(dbEx.name);
        if (dbEx.user_id === user.id) {
          userExerciseMap.set(key, dbEx);
        } else if (dbEx.user_id === null) {
          globalExerciseMap.set(key, dbEx);
        }
      }

      const seenNormalizedNames = new Set<string>();

      for (const aiExercise of exercisesFromAI) {
        // Validate required fields
        if (!aiExercise || typeof aiExercise.name !== 'string' || aiExercise.name.trim() === '' ||
            typeof aiExercise.main_muscle !== 'string' || !VALID_MUSCLE_GROUPS.includes(aiExercise.main_muscle)) {
          continue;
        }

        const normalizedAiName = normalizeName(aiExercise.name);
        if (seenNormalizedNames.has(normalizedAiName)) continue;

        let duplicate_status: 'none' | 'global' | 'my-exercises' = 'none';
        let foundExercise: ExistingExercise | null = null;

        // Check user's exercises first (priority)
        const userMatch = userExerciseMap.get(normalizedAiName);
        if (userMatch) {
          duplicate_status = 'my-exercises';
          foundExercise = userMatch;
        } else {
          // Check global exercises
          const globalMatch = globalExerciseMap.get(normalizedAiName);
          if (globalMatch) {
            duplicate_status = 'global';
            foundExercise = globalMatch;
          }
        }

        if (foundExercise) {
          // Use existing exercise with mapped movement pattern
          const mappedMovementPattern = mapMovementPattern(foundExercise.main_muscle, tPathType);
          identifiedExercises.push({
            ...foundExercise,
            movement_pattern: mappedMovementPattern,
            duplicate_status,
            existing_id: foundExercise.id
          });
        } else {
          // New exercise from AI
          identifiedExercises.push({
            ...aiExercise,
            video_url: getYouTubeEmbedUrl(aiExercise.video_url),
            duplicate_status: 'none',
            existing_id: null
          });
        }

        seenNormalizedNames.add(normalizedAiName);
      }

      console.log('[analyze-gym-complete] Final exercises after dedup:', identifiedExercises.length,
        '| Duplicates found:', identifiedExercises.filter(e => e.duplicate_status !== 'none').length);
    }

    // --- Log Usage ---
    try {
      await supabase
        .from('gym_analysis_usage_logs')
        .insert({
          user_id: user.id,
          gym_id: gymId || null,
          image_count: base64Images.length,
          analysis_successful: true,
          used_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('[analyze-gym-complete] Error logging usage:', logError);
    }

    // --- Return Response ---
    return new Response(JSON.stringify({
      equipment,
      identifiedExercises,
      rawResponse: responseText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[analyze-gym-complete] Error:", message);

    // Check if this is a rate limit error
    const isRateLimitError = message.includes('limit') ||
                             message.includes('wait') ||
                             message.includes('moment');

    // Log failed analyses (skip rate limit errors)
    if (!isRateLimitError && userId && imageCount > 0) {
      try {
        const supabase = createClient(
          // @ts-ignore
          Deno.env.get('SUPABASE_URL') ?? '',
          // @ts-ignore
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabase
          .from('gym_analysis_usage_logs')
          .insert({
            user_id: userId,
            gym_id: gymId || null,
            image_count: imageCount,
            analysis_successful: false,
            used_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('[analyze-gym-complete] Error logging failed attempt:', logError);
      }
    }

    const statusCode = isRateLimitError ? 429 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
