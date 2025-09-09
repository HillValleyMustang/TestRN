// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1';

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
  // New achievements from user request
  CENTURY_CLUB: 'century_club',
  AI_APPRENTICE: 'ai_apprentice',
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

// Helper to log user-specific errors
const logUserAlert = async (supabase: any, userId: string, title: string, message: string, type: string = 'system_error') => {
  const { error: insertAlertError } = await supabase.from('user_alerts').insert({
    id: uuidv4(),
    user_id: userId,
    title: title,
    message: message,
    type: type,
    created_at: new Date().toISOString(),
    is_read: false,
  });
  if (insertAlertError) {
    console.error(`Failed to log user alert for user ${userId}:`, insertAlertError.message);
  }
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
    await logUserAlert(supabase, userId, "Achievement Processing Error", `Failed to unlock achievement '${achievementId}'. Please contact support if this persists.`, "achievement_error");
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
    await logUserAlert(supabase, userId, "Achievement Processing Error", "Failed to check 'Perfect Week' achievement due to T-Path data issues.", "achievement_error");
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

const checkVolumeMaster = async (
  supabase: any,
  userId: string,
  totalSets: number,
  existingAchievements: Set<string>
) => {
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.VOLUME_MASTER, totalSets >= 100, existingAchievements);
};

// New: Check for Century Club
const checkCenturyClub = async (
  supabase: any,
  userId: string,
  totalPoints: number,
  existingAchievements: Set<string>
) => {
  // 100 workouts = 1000 total_points
  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.CENTURY_CLUB, totalPoints >= 1000, existingAchievements);
};

