import { getOpenAIClient, AI_MODEL } from './openai-client';
import type { EquipmentId } from '../constants/equipment';
import type { TPath, TPathExercise } from '../storage/models';

export interface WorkoutGenerationParams {
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general_fitness';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  equipment: EquipmentId[];
  daysPerWeek: number;
  sessionDuration: number; // minutes
  focusAreas?: string[]; // e.g., ["Upper Body", "Core", "Legs"]
  restrictions?: string[]; // e.g., ["No jumping", "Lower back issues"]
}

export interface GeneratedProgram {
  name: string;
  description: string;
  durationWeeks: number;
  workouts: GeneratedWorkout[];
}

export interface GeneratedWorkout {
  name: string;
  description: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedExercise {
  exerciseName: string;
  sets: number;
  reps: string; // Can be range like "8-12" or specific like "10"
  restSeconds: number;
  notes?: string;
}

export async function generateWorkoutProgram(
  params: WorkoutGenerationParams
): Promise<GeneratedProgram> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are an expert fitness coach and program designer. Create personalized workout programs based on user goals, equipment availability, and experience level. Always provide safe, effective, and evidence-based training recommendations.`;

  const userPrompt = `Create a ${params.daysPerWeek}-day per week workout program with the following specifications:

Goal: ${params.goal}
Experience Level: ${params.experienceLevel}
Session Duration: ${params.sessionDuration} minutes
Available Equipment: ${params.equipment.join(', ')}
${params.focusAreas?.length ? `Focus Areas: ${params.focusAreas.join(', ')}` : ''}
${params.restrictions?.length ? `Restrictions/Considerations: ${params.restrictions.join(', ')}` : ''}

Requirements:
1. Create a program name and description
2. Design ${params.daysPerWeek} different workouts
3. Each workout should have a name, description, and 4-8 exercises
4. Each exercise needs: exercise name, sets, reps (as range like "8-12" or specific), rest time in seconds, and optional notes
5. Only use exercises that can be performed with the available equipment
6. Match the intensity and volume to the experience level
7. Ensure proper exercise selection for the stated goal
8. Include appropriate warm-up exercises
9. Program duration should be 4-12 weeks

Respond with valid JSON in this exact format:
{
  "name": "Program Name",
  "description": "Program description and overview",
  "durationWeeks": 8,
  "workouts": [
    {
      "name": "Workout Day 1 Name",
      "description": "What this workout focuses on",
      "exercises": [
        {
          "exerciseName": "Exercise name",
          "sets": 3,
          "reps": "8-12",
          "restSeconds": 60,
          "notes": "Optional form tips or progressions"
        }
      ]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const program = JSON.parse(content) as GeneratedProgram;
    return program;
  } catch (error) {
    console.error('Failed to generate workout program:', error);
    throw new Error(`AI program generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
