/**
 * OpenAI Integration for Gym Equipment Detection
 * Uses GPT-5 Vision API to analyze gym photos and detect available equipment
 * Reference: blueprint:javascript_openai
 */

export interface DetectedEquipment {
  category: string;
  items: string[];
}

export interface GymAnalysisResult {
  equipment: DetectedEquipment[];
  rawResponse: string;
}

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

type ChatCompletionMessage =
  | {
      role: 'system' | 'user';
      content: string;
    }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
    };

interface ChatCompletionResponse {
  choices: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

function getOpenAIHeaders() {
  const apiKey =
    process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OpenAI API key not found. Please set OPENAI_API_KEY in your environment.',
    );
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  } as const;
}

/**
 * Analyze gym photo to detect available equipment
 * @param base64Image - Base64 encoded gym image
 * @returns Detected equipment organized by category
 */
export async function analyzeGymEquipment(
  base64Image: string,
): Promise<GymAnalysisResult> {
  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: getOpenAIHeaders(),
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `You are a gym equipment detection expert. Analyze gym photos and identify all visible gym equipment.

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

Only include categories and items that are clearly visible in the photo. Be specific about weight ranges when visible.`
          } satisfies ChatCompletionMessage,
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this gym photo and list all visible equipment organized by category.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          } satisfies ChatCompletionMessage,
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2048,
      }),
    });

    const completion = (await response.json()) as ChatCompletionResponse;

    if (!response.ok) {
      const message =
        completion?.error?.message ||
        `OpenAI request failed with status ${response.status}`;
      throw new Error(message);
    }
    const content =
      completion.choices?.[0]?.message?.content?.trim() ?? '{}';
    const parsed = JSON.parse(content);

    return {
      equipment: parsed.equipment || [],
      rawResponse: content,
    };
  } catch (error) {
    console.error('[OpenAI] Gym analysis error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to analyze gym photo: ${errorMessage}`);
  }
}

/**
 * Map detected equipment to database exercise IDs
 * This would ideally query your exercises table to find matching exercises
 * For now, returns a simple mapping structure
 */
export function mapEquipmentToExercises(equipment: DetectedEquipment[]): {
  equipment_type: string;
  exercise_ids: string[];
}[] {
  const mappings: { equipment_type: string; exercise_ids: string[] }[] = [];

  equipment.forEach((cat) => {
    cat.items.forEach((item) => {
      mappings.push({
        equipment_type: item,
        exercise_ids: [], // Would be populated by querying exercises table
      });
    });
  });

  return mappings;
}