// New: Check for AI Apprentice
const checkAIApprentice = async (
  supabase: any,
  userId: string,
  existingAchievements: Set<string>
) => {
  // Check for at least one use per week across 3 consecutive weeks.
  const { data: usageLogs, error: fetchUsageError } = await supabase
    .from('ai_coach_usage_logs')
    .select('used_at')
    .eq('user_id', userId)
    .order('used_at', { ascending: true });

  if (fetchUsageError) {
    console.error("Error fetching AI coach usage logs for AI Apprentice:", fetchUsageError.message);
    await logUserAlert(supabase, userId, "Achievement Processing Error", "Failed to check 'AI Apprentice' achievement due to AI usage data issues.", "achievement_error");
    return null;
  }

  if (!usageLogs || usageLogs.length === 0) {
    return null;
  }

  const weeklyUsage = new Map<string, boolean>(); // 'YYYY-WW' -> has_used_this_week
  usageLogs.forEach((log: { used_at: string }) => {
    const date = new Date(log.used_at);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - (date.getDay() + 6) % 7); // Adjust to Monday
    startOfWeek.setHours(0, 0, 0, 0);
    const weekKey = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD for start of week
    weeklyUsage.set(weekKey, true);
  });

  const sortedWeeks = Array.from(weeklyUsage.keys()).sort();
  let consecutiveWeeks = 0;

  if (sortedWeeks.length > 0) {
    let prevWeekDate = new Date(sortedWeeks[0]);
    consecutiveWeeks = 1; // Start with the first week

    for (let i = 1; i < sortedWeeks.length; i++) {
      const currentWeekDate = new Date(sortedWeeks[i]);
      const diffDays = (currentWeekDate.getTime() - prevWeekDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays <= 7) { // If current week is same as or immediately after previous week
        consecutiveWeeks++;
      } else {
        consecutiveWeeks = 1; // Reset if gap found
      }

      if (consecutiveWeeks >= 3) {
        break; // Found 3 consecutive weeks
      }
      prevWeekDate = currentWeekDate;
    }
  }

  return await checkAchievement(supabase, userId, ACHIEVEMENT_IDS.AI_APPRENTICE, consecutiveWeeks >= 3, existingAchievements);
};


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let userId: string | null = null; // Declare userId here to be accessible in catch block

  try {
    const { user_id, session_id } = await req.json();
    userId = user_id; // Assign to outer scope userId

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all existing achievements for the user
    const { data: existingUserAchievements, error: fetchAchievementsError } = await supabaseServiceRoleClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (fetchAchievementsError) throw fetchAchievementsError;
    const existingAchievementIds = new Set((existingUserAchievements as UserAchievement[] || []).map(a => a.achievement_id));

    // Fetch all workout sessions and profile data for achievement checks
    const { data: allWorkoutSessions, error: allSessionsError } = await supabaseServiceRoleClient
      .from('workout_sessions')
      .select('id, session_date, template_name, user_id')
      .eq('user_id', userId);
    if (allSessionsError) throw allSessionsError;

    const { data: profileData, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('total_points, current_streak, longest_streak, active_t_path_id')
      .eq('id', userId)
      .single();
    if (profileError) throw profileError;

    // Fetch all set logs for the user to count total sets
    const { data: allSetLogs, error: allSetLogsError } = await supabaseServiceRoleClient
      .from('set_logs')
      .select('id, workout_sessions!inner(user_id)') // Join with workout_sessions to filter by user_id
      .eq('workout_sessions.user_id', userId);
    if (allSetLogsError) throw allSetLogsError;
    const totalSets = allSetLogs?.length || 0;

    const totalWorkouts = (profileData?.total_points || 0) / 10; // 10 points per workout
    const currentStreak = profileData?.current_streak || 0;
    const activeTPathId = profileData?.active_t_path_id || null;
    const totalPoints = profileData?.total_points || 0; // For Century Club

    // Run all achievement checks
    const achievementChecks = [
      checkFirstWorkout(supabaseServiceRoleClient, userId, totalWorkouts, existingAchievementIds),
      check10DayStreak(supabaseServiceRoleClient, userId, currentStreak, existingAchievementIds),
      check30DayStreak(supabaseServiceRoleClient, userId, currentStreak, existingAchievementIds),
      check25Workouts(supabaseServiceRoleClient, userId, totalWorkouts, existingAchievementIds),
      check50Workouts(supabaseServiceRoleClient, userId, totalWorkouts, existingAchievementIds),
      checkBeastMode(supabaseServiceRoleClient, userId, allWorkoutSessions as WorkoutSession[] || [], existingAchievementIds),
      checkPerfectWeek(supabaseServiceRoleClient, userId, allWorkoutSessions as WorkoutSession[] || [], activeTPathId, existingAchievementIds),
      checkWeekendWarrior(supabaseServiceRoleClient, userId, allWorkoutSessions as WorkoutSession[] || [], existingAchievementIds),
      checkEarlyBird(supabaseServiceRoleClient, userId, allWorkoutSessions as WorkoutSession[] || [], existingAchievementIds),
      checkVolumeMaster(supabaseServiceRoleClient, userId, totalSets, existingAchievementIds),
      checkCenturyClub(supabaseServiceRoleClient, userId, totalPoints, existingAchievementIds), // New check
      checkAIApprentice(supabaseServiceRoleClient, userId, existingAchievementIds), // New check
    ];

    const results = await Promise.all(achievementChecks);
    const newlyUnlockedAchievementIds = results.filter((id): id is string => id !== null);

    // --- NEW: Invoke calculate-rolling-status Edge Function ---
    const { error: rollingStatusInvokeError } = await supabaseServiceRoleClient.functions.invoke('calculate-rolling-status', {
      body: { user_id: userId },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (rollingStatusInvokeError) {
      console.error('Error invoking calculate-rolling-status Edge Function:', rollingStatusInvokeError.message);
      await logUserAlert(supabaseServiceRoleClient, userId, "System Update Error", "Failed to update your rolling workout status. Your achievements might be affected.", "system_error");
      // Do not throw, as achievement processing should still complete
    }
    // --- END NEW ---

    // If a session_id was provided, we only return achievements unlocked *during that session*
    // This requires a second fetch to filter by unlocked_at after the session_date
    let sessionSpecificAchievements: string[] = [];
    if (session_id && newlyUnlockedAchievementIds.length > 0) {
      const { data: sessionAchievements, error: sessionAchError } = await supabaseServiceRoleClient
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
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
      // Allow a small window (e.g., 5 minutes) around session start for achievements
      sessionSpecificAchievements = (sessionAchievements || []).filter((ach: UserAchievement) => { // Explicitly typed ach
        const unlockedAt = new Date(ach.unlocked_at!);
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
    if (userId) {
      await logUserAlert(supabaseServiceRoleClient, userId, "Achievement Processing Error", `An error occurred while processing your achievements: ${message}`, "system_error");
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});