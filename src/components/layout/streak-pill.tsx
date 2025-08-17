"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

export function StreakPill() {
  const { session, supabase } = useSession();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const calculateStreak = useCallback((dates: string[]) => {
    if (dates.length === 0) return 0;

    const sortedUniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const mostRecentDate = new Date(sortedUniqueDates[0]);
    mostRecentDate.setHours(0, 0, 0, 0);

    const diffFromToday = Math.round((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffFromToday > 1) {
      return 0; // Streak is broken if the last activity was more than a day ago
    }

    currentStreak = 1;
    let lastDate = mostRecentDate;

    for (let i = 1; i < sortedUniqueDates.length; i++) {
      const currentDate = new Date(sortedUniqueDates[i]);
      currentDate.setHours(0, 0, 0, 0);
      const diff = Math.round((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
        lastDate = currentDate;
      } else if (diff > 1) {
        break; // Gap in dates, streak ends
      }
    }
    
    return currentStreak;
  }, []);

  useEffect(() => {
    const fetchStreakData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: workoutDates, error: workoutError } = await supabase.from('workout_sessions').select('session_date').eq('user_id', session.user.id);
        if (workoutError) throw workoutError;

        const { data: activityDates, error: activityError } = await supabase.from('activity_logs').select('log_date').eq('user_id', session.user.id);
        if (activityError) throw activityError;

        const allDates = [
          ...(workoutDates || []).map(d => d.session_date),
          ...(activityDates || []).map(d => d.log_date)
        ].map(d => new Date(d).toISOString().split('T')[0]);

        setStreak(calculateStreak(allDates));
      } catch (error) {
        console.error("Failed to fetch streak data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [session, supabase, calculateStreak]);

  if (loading || streak === 0) {
    return null; // Don't show if loading or streak is 0
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1 border-orange-500/50">
      <Flame className="h-4 w-4 text-orange-500" />
      <span className="font-semibold text-orange-600">{streak} day streak</span>
    </Badge>
  );
}