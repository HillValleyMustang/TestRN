// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// @ts-ignore
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Type definitions
interface ExerciseDefinition {
  id: string;
  name: string;
  main_muscle: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  library_id: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
  icon_url: string | null;
  user_id: string | null;
}

interface ScoredExercise extends ExerciseDefinition {
  score: number;
  safetyRating: 'safe' | 'manageable' | 'risky';
}

interface InjuryAnalysisResult {
  exerciseId: string;
  safetyRating: 'safe' | 'manageable' | 'risky';
  reason: string;
}

interface UserProfile {
  health_notes: string | null;
  preferred_muscles: string | null;
}

interface WorkoutSummary {
  workoutName: string;
  exercises: string[];
}

interface RegenerationSummary {
  logicApplied: string[];
  workouts: WorkoutSummary[];
  injuryNotes: string | null;
}

// Utility Functions
function getExerciseCounts(sessionLength: string): { main: number; bonus: number } {
  switch(sessionLength){
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 };
  }
}

function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
  if (workoutSplit === 'ppl') return ['Push', 'Pull', 'Legs'];
  throw new Error('Unknown workout split type.');
}

function musclesIntersect(muscleString: string | null, muscleSet: Set<string>): boolean {
  if (!muscleString) return false;
  const muscles = muscleString.split(',').map((m: string) => m.trim().toLowerCase());
  return muscles.some((m: string) => {
    for (const target of muscleSet) {
      if (m.includes(target.toLowerCase()) || target.toLowerCase().includes(m)) {
        return true;
      }
    }
    return false;
  });
}

function parsePreferredMuscles(preferredMuscles: string | null): Set<string> {
  if (!preferredMuscles) return new Set();
  return new Set(preferredMuscles.split(',').map(m => m.trim().toLowerCase()));
}

// AI-powered injury analysis
async function analyzeExerciseSafetyWithAI(
  exercises: ExerciseDefinition[],
  healthNotes: string
): Promise<{ results: Map<string, InjuryAnalysisResult>; injuryNotes: string | null }> {
  const results = new Map<string, InjuryAnalysisResult>();
  
  if (!healthNotes || healthNotes.trim() === '' || !GEMINI_API_KEY) {
    exercises.forEach(ex => {
      results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'No health concerns noted' });
    });
    return { results, injuryNotes: null };
  }

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
- "manageable": Exercise could be done with modifications, machine support, or lighter weight
- "risky": Exercise directly strains the affected area and should be avoided

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
        contents: [{ parts: [{ text: `${systemPrompt}\n\nExercises to analyze:\n${JSON.stringify(exerciseList, null, 2)}` }] }],
        generationConfig: { temperature: 0.2, topK: 40, topP: 0.95, maxOutputTokens: 4096, responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      exercises.forEach(ex => { results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'AI unavailable' }); });
      return { results, injuryNotes: null };
    }

    const geminiData = await response.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let parsed: { ratings: Array<{ id: string; rating: string; reason: string }>; generalInjuryNote: string };
    try { parsed = JSON.parse(responseText); }
    catch { const jsonMatch = responseText.match(/\{[\s\S]*\}/); parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { ratings: [], generalInjuryNote: null }; }

    parsed.ratings?.forEach(result => {
      results.set(result.id, { exerciseId: result.id, safetyRating: (result.rating as 'safe' | 'manageable' | 'risky') || 'safe', reason: result.reason || '' });
    });
    exercises.forEach(ex => { if (!results.has(ex.id)) results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'Not analyzed' }); });
    return { results, injuryNotes: parsed.generalInjuryNote };
  } catch (error) {
    console.error('[complete-onboarding] AI safety analysis error:', error);
    exercises.forEach(ex => { results.set(ex.id, { exerciseId: ex.id, safetyRating: 'safe', reason: 'Analysis error' }); });
    return { results, injuryNotes: null };
  }
}

