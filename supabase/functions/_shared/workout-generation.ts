// Shared workout generation logic for all edge functions
// This module provides personalized, AI-powered workout generation

// @ts-ignore
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- TYPE DEFINITIONS ---

export interface ExerciseDefinition {
  id: string;
  name: string;
  user_id: string | null;
  library_id: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  icon_url: string | null;
}

export interface ScoredExercise extends ExerciseDefinition {
  score: number;
  safetyRating: 'safe' | 'manageable' | 'risky';
}

export interface InjuryAnalysisResult {
  exerciseId: string;
  safetyRating: 'safe' | 'manageable' | 'risky';
  reason: string;
}

export interface UserProfile {
  active_gym_id: string | null;
  health_notes: string | null;
  preferred_muscles: string | null;
}

export interface WorkoutSummary {
  workoutName: string;
  exercises: string[];
}

export interface RegenerationSummary {
  logicApplied: string[];
  workouts: WorkoutSummary[];
  injuryNotes: string | null;
}

export interface SafetyAnalysisResult {
  results: Map<string, InjuryAnalysisResult>;
  injuryNotes: string | null;
}

// --- UTILITY FUNCTIONS ---

export function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 };
  }
}

export function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
  if (workoutSplit === 'ppl') return ['Push', 'Pull', 'Legs'];
  throw new Error('Unknown workout split type.');
}

export function musclesIntersect(muscleString: string | null, muscleSet: Set<string>): boolean {
  if (!muscleString) return false;
  const muscles = muscleString.split(',').map(m => m.trim().toLowerCase());
  return muscles.some(m => {
    for (const target of muscleSet) {
      if (m.includes(target.toLowerCase()) || target.toLowerCase().includes(m)) {
        return true;
      }
    }
    return false;
  });
}

export function parsePreferredMuscles(preferredMuscles: string | null): Set<string> {
  if (!preferredMuscles) return new Set();
  return new Set(preferredMuscles.split(',').map(m => m.trim().toLowerCase()));
}

// --- AI-POWERED INJURY ANALYSIS ---

export async function analyzeExerciseSafetyWithAI(
  exercises: ExerciseDefinition[],
  healthNotes: string
): Promise<SafetyAnalysisResult> {
  const results = new Map<string, InjuryAnalysisResult>();
  
  // If no health notes or no API key, mark all as safe
  if (!healthNotes || healthNotes.trim() === '' || !GEMINI_API_KEY) {
    exercises.forEach(ex => {
      results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'No health concerns noted' });
    });
    return { results, injuryNotes: null };
  }

  // Prepare exercise list for AI analysis (batch for efficiency)
  const exerciseList = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    mainMuscle: ex.main_muscle,
    movementType: ex.movement_type,
    category: ex.category
  }));

  const systemPrompt = `You are a fitness safety expert. Given a user's health notes/injuries and a list of exercises, categorize each exercise's safety level and provide a brief managing note.

User's Health Notes: "${healthNotes}"

Categorize each exercise as:
- "safe": Exercise does not impact the injury/condition at all
- "manageable": Exercise could be done with modifications, machine support, or lighter weight (e.g., machine press instead of barbell for shoulder issues, back-supported exercises for lower back issues)
- "risky": Exercise directly strains the affected area and should be avoided or heavily deprioritized

Consider:
- Machine-based exercises often provide better support and control for injuries
- Seated/supported variations are safer for back issues
- Controlled cable movements are often safer than free weights for joint issues
- Compound movements may put more strain on injuries than isolation exercises

Respond with JSON object:
{
  "ratings": [{"id": "exercise_id", "rating": "safe|manageable|risky", "reason": "brief explanation"}],
  "generalInjuryNote": "A brief, encouraging 2-3 sentence note explaining how we've adjusted their plan for their injuries and how they should manage them during these workouts."
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nExercises to analyze:\n${JSON.stringify(exerciseList, null, 2)}` }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      console.error('[workout-generation] Gemini API error, marking all exercises as safe');
      exercises.forEach(ex => {
        results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'AI analysis unavailable' });
      });
      return { results, injuryNotes: null };
    }

    const geminiData = await response.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let parsed: { ratings: Array<{ id: string; rating: string; reason: string }>; generalInjuryNote: string };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { ratings: [], generalInjuryNote: '' };
    }

    // Map results
    parsed.ratings?.forEach(result => {
      results.set(result.id, {
        exerciseId: result.id,
        safetyRating: (result.rating as 'safe' | 'manageable' | 'risky') || 'safe',
        reason: result.reason || ''
      });
    });

    // Mark any missing exercises as safe
    exercises.forEach(ex => {
      if (!results.has(ex.id)) {
        results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'Not analyzed' });
      }
    });

    return { results, injuryNotes: parsed.generalInjuryNote || null };
  } catch (error) {
    console.error('[workout-generation] Error in AI safety analysis:', error);
    // Fallback: mark all as safe
    exercises.forEach(ex => {
      results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'Analysis error' });
    });
    return { results, injuryNotes: null };
  }
}

// --- EXERCISE SCORING AND SELECTION ---

