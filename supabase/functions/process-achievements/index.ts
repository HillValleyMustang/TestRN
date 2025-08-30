// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Achievement IDs
const ACHIEVEMENT_IDS = {
  FIRST_WORKOUT: 'first_workout',
  TEN_DAY_STREAK: 'ten_day_streak',
  TWENTY_FIVE_WORKOUTS: 'twenty_five_workouts',
  FIFTY_WORKOUTS: 'fifty_workouts',
  PERFECT_WEEK: 'perfect_week',
  BEAST_MODE: 'beast_mode',
  // New Achievement IDs
  WEEKEND_WARRIOR: 'weekend_warrior',
  EARLY_BIRD: 'early_bird',
  THIRTY_DAY_STREAK: 'thirty_day_streak',
  VOLUME_MASTER: 'volume_master',
};

// Define types for the data we're fetching
interface WorkoutSession {
  id: string;
  session_date: string;
  template_name: string | null;
  user_id: string;
}

interface Profile {
  id: string;
  total_points: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  active_t_path_id: string | null;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at?: string | null; // Added unlocked_at property
}

// Helper function to initialize Supabase client with service role key
const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Achievement Checkers
const checkAchievement = async (
  supabase: any,
  userId: string,
  achievementId: string,
  criteriaMet: boolean,
  existingAchievements: Set<string>
): Promise<string | null> => {
  if (!criteriaMet || existingAchievements.has(achievementId)) {
    return null;
  }
  const { error: insertError } = await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: achievementId });
  if (insertError) {
    console.error(`Error unlocking achievement ${achievementId} for user ${userId}:`, insertError.message);
    return null;
  }
  return achievementId;
};

const checkFirstWorkout = async (
  supabase: any,
  userId: string,
  totalWorkouts: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.FIRST_WORKOUT, totalWorkouts >= 1, existingAchievements);
};

const check10DayStreak = async (
  supabase: any,
  userId: string,
  currentStreak: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.TEN_DAY_STREAK, currentStreak >= 10, existingAchievements);
};

// New: Check for 30-day streak
const check30DayStreak = async (
  supabase: any,
  userId: string,
  currentStreak: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.THIRTY_DAY_STREAK, currentStreak >= 30, existingAchievements);
};

const check25Workouts = async (
  supabase: any,
  userId: string,
  totalWorkouts: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.TWENTY_FIVE_WORKOUTS, totalWorkouts >= 25, existingAchievements);
};

const check50Workouts = async (
  supabase: any,
  userId: string,
  totalWorkouts: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.FIFTY_WORKOUTS, totalWorkouts >= 50, existingAchievements);
};

const checkBeastMode = async (
  supabase: any,
  userId: string,
  allWorkoutSessions: WorkoutSession[],
  existingAchievements: Set<string>
) => {
  const sessionsByDate = new Map<string, number>();
  allWorkoutSessions.forEach(sessionItem => {
    const dateKey = new Date(sessionItem.session_date).toISOString().split('T')[0];
    sessionsByDate.set(dateKey, (sessionsByDate.get(dateKey) || 0) + 1);
  });
  const beastModeAchieved = Array.from(sessionsByDate.values()).some(count => count >= 2);
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.BEAST_MODE, beastModeAchieved, existingAchievements);
};

const checkPerfectWeek = async (
  supabase: any,
  userId: string,
  allWorkoutSessions: WorkoutSession[],
  activeTPathId: string | null,
  existingAchievements: Set<string>
) => {
  if (!activeTPathId) return null;

  const { data: tpathData, error: tpathError } = await supabase.from('t_paths').select('settings').eq('id', activeTPathId).single();
  if (tpathError || !tpathData?.settings) {
    console.error("Error fetching active T-Path settings for Perfect Week:", tpathError);
    return null;
  }
  const activeTPathType = (tpathData.settings as { tPathType: string }).tPathType;

  let requiredWorkoutNames: string[] = [];
  if (activeTPathType === 'ulul') {
    requiredWorkoutNames = ['Upper Body A', 'Upper Body B', 'Lower Body A', 'Lower Body B'];
  } else if (activeTPathType === 'ppl') {
    requiredWorkoutNames = ['Push', 'Pull', 'Legs'];
  }

  if (requiredWorkoutNames.length === 0) return null;

  const sessionsByDate = new Map<string, WorkoutSession[]>();
  allWorkoutSessions.forEach(sessionItem => {
    const dateKey = new Date(sessionItem.session_date).toISOString().split('T')[0];
    if (!sessionsByDate.has(dateKey)) {
      sessionsByDate.set(dateKey, []);
    }
    sessionsByDate.get(dateKey)?.push(sessionItem);
  });

  const sortedDates = Array.from(sessionsByDate.keys()).sort();
  let perfectWeekAchieved = false;

  for (let i = 0; i < sortedDates.length; i++) {
    const startDate = new Date(sortedDates[i]);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 7-day window (inclusive)

    const workoutsInWindow = new Set<string>();
    for (let j = i; j < sortedDates.length; j++) {
      const currentDate = new Date(sortedDates[j]);
      if (currentDate <= endDate) {
        sessionsByDate.get(sortedDates[j])?.forEach(sessionItem => {
          if (sessionItem.template_name) {
            workoutsInWindow.add(sessionItem.template_name);
          }
        });
      } else {
        break;
      }
    }

    const allRequiredFound = requiredWorkoutNames.every(requiredName => workoutsInWindow.has(requiredName));
    if (allRequiredFound) {
      perfectWeekAchieved = true;
      break;
    }
  }
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.PERFECT_WEEK, perfectWeekAchieved, existingAchievements);
};