function scoreAndSortExercises(
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

    switch (safetyRating) { case 'safe': score += 100; break; case 'manageable': score += 50; break; case 'risky': score += 0; break; }
    if (ex.user_id === userId) score += 200;
    else if (ex.user_id === null && activeGymExerciseIds.has(ex.id)) score += 150;
    else if (ex.user_id === null && !allLinkedExerciseIds.has(ex.id)) score += 100;
    else score += 50;
    if (preferredMuscles.size > 0 && musclesIntersect(ex.main_muscle, preferredMuscles)) score += 75;
    if (ex.movement_type === 'compound') score += 25;

    return { ...ex, score, safetyRating };
  });

  return scored.sort((a, b) => b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name));
}

async function getOrCreateMainTPath(
  supabaseClient: any,
  userId: string,
  programmeType: 'ppl' | 'ulul',
  profileSettings: { primary_goal?: string; preferred_muscles?: string; health_notes?: string }
): Promise<string> {
  const { data: existingTPaths, error: fetchError } = await supabaseClient
    .from('t_paths')
    .select('id, template_name, settings')
    .eq('user_id', userId)
    .is('gym_id', null)
    .is('parent_t_path_id', null);
  
  if (fetchError) throw fetchError;
  if (existingTPaths && existingTPaths.length > 0) return existingTPaths[0].id;
  
  const templateName = programmeType === 'ulul' ? '4-Day Upper/Lower' : '3-Day Push/Pull/Legs';
  const { data: newTPath, error: insertError } = await supabaseClient
    .from('t_paths')
    .insert({
      user_id: userId, gym_id: null, template_name: templateName, is_bonus: false, parent_t_path_id: null,
      settings: { tPathType: programmeType, experience: 'intermediate', goalFocus: profileSettings.primary_goal, preferredMuscles: profileSettings.preferred_muscles, constraints: profileSettings.health_notes }
    })
    .select('id')
    .single();
  
  if (insertError) throw insertError;
  return newTPath.id;
}