export function scoreAndSortExercises(
  exercises: ExerciseDefinition[],
  userId: string,
  activeGymExerciseIds: Set<string>,
  allLinkedExerciseIds: Set<string>,
  preferredMuscles: Set<string>,
  safetyResults: Map<string, InjuryAnalysisResult>
): ScoredExercise[] {
  const scored: ScoredExercise[] = exercises.map(ex => {
    let score = 0;
    const safety = safetyResults.get(ex.id);
    const safetyRating = safety?.safetyRating || 'safe';

    // Base score by safety (risky exercises get much lower priority)
    switch (safetyRating) {
      case 'safe': score += 100; break;
      case 'manageable': score += 50; break;
      case 'risky': score += 0; break;
    }

    // Tier 1: User's custom exercises get highest priority
    if (ex.user_id === userId) {
      score += 200;
    }
    // Tier 2: Gym-linked global exercises
    else if (ex.user_id === null && activeGymExerciseIds.has(ex.id)) {
      score += 150;
    }
    // Tier 3: Unlinked global exercises (fallback)
    else if (ex.user_id === null && !allLinkedExerciseIds.has(ex.id)) {
      score += 100;
    }
    // Tier 4: Global exercises linked to OTHER gyms (lowest priority)
    else {
      score += 50;
    }

    // Boost for preferred muscles
    if (preferredMuscles.size > 0 && musclesIntersect(ex.main_muscle, preferredMuscles)) {
      score += 75;
    }

    // Compound movements get a small boost (more efficient for time)
    if (ex.movement_type === 'compound') {
      score += 25;
    }

    return { ...ex, score, safetyRating };
  });

  // Sort by score (highest first), then by name for consistency
  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
}

// --- BUILD WORKOUT POOLS ---

export function buildWorkoutPools(
  allExercises: ExerciseDefinition[],
  workoutSplit: string
): Record<string, ExerciseDefinition[]> {
  const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};

  if (workoutSplit === 'ulul') {
    // Upper/Lower split: Filter by muscle groups
    const UPPER_BODY_MUSCLES = new Set(['pectorals', 'deltoids', 'lats', 'traps', 'biceps', 'triceps', 'abdominals', 'core', 'chest', 'shoulders', 'back']);
    const LOWER_BODY_MUSCLES = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'quads', 'legs']);

    const upperPool = allExercises.filter((ex: ExerciseDefinition) => 
      musclesIntersect(ex.main_muscle, UPPER_BODY_MUSCLES)
    );
    const lowerPool = allExercises.filter((ex: ExerciseDefinition) => 
      musclesIntersect(ex.main_muscle, LOWER_BODY_MUSCLES)
    );

    // Distribute exercises between A and B workouts
    workoutSpecificPools['Upper Body A'] = [];
    workoutSpecificPools['Upper Body B'] = [];
    workoutSpecificPools['Lower Body A'] = [];
    workoutSpecificPools['Lower Body B'] = [];

    upperPool.forEach((ex: ExerciseDefinition, i: number) => {
      workoutSpecificPools[i % 2 === 0 ? 'Upper Body A' : 'Upper Body B'].push(ex);
    });
    lowerPool.forEach((ex: ExerciseDefinition, i: number) => {
      workoutSpecificPools[i % 2 === 0 ? 'Lower Body A' : 'Lower Body B'].push(ex);
    });
  } else {
    // PPL split: Filter by movement_pattern
    workoutSpecificPools['Push'] = allExercises.filter((ex: ExerciseDefinition) => 
      ex.movement_pattern === 'Push'
    );
    workoutSpecificPools['Pull'] = allExercises.filter((ex: ExerciseDefinition) => 
      ex.movement_pattern === 'Pull'
    );
    workoutSpecificPools['Legs'] = allExercises.filter((ex: ExerciseDefinition) => 
      ex.movement_pattern === 'Legs'
    );
  }

  return workoutSpecificPools;
}

// --- MAIN WORKOUT GENERATION FUNCTION ---

