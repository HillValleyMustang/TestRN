"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tables, Profile as ProfileType } from '@/types/supabase';
import { SupabaseClient, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getMaxMinutes } from '@/lib/utils';

type Profile = ProfileType;
type WorkoutSession = Tables<'workout_sessions'>;
type TPath = Tables<'t_paths'>;
type AiCoachUsageLog = Tables<'ai_coach_usage_logs'>;

interface AchievementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementId: string | null;
  isUnlocked: boolean;
  profile: Profile | null;
  session: Session | null;
  supabase: SupabaseClient;
  achievementInfo: { id: string; name: string; icon: string } | null;
}

// Achievement definitions (descriptions and progress logic)
const ACHIEVEMENT_DEFINITIONS: Record<string, {
  description: string;
  progressLogic?: (
    userId: string,
    profile: Profile,
    supabase: SupabaseClient,
    session: Session
  ) => Promise<string>;
}> = {
  'first_workout': {
    description: 'Complete your very first workout session.',
    progressLogic: async (userId, profile) => {
      const totalWorkouts = (profile.total_points || 0) / 10;
      return `Progress: ${totalWorkouts}/1 workout${totalWorkouts === 1 ? '' : 's'}`;
    }
  },
  'ai_apprentice': {
    description: 'Use the AI Coach at least once a week for 3 consecutive weeks.',
    progressLogic: async (userId, profile, supabase) => {
      const { data: usageLogs, error: fetchUsageError } = await supabase
        .from('ai_coach_usage_logs')
        .select('used_at')
        .eq('user_id', userId)
        .order('used_at', { ascending: true });

      if (fetchUsageError) {
        console.error("Error fetching AI coach usage logs for AI Apprentice:", fetchUsageError.message);
        return 'Progress: Error fetching data.';
      }

      if (!usageLogs || usageLogs.length === 0) {
        return 'Progress: 0/3 consecutive weeks, 0 uses.';
      }

      const weeklyUsage = new Map<string, boolean>(); // 'YYYY-WW' -> has_used_this_week
      usageLogs.forEach((log: { used_at: string | null }) => { // Corrected type here
        const date = new Date(log.used_at!);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - (date.getDay() + 6) % 7); // Adjust to Monday
        startOfWeek.setHours(0, 0, 0, 0);
        const weekKey = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD for start of week
        weeklyUsage.set(weekKey, true);
      });

      const sortedWeeks = Array.from(weeklyUsage.keys()).sort();
      let consecutiveWeeks = 0;
      let totalUses = usageLogs.length;

      if (sortedWeeks.length > 0) {
        let prevWeekDate = new Date(sortedWeeks[0]);
        consecutiveWeeks = 1;

        for (let i = 1; i < sortedWeeks.length; i++) {
          const currentWeekDate = new Date(sortedWeeks[i]);
          const diffDays = (currentWeekDate.getTime() - prevWeekDate.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays <= 7) {
            consecutiveWeeks++;
          } else {
            consecutiveWeeks = 1;
          }
          if (consecutiveWeeks >= 3) break;
          prevWeekDate = currentWeekDate;
        }
      }
      return `Progress: ${totalUses} uses, ${consecutiveWeeks}/3 consecutive weeks`;
    }
  },
  'ten_day_streak': {
    description: 'Achieve a workout streak of 10 consecutive days.',
    progressLogic: async (userId, profile) => `Progress: ${profile.current_streak || 0}/10 days`
  },
  'thirty_day_streak': {
    description: 'Achieve a workout streak of 30 consecutive days.',
    progressLogic: async (userId, profile) => `Progress: ${profile.current_streak || 0}/30 days`
  },
  'twenty_five_workouts': {
    description: 'Complete 25 workout sessions.',
    progressLogic: async (userId, profile) => {
      const totalWorkouts = (profile.total_points || 0) / 10;
      return `Progress: ${totalWorkouts}/25 workouts`;
    }
  },
  'fifty_workouts': {
    description: 'Complete 50 workout sessions.',
    progressLogic: async (userId, profile) => {
      const totalWorkouts = (profile.total_points || 0) / 10;
      return `Progress: ${totalWorkouts}/50 workouts`;
    }
  },
  'century_club': {
    description: 'Complete 100 workout sessions.',
    progressLogic: async (userId, profile) => {
      const totalWorkouts = (profile.total_points || 0) / 10;
      return `Progress: ${totalWorkouts}/100 workouts`;
    }
  },
  'perfect_week': {
    description: 'Complete all workouts in your active Transformation Path within a single week.',
    progressLogic: async (userId, profile, supabase) => {
      if (!profile.active_t_path_id) return 'Progress: No active T-Path set.';

      const { data: tpathData, error: tpathError } = await supabase.from('t_paths').select('settings').eq('id', profile.active_t_path_id).single();
      if (tpathError || !tpathData?.settings) return 'Progress: Error fetching T-Path details.';
      const activeTPathType = (tpathData.settings as { tPathType: string }).tPathType;

      let requiredWorkoutNames: string[] = [];
      if (activeTPathType === 'ulul') {
        requiredWorkoutNames = ['Upper Body A', 'Upper Body B', 'Lower Body A', 'Lower Body B'];
      } else if (activeTPathType === 'ppl') {
        requiredWorkoutNames = ['Push', 'Pull', 'Legs'];
      } else {
        return 'Progress: Unknown T-Path type.';
      }

      const { data: allWorkoutSessions, error: allSessionsError } = await supabase
        .from('workout_sessions')
        .select('session_date, template_name')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .limit(7); // Check recent 7 days for simplicity, or a more complex weekly grouping

      if (allSessionsError) return 'Progress: Error fetching workout sessions.';

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - (today.getDay() + 6) % 7); // Adjust to Monday
      startOfWeek.setHours(0, 0, 0, 0);

      const workoutsThisWeek = new Set<string>();
      (allWorkoutSessions || []).forEach(sessionItem => {
        const sessionDate = new Date(sessionItem.session_date);
        if (sessionDate >= startOfWeek && sessionItem.template_name) {
          workoutsThisWeek.add(sessionItem.template_name);
        }
      });

      const progressStatus = requiredWorkoutNames.map(name =>
        workoutsThisWeek.has(name) ? `${name} ✓` : `${name} ✗`
      ).join(', ');

      const completedCount = requiredWorkoutNames.filter(name => workoutsThisWeek.has(name)).length;
      return `Progress: ${completedCount}/${requiredWorkoutNames.length} workouts this week. (${progressStatus})`;
    }
  },
  'beast_mode': {
    description: 'Complete 2 or more workout sessions in a single day.',
    progressLogic: async (userId, profile, supabase) => {
      const today = new Date().toISOString().split('T')[0];
      const { data: workoutsToday, error: fetchError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_date', today);

      if (fetchError) return 'Progress: Error fetching data.';
      const count = workoutsToday?.length || 0;
      return `Progress: ${count}/2 workouts today.`;
    }
  },
  'weekend_warrior': {
    description: 'Complete 10 workout sessions on a Saturday or Sunday.',
    progressLogic: async (userId, profile, supabase) => {
      const { data: weekendWorkouts, error: fetchError } = await supabase
        .from('workout_sessions')
        .select('id, session_date')
        .eq('user_id', userId);

      if (fetchError) return 'Progress: Error fetching data.';

      const count = (weekendWorkouts || []).filter(sessionItem => {
        const date = new Date(sessionItem.session_date);
        const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
      }).length;
      return `Progress: ${count}/10 weekend workouts.`;
    }
  },
  'early_bird': {
    description: 'Complete 10 workout sessions before 8 AM.',
    progressLogic: async (userId, profile, supabase) => {
      const { data: earlyWorkouts, error: fetchError } = await supabase
        .from('workout_sessions')
        .select('id, session_date')
        .eq('user_id', userId);

      if (fetchError) return 'Progress: Error fetching data.';

      const count = (earlyWorkouts || []).filter(sessionItem => {
        const date = new Date(sessionItem.session_date);
        const hour = date.getHours();
        return hour < 8;
      }).length;
      return `Progress: ${count}/10 early bird workouts.`;
    }
  },
  'volume_master': {
    description: 'Log a total of 100 sets across all workouts.',
    progressLogic: async (userId, profile, supabase) => {
      const { data: totalSetsData, error: fetchError } = await supabase
        .from('set_logs')
        .select('id, workout_sessions!inner(user_id)')
        .eq('workout_sessions.user_id', userId);

      if (fetchError) return 'Progress: Error fetching data.';
      const count = totalSetsData?.length || 0;
      return `Progress: ${count}/100 sets logged.`;
    }
  },
};