async function generateWorkoutPlanForTPath(
  supabaseServiceRoleClient: any,
  userId: string,
  tPathId: string,
  sessionLength: string,
  activeGymId: string | null,
  profile: UserProfile
): Promise<RegenerationSummary> {
  const { data: tPathData } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', userId).single();
  
  const { data: oldChildWorkouts } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', userId);
  if (oldChildWorkouts && oldChildWorkouts.length > 0) {
    const oldChildIds = oldChildWorkouts.map((w: any) => w.id);
    await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
    await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
  }

  const workoutSplit = (tPathData.settings as any).tPathType;
  const { main: maxMain, bonus: maxBonus } = getExerciseCounts(sessionLength);
  const workoutNames = getWorkoutNamesForSplit(workoutSplit);
  const preferredMuscles = parsePreferredMuscles(profile.preferred_muscles);

  const { data: allExercises } = await supabaseServiceRoleClient.from('exercise_definitions').select('*');
  const { data: allGymLinks } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
  const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: any) => l.exercise_id));

  let activeGymExerciseIds = new Set<string>();
  if (activeGymId) {
    const { data: activeGymLinks } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
    activeGymExerciseIds = new Set((activeGymLinks || []).map((l: any) => l.exercise_id));
  }
  
  const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};
  if (workoutSplit === 'ulul') {
    const UPPER = new Set(['pectorals', 'deltoids', 'lats', 'traps', 'biceps', 'triceps', 'abdominals', 'core', 'chest', 'shoulders', 'back']);
    const LOWER = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'quads', 'legs']);
    const upper = (allExercises || []).filter((ex: any) => musclesIntersect(ex.main_muscle, UPPER));
    const lower = (allExercises || []).filter((ex: any) => musclesIntersect(ex.main_muscle, LOWER));
    workoutSpecificPools['Upper Body A'] = []; workoutSpecificPools['Upper Body B'] = [];
    workoutSpecificPools['Lower Body A'] = []; workoutSpecificPools['Lower Body B'] = [];
    upper.forEach((ex: any, i: number) => workoutSpecificPools[i % 2 === 0 ? 'Upper Body A' : 'Upper Body B'].push(ex));
    lower.forEach((ex: any, i: number) => workoutSpecificPools[i % 2 === 0 ? 'Lower Body A' : 'Lower Body B'].push(ex));
  } else {
    workoutSpecificPools['Push'] = (allExercises || []).filter((ex: any) => ex.movement_pattern === 'Push');
    workoutSpecificPools['Pull'] = (allExercises || []).filter((ex: any) => ex.movement_pattern === 'Pull');
    workoutSpecificPools['Legs'] = (allExercises || []).filter((ex: any) => ex.movement_pattern === 'Legs');
  }

  const regenerationSummary: RegenerationSummary = {
    logicApplied: ["Analyzed full library", "Prioritized your custom exercises", "Matched gym equipment", "Ranked by muscle preference"],
    workouts: [],
    injuryNotes: null
  };
  if (profile.health_notes) regenerationSummary.logicApplied.push("Applied AI injury safety analysis");

  for (const workoutName of workoutNames){
    const candidatePool = workoutSpecificPools[workoutName] || [];
    if (candidatePool.length === 0) continue;

    const { results: safetyResults, injuryNotes } = await analyzeExerciseSafetyWithAI(candidatePool, profile.health_notes || '');
    if (injuryNotes && !regenerationSummary.injuryNotes) regenerationSummary.injuryNotes = injuryNotes;

    const scoredExercises = scoreAndSortExercises(candidatePool, userId, activeGymExerciseIds, allLinkedExerciseIds, preferredMuscles, safetyResults);

    let final = scoredExercises.filter(ex => ex.safetyRating !== 'risky');
    const total = maxMain + maxBonus;
    if (final.length < total) final = [...final, ...scoredExercises.filter(ex => ex.safetyRating === 'risky').slice(0, total - final.length)];

    const main = final.slice(0, maxMain);
    const bonus = final.slice(maxMain, maxMain + maxBonus);

    const { data: newChild } = await supabaseServiceRoleClient.from('t_paths').insert({
      user_id: userId, parent_t_path_id: tPathId, template_name: workoutName.trim(), is_bonus: true, settings: tPathData.settings, gym_id: activeGymId
    }).select('id').single();
    
    const payload = [
      ...main.map((ex, i) => ({ template_id: newChild.id, exercise_id: ex.id, order_index: i, is_bonus_exercise: false })),
      ...bonus.map((ex, i) => ({ template_id: newChild.id, exercise_id: ex.id, order_index: main.length + i, is_bonus_exercise: true }))
    ];
    await supabaseServiceRoleClient.from('t_path_exercises').insert(payload);
    regenerationSummary.workouts.push({ workoutName, exercises: main.map(ex => ex.name) });
  }
  return regenerationSummary;
}