export async function generateWorkoutPlanForTPath(
  supabaseServiceRoleClient: any,
  userId: string,
  tPathId: string,
  sessionLength: string | null,
  activeGymId: string | null,
  profile: UserProfile
): Promise<RegenerationSummary> {
  const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
    .from('t_paths')
    .select('id, settings, user_id')
    .eq('id', tPathId)
    .eq('user_id', userId)
    .single();
    
  if (tPathError || !tPathData) {
    throw new Error(`Main T-Path not found for user ${userId} and tPathId ${tPathId}.`);
  }

  // Delete old child workouts for THIS gym
  const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient
    .from('t_paths')
    .select('id')
    .eq('parent_t_path_id', tPathId)
    .eq('user_id', userId)
    .eq('gym_id', activeGymId);

  if (fetchOldError) throw fetchOldError;

  if (oldChildWorkouts && oldChildWorkouts.length > 0) {
    const oldChildIds = oldChildWorkouts.map((w: { id: string }) => w.id);
    await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
    await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
  }

  const tPathSettings = tPathData.settings as { tPathType?: string };
  if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
  
  const workoutSplit = tPathSettings.tPathType;
  const { main: maxMainExercises, bonus: maxBonusExercises } = getExerciseCounts(sessionLength);
  const workoutNames = getWorkoutNamesForSplit(workoutSplit);
  const preferredMuscles = parsePreferredMuscles(profile.preferred_muscles);

  console.log(`[workout-generation] Generating ${workoutSplit} workouts for session length ${sessionLength}`);
  console.log(`[workout-generation] Target: ${maxMainExercises} main + ${maxBonusExercises} bonus = ${maxMainExercises + maxBonusExercises} total exercises per workout`);

  // Initialize regeneration summary
  const regenerationSummary: RegenerationSummary = {
    logicApplied: [
      "Analyzed full library of exercises for movement patterns",
      "Prioritized your custom-added exercises",
      "Matched exercises to your active gym equipment",
      "Ranked exercises based on your preferred muscles"
    ],
    workouts: [],
    injuryNotes: null
  };

  if (profile.health_notes) {
    regenerationSummary.logicApplied.push("Applied AI injury analysis to filter risky movements");
  }

  // Fetch ALL exercises from exercise_definitions (the global library)
  const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient
    .from('exercise_definitions')
    .select('*');
  if (fetchAllExercisesError) throw fetchAllExercisesError;

  console.log(`[workout-generation] Fetched ${allExercises?.length || 0} total exercises from library`);

  // Get gym links for tiering
  const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient
    .from('gym_exercises')
    .select('exercise_id');
  if (allGymLinksError) throw allGymLinksError;
  
  const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));

  // Get active gym's exercise links
  let activeGymExerciseIds = new Set<string>();
  if (activeGymId) {
    const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient
      .from('gym_exercises')
      .select('exercise_id')
      .eq('gym_id', activeGymId);
    if (activeGymLinksError) throw activeGymLinksError;
    activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
  }

  // Build workout-specific exercise pools
  const workoutSpecificPools = buildWorkoutPools(allExercises || [], workoutSplit);

  // Log pool sizes for debugging
  Object.entries(workoutSpecificPools).forEach(([name, pool]) => {
    console.log(`[workout-generation] Pool for ${name}: ${pool.length} exercises`);
  });

  // Generate workouts
  for (const workoutName of workoutNames) {
    const candidatePool = workoutSpecificPools[workoutName] || [];
    
    if (candidatePool.length === 0) {
      console.warn(`[workout-generation] Warning: No exercises found for ${workoutName}`);
      continue;
    }

    // Analyze exercise safety with AI (if health notes exist)
    const { results: safetyResults, injuryNotes } = await analyzeExerciseSafetyWithAI(candidatePool, profile.health_notes || '');
    
    // Capture injury notes from first workout that has them
    if (injuryNotes && !regenerationSummary.injuryNotes) {
      regenerationSummary.injuryNotes = injuryNotes;
    }

    // Score and sort exercises
    const scoredExercises = scoreAndSortExercises(
      candidatePool,
      userId,
      activeGymExerciseIds,
      allLinkedExerciseIds,
      preferredMuscles,
      safetyResults
    );

    // Filter out risky exercises (unless we don't have enough safe/manageable ones)
    let safeExercises = scoredExercises.filter(ex => ex.safetyRating !== 'risky');
    const totalNeeded = maxMainExercises + maxBonusExercises;
    
    // If we don't have enough safe/manageable exercises, include some risky ones at the end
    if (safeExercises.length < totalNeeded) {
      const riskyExercises = scoredExercises.filter(ex => ex.safetyRating === 'risky');
      safeExercises = [...safeExercises, ...riskyExercises.slice(0, totalNeeded - safeExercises.length)];
    }

    // Select main and bonus exercises
    const mainExercises = safeExercises.slice(0, maxMainExercises);
    const bonusExercises = safeExercises.slice(maxMainExercises, maxMainExercises + maxBonusExercises);

    console.log(`[workout-generation] ${workoutName}: Selected ${mainExercises.length} main + ${bonusExercises.length} bonus exercises`);

    // Create child workout t-path
    const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert({
        user_id: userId,
        parent_t_path_id: tPathId,
        template_name: workoutName,
        is_bonus: true,
        settings: tPathData.settings,
        gym_id: activeGymId
      })
      .select('id')
      .single();

    if (createChildError) throw createChildError;

    const childWorkoutId = newChildWorkout.id;

    // Build exercise payload
    const exercisesToInsertPayload = [
      ...mainExercises.map((ex, index) => ({
        template_id: childWorkoutId,
        exercise_id: ex.id,
        order_index: index,
        is_bonus_exercise: false
      })),
      ...bonusExercises.map((ex, index) => ({
        template_id: childWorkoutId,
        exercise_id: ex.id,
        order_index: mainExercises.length + index,
        is_bonus_exercise: true
      }))
    ];

    if (exercisesToInsertPayload.length > 0) {
      const { error: insertError } = await supabaseServiceRoleClient
        .from('t_path_exercises')
        .insert(exercisesToInsertPayload);
      if (insertError) throw insertError;
    }

    // Add to summary
    regenerationSummary.workouts.push({
      workoutName,
      exercises: mainExercises.map(ex => ex.name)
    });
  }

  return regenerationSummary;
}
