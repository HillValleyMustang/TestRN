import { getOpenAIClient, AI_MODEL } from './openai-client';

export interface CoachingContext {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  targetReps: string;
  userGoal?: string;
  previousPerformance?: {
    weight: number;
    reps: number;
  };
}

export interface CoachingAdvice {
  message: string;
  type: 'motivation' | 'form' | 'progression' | 'rest';
}

export async function getCoachingAdvice(context: CoachingContext): Promise<CoachingAdvice> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are an encouraging and knowledgeable fitness coach. Provide brief, actionable coaching advice for exercises. Keep responses under 100 words and focus on motivation, form cues, or progression tips. Be supportive and energetic.`;

  const userPrompt = `Exercise: ${context.exerciseName}
Current Set: ${context.currentSet} of ${context.totalSets}
Target Reps: ${context.targetReps}
${context.userGoal ? `User Goal: ${context.userGoal}` : ''}
${context.previousPerformance ? `Last time: ${context.previousPerformance.weight}lbs x ${context.previousPerformance.reps} reps` : ''}

Provide brief coaching advice. Respond with JSON in this format:
{
  "message": "Your coaching message here",
  "type": "motivation" | "form" | "progression" | "rest"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 256,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    return JSON.parse(content) as CoachingAdvice;
  } catch (error) {
    console.error('Failed to get coaching advice:', error);
    return {
      message: "You've got this! Focus on controlled movements and proper form.",
      type: 'motivation'
    };
  }
}

export async function getFormTips(exerciseName: string): Promise<string[]> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are a fitness expert specializing in exercise technique. Provide concise, actionable form tips.`;

  const userPrompt = `Provide 3-5 key form tips for the exercise: ${exerciseName}

Each tip should be a single clear sentence focusing on technique, safety, and effectiveness.

Respond with JSON in this format:
{
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 512,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const result = JSON.parse(content) as { tips: string[] };
    return result.tips;
  } catch (error) {
    console.error('Failed to get form tips:', error);
    return ['Focus on controlled movements', 'Maintain proper posture', 'Breathe consistently'];
  }
}