const getSupabaseServiceRoleClient = () => {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const supabase = getSupabaseServiceRoleClient();
  let userId = null;
  
  try {
    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(authHeader!.split(' ')[1]);
    userId = user!.id;
    
    await supabase.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);
    const { tPathType, experience, goalFocus, preferredMuscles, constraints, sessionLength, equipmentMethod, gymName, confirmedExercises, fullName, heightCm, weightKg, bodyFatPct, gymId: providedGymId } = await req.json();
    
    const { data: existingTPaths } = await supabase.from('t_paths').select('id, template_name, parent_t_path_id').eq('user_id', userId);
    if (existingTPaths && existingTPaths.length > 0) {
      const childIds = existingTPaths.filter((tp: any) => tp.parent_t_path_id !== null).map((tp: any) => tp.id);
      const mainIds = existingTPaths.filter((tp: any) => tp.parent_t_path_id === null).map((tp: any) => tp.id);
      if (childIds.length > 0) {
        await supabase.from('t_path_exercises').delete().in('template_id', childIds);
        await supabase.from('t_paths').delete().in('id', childIds);
      }
      if (mainIds.length > 0) await supabase.from('t_paths').delete().in('id', mainIds);
    }
    
    let newGymId: string;
    if (providedGymId) {
      newGymId = providedGymId;
    } else {
      const { data: existingGyms } = await supabase.from('gyms').select('id').eq('user_id', userId).order('created_at', { ascending: false });
      if (existingGyms && existingGyms.length > 0) {
        newGymId = existingGyms[0].id;
      } else {
        const { data: insertedGym } = await supabase.from('gyms').insert({ user_id: userId, name: gymName || "My Gym" }).select('id').single();
        newGymId = insertedGym!.id;
      }
    }
    
    const mainTPathId = await getOrCreateMainTPath(supabase, userId, tPathType, { primary_goal: goalFocus, preferred_muscles: preferredMuscles, health_notes: constraints });
    
    const exerciseIdsToLink = new Set<string>();
    const newExercisesToCreate: any[] = [];
    for (const ex of confirmedExercises || []){
      if (ex.existing_id) exerciseIdsToLink.add(ex.existing_id);
      else newExercisesToCreate.push({ name: ex.name, main_muscle: ex.main_muscle, type: ex.type, category: ex.category, description: ex.description, pro_tip: ex.pro_tip, video_url: ex.video_url, icon_url: ex.icon_url, user_id: userId, created_at: new Date().toISOString(), movement_type: ex.movement_type, movement_pattern: ex.movement_pattern });
    }
    if (newExercisesToCreate.length > 0) {
      const { data: inserted } = await supabase.from('exercise_definitions').insert(newExercisesToCreate).select('id');
      inserted?.forEach((ex: any) => exerciseIdsToLink.add(ex.id));
    }
    if (exerciseIdsToLink.size > 0) {
      await supabase.from('gym_exercises').insert(Array.from(exerciseIdsToLink).map(id => ({ gym_id: newGymId, exercise_id: id })));
    }
    
    const nameParts = fullName.split(' ');
    const profileData = { id: userId, first_name: nameParts.shift() || '', last_name: nameParts.join(' ') || '', full_name: fullName, height_cm: heightCm, weight_kg: weightKg, body_fat_pct: bodyFatPct, preferred_muscles: preferredMuscles, primary_goal: goalFocus, health_notes: constraints, default_rest_time_seconds: 60, preferred_session_length: sessionLength, active_t_path_id: mainTPathId, active_gym_id: newGymId, programme_type: tPathType };
    await supabase.from('profiles').upsert(profileData);
    
    const summary = await generateWorkoutPlanForTPath(supabase, userId, mainTPathId, sessionLength, newGymId, { health_notes: constraints || null, preferred_muscles: preferredMuscles || null });
    
    await supabase.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null, t_path_generation_summary: summary }).eq('id', userId);
    
    const { data: mainTPath } = await supabase.from('t_paths').select('*').eq('id', mainTPathId).single();
    const { data: childWorkouts } = await supabase.from('t_paths').select('*, t_path_exercises(*, exercise_definitions(*))').eq('parent_t_path_id', mainTPathId).eq('gym_id', newGymId);
    
    const transformedWorkouts = (childWorkouts || []).map((w: any) => ({
      ...w, workout_name: w.template_name,
      exercises: (w.t_path_exercises || []).map((tpe: any) => ({ ...tpe.exercise_definitions, is_bonus_exercise: tpe.is_bonus_exercise })).filter(Boolean)
    }));

    return new Response(JSON.stringify({ message: 'Success', profile: profileData, mainTPath, childWorkouts: transformedWorkouts, identifiedExercises: confirmedExercises }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    if (userId) await supabase.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: error.message }).eq('id', userId);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
