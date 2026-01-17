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

interface DetectedEquipment {
  category: string;
  items: string[];
}

interface GymAnalysisResult {
  equipment: DetectedEquipment[];
  rawResponse: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Store values for error handling (request body can only be read once)
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    
    userId = user.id; // Store for error handling

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { base64Images, gymId: requestGymId } = await req.json();
    gymId = requestGymId; // Store for error handling
    
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      throw new Error('No images provided.');
    }

    imageCount = base64Images.length; // Store for error handling

    // Validate image count (max 12 per request)
    if (base64Images.length > 12) {
      throw new Error('Maximum of 12 images can be analysed per request. Please select fewer images.');
    }

    // Rate Limiting: Check user's recent analysis activity
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
      console.error('[analyze-gym-equipment] Error checking hourly rate limit:', hourlyError);
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
      console.error('[analyze-gym-equipment] Error checking daily rate limit:', dailyError);
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
      console.error('[analyze-gym-equipment] Error checking recent analysis:', recentError);
    } else if (recentAnalysis && recentAnalysis.length > 0) {
      throw new Error('Please wait a moment before analysing again. This helps prevent spam and ensures the best experience for everyone.');
    }

    const systemPrompt = `You are a gym equipment detection expert. Analyze gym photos and identify all visible gym equipment.

Organize equipment into these 8 categories:
1. Free Weights (dumbbells, barbells, weight plates, kettlebells, etc.)
2. Benches & Racks (flat bench, incline bench, squat rack, power rack, etc.)
3. Cable Machines (cable crossover, lat pulldown, cable row, etc.)
4. Cardio Equipment (treadmill, bike, rower, elliptical, etc.)
5. Plate-Loaded Machines (leg press, hack squat, chest press, etc.)
6. Resistance Machines (leg curl, leg extension, pec deck, etc.)
7. Functional Training (pull-up bar, dip station, TRX, resistance bands, etc.)
8. Accessories (medicine balls, foam rollers, exercise mats, etc.)

Respond with JSON in this exact format:
{
  "equipment": [
    {
      "category": "Free Weights",
      "items": ["Dumbbells (5-50kg)", "Barbells", "Weight Plates"]
    },
    {
      "category": "Benches & Racks",
      "items": ["Flat Bench", "Squat Rack"]
    }
  ]
}

Only include categories and items that are clearly visible in the photo(s). Be specific about weight ranges when visible. Analyze ALL provided images and consolidate equipment found across all images into a single list.`;

    const userPrompt = `Analyze these gym photo(s) and list all visible equipment organized by category.`;

    // Prepare content parts for Gemini API
    const parts: any[] = [
      { text: `${systemPrompt}\n\n${userPrompt}` }
    ];

    // Add all images as inline data
    for (const base64Image of base64Images) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Image
        }
      });
    }

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('[analyze-gym-equipment] Gemini API error:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        body: errorBody
      });
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorBody}`);
    }

    const geminiData = await geminiResponse.json();
    
    // Extract response text from Gemini response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    if (!responseText) {
      return new Response(JSON.stringify({ 
        equipment: [], 
        rawResponse: '{}' 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parse JSON response
    let parsedResponse: { equipment?: DetectedEquipment[] };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[analyze-gym-equipment] JSON parse error:', parseError);
      // Try to extract JSON from text if it's wrapped in markdown or other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Gemini response as JSON');
      }
    }

    const result: GymAnalysisResult = {
      equipment: parsedResponse.equipment || [],
      rawResponse: responseText
    };

    // Log successful analysis usage
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
      // Don't fail the request if logging fails, but log the error
      console.error('[analyze-gym-equipment] Error logging usage:', logError);
    }

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in analyze-gym-equipment edge function:", message);
    
    // Check if this is a rate limit error (don't log these as failed analyses)
    const isRateLimitError = message.includes('limit') || 
                             message.includes('wait') ||
                             message.includes('moment');
    
    // Only log failed analyses if they passed rate limiting and we have user/image info
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
        // Don't fail the request if logging fails
        console.error('[analyze-gym-equipment] Error logging failed attempt:', logError);
      }
    }
    
    // Return appropriate status code based on error type
    const statusCode = isRateLimitError ? 429 : 500;
    
    return new Response(JSON.stringify({ error: message }), { 
      status: statusCode, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
