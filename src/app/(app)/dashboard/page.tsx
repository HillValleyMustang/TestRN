"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ActionHub } from '@/components/dashboard/action-hub';
import { WeeklyVolumeChart } from '@/components/dashboard/weekly-volume-chart';
import { NextWorkoutCard } from '@/components/dashboard/next-workout-card';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = Tables<'profiles'>;

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [welcomeName, setWelcomeName] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        // Check if user has completed onboarding
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, active_t_path_id, body_fat_pct, created_at, default_rest_time_seconds, full_name, health_notes, height_cm, id, last_ai_coach_use_at, preferred_distance_unit, preferred_muscles, preferred_session_length, preferred_weight_unit, primary_goal, target_date, updated_at, weight_kg') // Specify all columns required by Profile
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (!profileData) {
          // Redirect to onboarding if no profile exists
          router.push('/onboarding');
          return;
        }

        setProfile(profileData as Profile); // Explicitly cast

        // Check if user has T-Paths
        const { data: tPaths, error: tPathError } = await supabase
          .from('t_paths')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        if (tPathError) {
          throw tPathError;
        }

        if (!tPaths || tPaths.length === 0) {
          // Redirect to onboarding if no T-Paths exist
          router.push('/onboarding');
          return;
        }

        // Set welcome name
        const firstName = profileData.first_name;
        if (firstName) {
          setWelcomeName(firstName);
        } else {
          const userInitials = `${profileData.first_name ? profileData.first_name[0] : ''}${profileData.last_name ? profileData.last_name[0] : ''}`.toUpperCase();
          setWelcomeName(`Athlete ${userInitials || session.user?.email?.[0].toUpperCase() || ''}`);
        }

      } catch (err: any) {
        console.error("Error checking onboarding status:", err);
        toast.error("Error loading dashboard: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [session, router, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </header>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Welcome Back, {welcomeName}</h1>
        <p className="text-muted-foreground mt-2">Ready to Train? Let's get Started!</p>
      </header>

      <NextWorkoutCard />
      <ActionHub />
      <WeeklyVolumeChart />

      <MadeWithDyad />
    </div>
  );
}