export const AchievementDetailDialog = ({
  open,
  onOpenChange,
  achievementId,
  isUnlocked,
  profile,
  session,
  supabase,
  achievementInfo,
}: AchievementDetailDialogProps) => {
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [description, setDescription] = useState<string>('');
  const [progressText, setProgressText] = useState<string>('');
  const [unlockedDate, setUnlockedDate] = useState<string | null>(null);

  const fetchAchievementDetails = useCallback(async () => {
    if (!achievementId || !profile || !session || !supabase || !achievementInfo) {
      setLoadingDetails(false);
      return;
    }

    setLoadingDetails(true);
    try {
      const definition = ACHIEVEMENT_DEFINITIONS[achievementId];
      if (!definition) {
        setDescription('Achievement details not found.');
        setProgressText('');
        setUnlockedDate(null);
        return;
      }

      setDescription(definition.description);

      if (isUnlocked) {
        const { data: userAchievement, error } = await supabase
          .from('user_achievements')
          .select('unlocked_at')
          .eq('user_id', session.user.id)
          .eq('achievement_id', achievementId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (userAchievement?.unlocked_at) {
          setUnlockedDate(`Earned ${new Date(userAchievement.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
        } else {
          setUnlockedDate('Earned (Date Unknown)');
        }
        setProgressText(''); // No progress text for unlocked achievements
      } else {
        setUnlockedDate(null);
        if (definition.progressLogic) {
          const progress = await definition.progressLogic(session.user.id, profile, supabase, session);
          setProgressText(progress);
        } else {
          setProgressText('Progress tracking not available.');
        }
      }
    } catch (err: any) {
      console.error("Error fetching achievement details:", err);
      toast.error("Failed to load achievement details: " + err.message);
      setDescription('Failed to load details.');
      setProgressText('');
      setUnlockedDate(null);
    } finally {
      setLoadingDetails(false);
    }
  }, [achievementId, isUnlocked, profile, session, supabase, achievementInfo]);

  useEffect(() => {
    if (open) {
      fetchAchievementDetails();
    } else {
      // Reset states when dialog closes
      setDescription('');
      setProgressText('');
      setUnlockedDate(null);
      setLoadingDetails(true);
    }
  }, [open, fetchAchievementDetails]);

  if (!achievementInfo) return null; // Should not happen if triggered correctly

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{achievementInfo.icon}</span>
            {achievementInfo.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {loadingDetails ? (
            <div className="flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading details...
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{description}</p>
              {isUnlocked ? (
                <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {unlockedDate}
                </p>
              ) : (
                <p className="text-sm font-semibold text-primary flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" /> {progressText}
                </p>
              )}
            </>
          )}
        </div>
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </DialogContent>
    </Dialog>
  );
};