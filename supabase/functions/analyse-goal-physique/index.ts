// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalPhysiqueAnalysisRequest {
  goalPhysiqueId: string;
  imageData: string; // Base64 encoded image data
}

interface PhysiqueAnalysis {
  muscle_mass_level: 'Low' | 'Athletic' | 'Bodybuilder Elite';
  body_fat_estimated_range: '<10%' | '10-15%' | '15%+';
  dominant_muscle_groups: string[];
  physique_archetype: string;
  required_training_style: 'Hypertrophy' | 'Strength' | 'HIIT' | 'Mixed';
  weakness_areas?: string[];
  estimated_timeframe_months: number;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  genetic_considerations?: string;
  is_elite_physique: boolean;
  reality_check_notes?: string;
}

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { goalPhysiqueId, imageData }: GoalPhysiqueAnalysisRequest = await req.json();

    if (!goalPhysiqueId || !imageData) {
      throw new Error('Missing required parameters: goalPhysiqueId and imageData');
    }

    // Verify the goal physique belongs to the user
    const { data: goalPhysique, error: goalError } = await supabaseClient
      .from('goal_physiques')
      .select('id, user_id')
      .eq('id', goalPhysiqueId)
      .eq('user_id', user.id)
      .single();

    if (goalError || !goalPhysique) {
      throw new Error('Goal physique not found or access denied');
    }

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabaseClient
      .from('physique_analyses')
      .select('id')
      .eq('goal_physique_id', goalPhysiqueId)
      .single();

    if (existingAnalysis) {
      throw new Error('Analysis already exists for this goal physique');
    }

    // Use the base64 image data sent from the app
    const base64Image = imageData;

    // Prepare the AI analysis prompt
    const analysisPrompt = `You are a professional physique analyst and fitness expert. Analyze this physique photo and provide a detailed assessment for goal-setting purposes.

IMPORTANT ETHICAL GUIDELINES:
- This analysis is for MOTIVATIONAL purposes only
- Always emphasize that genetics, consistency, and lifestyle play major roles
- If this appears to be an elite/professional physique (e.g., bodybuilder, fitness model), clearly flag it
- Be realistic about natural limitations for most people
- Focus on HEALTH and SUSTAINABLE progress

Analyze the physique and respond with a JSON object containing exactly these fields:

{
  "muscle_mass_level": "Low" | "Athletic" | "Bodybuilder Elite",
  "body_fat_estimated_range": "<10%" | "10-15%" | "15%+",
  "dominant_muscle_groups": ["array of top 3 most developed areas, e.g., 'Lateral Delts', 'Upper Chest', 'Quads'"],
  "physique_archetype": "e.g., 'V-Taper', 'Powerlifter', 'Endurance Runner', 'Natural Athlete'",
  "required_training_style": "Hypertrophy" | "Strength" | "HIIT" | "Mixed",
  "weakness_areas": ["array of areas that need development, if any"],
  "estimated_timeframe_months": number (realistic months for natural progression),
  "difficulty_level": "Beginner" | "Intermediate" | "Advanced" | "Elite",
  "genetic_considerations": "brief note about genetic factors that would influence this physique",
  "is_elite_physique": boolean (true if this appears professional/elite level),
  "reality_check_notes": "important caveats and realistic expectations"
}

Be honest and constructive. Focus on what can be achieved through training, not what might require steroids or extreme measures.`;

    // Call OpenAI Vision API
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.3 // Lower temperature for more consistent analysis
      })
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error('[EdgeFunction] OpenAI API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorBody
      });

      // Check for content policy violations
      if (errorBody.includes('safety instructions') ||
          errorBody.includes('content policy') ||
          errorBody.includes('inappropriate content')) {
        throw new Error('This image contains content that violates our usage policies. Please ensure your photo shows appropriate athletic/fitness content only.');
      }

      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorBody}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisJson: PhysiqueAnalysis = JSON.parse(openaiData.choices[0].message.content);

    // Validate the response structure
    const requiredFields = [
      'muscle_mass_level', 'body_fat_estimated_range', 'dominant_muscle_groups',
      'physique_archetype', 'required_training_style', 'estimated_timeframe_months',
      'difficulty_level', 'is_elite_physique'
    ];

    for (const field of requiredFields) {
      if (!(field in analysisJson)) {
        throw new Error(`Invalid AI response: missing required field '${field}'`);
      }
    }

    // Insert the analysis into the database
    const { data: insertedAnalysis, error: insertError } = await supabaseClient
      .from('physique_analyses')
      .insert({
        goal_physique_id: goalPhysiqueId,
        user_id: user.id,
        ...analysisJson,
        raw_ai_response: openaiData,
        ai_model_version: 'gpt-4o',
        analysis_confidence: 0.85 // Default confidence, could be calculated based on response certainty
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Generate personalized recommendations based on the analysis
    const recommendations = generateRecommendations(analysisJson);

    // Insert recommendations
    const recommendationsToInsert = recommendations.map(rec => ({
      physique_analysis_id: insertedAnalysis.id,
      user_id: user.id,
      ...rec
    }));

    const { error: recError } = await supabaseClient
      .from('goal_recommendations')
      .insert(recommendationsToInsert);

    if (recError) {
      console.error('Error inserting recommendations:', recError);
      // Don't fail the whole request if recommendations fail
    }

    // Log AI usage for billing/analytics
    const { error: logError } = await supabaseServiceRoleClient
      .from('ai_physique_usage_logs')
      .insert({
        user_id: user.id,
        goal_physique_id: goalPhysiqueId,
        service_type: 'goal_analysis',
        tokens_used: openaiData.usage?.total_tokens || 0,
        api_cost_cents: Math.ceil((openaiData.usage?.total_tokens || 0) * 0.00015 * 100) // Rough cost calculation
      });

    if (logError) {
      console.error('Error logging AI usage:', logError);
    }

    return new Response(JSON.stringify({
      analysis: insertedAnalysis,
      recommendations: recommendationsToInsert
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error('Goal physique analysis error:', {
      message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Generate personalized recommendations based on physique analysis
 */
function generateRecommendations(analysis: PhysiqueAnalysis) {
  const recommendations = [];

  // Training style recommendation
  recommendations.push({
    category: 'training_style',
    recommendation_type: 'switch_style',
    title: `Switch to ${analysis.required_training_style} Training`,
    description: `Based on your goal physique, we recommend focusing on ${analysis.required_training_style.toLowerCase()} training. This will help you develop the muscle patterns seen in your target physique.`,
    priority: 'high',
    current_training_style: null, // Will be determined by user's current plan
    recommended_training_style: analysis.required_training_style
  });

  // Exercise recommendations for dominant muscle groups
  for (const muscleGroup of analysis.dominant_muscle_groups.slice(0, 2)) { // Top 2 muscle groups
    recommendations.push({
      category: 'exercise_addition',
      recommendation_type: 'add_exercise',
      title: `Prioritize ${muscleGroup} Development`,
      description: `Your goal physique shows well-developed ${muscleGroup.toLowerCase()}. Consider adding compound exercises targeting this area to your routine.`,
      priority: 'high',
      target_muscle_group: muscleGroup,
      suggested_exercises: getExercisesForMuscleGroup(muscleGroup)
    });
  }

  // Rep range recommendations
  let recommendedRepRange = '8-12 reps'; // Default for hypertrophy
  if (analysis.required_training_style === 'Strength') {
    recommendedRepRange = '3-5 reps';
  } else if (analysis.required_training_style === 'HIIT') {
    recommendedRepRange = '15-20 reps';
  }

  recommendations.push({
    category: 'rep_range_adjustment',
    recommendation_type: 'change_reps',
    title: `Adjust Rep Ranges for ${analysis.required_training_style}`,
    description: `For optimal ${analysis.required_training_style.toLowerCase()} development, aim for ${recommendedRepRange} per set.`,
    priority: 'medium',
    current_rep_range: null, // Will be determined by user's current plan
    recommended_rep_range: recommendedRepRange
  });

  return recommendations;
}

/**
 * Get exercise suggestions for a muscle group
 */
function getExercisesForMuscleGroup(muscleGroup: string): any[] {
  const exerciseMap: Record<string, string[]> = {
    'Lateral Delts': ['Lateral Raises', 'Overhead Press', 'Upright Rows'],
    'Upper Chest': ['Incline Bench Press', 'Incline Dumbbell Press', 'Chest Flyes'],
    'Quads': ['Squats', 'Leg Press', 'Lunges'],
    'Hamstrings': ['Romanian Deadlifts', 'Leg Curls', 'Good Mornings'],
    'Biceps': ['Barbell Curls', 'Dumbbell Curls', 'Hammer Curls'],
    'Triceps': ['Tricep Dips', 'Skull Crushers', 'Tricep Pushdowns'],
    'Back': ['Pull-ups', 'Rows', 'Lat Pulldowns'],
    'Calves': ['Calf Raises', 'Seated Calf Raises'],
    'Glutes': ['Hip Thrusts', 'Bulgarian Split Squats', 'Glute Bridges']
  };

  return exerciseMap[muscleGroup] || [`Compound exercises targeting ${muscleGroup}`];
}