// New: Check for Weekend Warrior
const checkWeekendWarrior = async (
  supabase: any,
  userId: string,
  allWorkoutSessions: WorkoutSession[],
  existingAchievements: Set<string>
) => {
  const weekendWorkouts = allWorkoutSessions.filter(sessionItem => {
    const date = new Date(sessionItem.session_date);
    const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
  }).length;
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.WEEKEND_WARRIOR, weekendWorkouts >= 10, existingAchievements);
};

// New: Check for Early Bird
const checkEarlyBird = async (
  supabase: any,
  userId: string,
  allWorkoutSessions: WorkoutSession[],
  existingAchievements: Set<string>
) => {
  const earlyBirdWorkouts = allWorkoutSessions.filter(sessionItem => {
    const date = new Date(sessionItem.session_date);
    const hour = date.getHours();
    return hour < 8; // Before 8 AM
  }).length;
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.EARLY_BIRD, earlyBirdWorkouts >= 10, existingAchievements);
};

// New: Check for Volume Master
const checkVolumeMaster = async (
  supabase: any,
  userId: string,
  totalSets: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.VOLUME_MASTER, totalSets >= 100, existingAchievements);
};


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRoleClient = getSupabaseServiceRoleClient();

    const { user_id, session_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all existing achievements for the user
    const { data: existingUserAchievements, error: fetchAchievementsError } = await supabaseServiceRoleClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user_id);

    if (fetchAchievementsError) throw fetchAchievementsError;
    const existingAchievementIds = new Set((existingUserAchievements as UserAchievement[] || []).map(a => a.achievement_id));

    // Fetch all workout sessions and profile data for achievement checks
    const { data: allWorkoutSessions, error: allSessionsError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('id, session_date, template_name, user_id')
      .eq('user_id', user_id);
    if (allSessionsError) throw allSessionsError;

    const { data: profileData, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('total_points, current_streak, longest_streak, active_t_path_id')
      .eq('id', user_id)
      .single();
    if (profileError) throw profileError;

    // Fetch all set logs for the user to count total sets
    const { data: allSetLogs, error: allSetLogsError } = await supabaseServiceRoleClient
      .from('set_logs')
      .select('id, workout_sessions!inner(user_id)') // Join with workout_sessions to filter by user_id
      .eq('workout_sessions.user_id', user_id);
    if (allSetLogsError) throw allSetLogsError;
    const totalSets = allSetLogs?.length || 0;

    const totalWorkouts = (profileData?.total_points || 0) / 10; // 10 points per workout
    const currentStreak = profileData?.current_streak || 0;
    const activeTPathId = profileData?.active_t_path_id || null;

    // Run all achievement checks
    const achievementChecks = [
      checkFirstWorkout(supabaseServiceRoleClient, user_id, totalWorkouts, existingAchievementIds),
      check10DayStreak(supabaseServiceRoleClient, user_id, currentStreak, existingAchievementIds),
      check30DayStreak(supabaseServiceRoleClient, user_id, currentStreak, existingAchievementIds), // New check
      check25Workouts(supabaseServiceRoleClient, user_id, totalWorkouts, existingAchievementIds),
      check50Workouts(supabaseServiceRoleClient, user_id, totalWorkouts, existingAchievementIds),
      checkBeastMode(supabaseServiceRoleClient, user_id, allWorkoutSessions as WorkoutSession[] || [], existingAchievementIds),
      checkPerfectWeek(supabaseServiceRoleClient, user_id, allWorkoutSessions as WorkoutSession[] || [], activeTPathId, existingAchievementIds),
      checkWeekendWarrior(supabaseServiceRoleClient, user_id, allWorkoutSessions as WorkoutSession[] || [], existingAchievementIds), // New check
      checkEarlyBird(supabaseServiceRoleClient, user_id, allWorkoutSessions as WorkoutSession[] || [], existingAchievementIds),     // New check
      checkVolumeMaster(supabaseServiceRoleClient, user_id, totalSets, existingAchievementIds), // New check
    ];

    const results = await Promise.all(achievementChecks);
    const newlyUnlockedAchievementIds = results.filter((id): id is string => id !== null);

    // If a session_id was provided, we only return achievements unlocked *during that session*
    // This requires a second fetch to filter by unlocked_at after the session_date
    let sessionSpecificAchievements: string[] = [];
    if (session_id && newlyUnlockedAchievementIds.length > 0) {
      const { data: sessionAchievements, error: sessionAchError } = await supabaseServiceRoleClient
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user_id)
        .in('achievement_id', newlyUnlockedAchievementIds)
        .order('unlocked_at', { ascending: true });

      if (sessionAchError) throw sessionAchError;

      const { data: sessionDetails, error: sessionDetailsError } = await supabaseServiceRoleClient
        .from('workout_sessions')
        .select('session_date')
        .eq('id', session_id)
        .single();

      if (sessionDetailsError || !sessionDetails) throw sessionDetailsError;

      const sessionStartDate = new Date(sessionDetails.session_date);
      // Filter achievements unlocked very close to the session start time
      sessionSpecificAchievements = (sessionAchievements || []).filter((ach: UserAchievement) => { // Explicitly typed ach
        const unlockedAt = new Date(ach.unlocked_at!);
        // Allow a small window (e.g., 5 minutes) around session start for achievements
        return unlockedAt >= sessionStartDate && unlockedAt.getTime() <= (sessionStartDate.getTime() + 5 * 60 * 1000);
      }).map((ach: UserAchievement) => ach.achievement_id); // Explicitly typed ach
    } else if (!session_id) {
      // If no session_id, return all newly unlocked achievements
      sessionSpecificAchievements = newlyUnlockedAchievementIds;
    }

    return new Response(
      JSON.stringify({ newlyUnlockedAchievementIds: sessionSpecificAchievements }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in process-achievements edge function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});