"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

export function StreakPill() {
  const { session, supabase } = useSession();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreakData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('current_streak')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          throw error;
        }

        setStreak(profileData?.current_streak || 0);
      } catch (error) {
        console.error("Failed to fetch streak data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [session, supabase]);

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