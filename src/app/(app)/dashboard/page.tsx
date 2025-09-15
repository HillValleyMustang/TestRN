"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { ActionHub } from '@/components/dashboard/action-hub';
import { WeeklyVolumeChart } from '@/components/dashboard/weekly-volume-chart';
import { NextWorkoutCard } from '@/components/dashboard/next-workout-card';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PreviousWorkoutsCard } from '@/components/dashboard/previous-workouts-card';
import { AllWorkoutsQuickStart } from '@/components/dashboard/all-workouts-quick-start';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal'; // Import the modal

type Profile = Tables<'profiles'>;

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [welcomeName, setWelcomeName] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);

  const handleViewSummary = (sessionId: string) => {
    setSummarySessionId(sessionId);
    setShowSummaryModal(true);
  };

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
          .select('first_name, last_name, active_t_path_id, body_fat_pct, created_at, default_rest_time_seconds, full_name, health_notes, height_cm, id, last_ai_coach_use_at, preferred_distance_unit, preferred_muscles, preferred_session_length, preferred_weight_unit, primary_goal, target_date, updated_at, weight_kg')
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

        setProfile(profileData as Profile);

        // Check if user has T-Paths
        const { data: tPaths, error: tPathError } = await supabase
          .from('t_paths')
          .select('id')
          .eq('user_id', session.user.id)
          .is('parent_t_path_id', null)
          .limit(1);

        if (tPathError) {
          throw tPathError;
        }

        if (!tPaths || tPaths.length === 0) {
          // Redirect to onboarding if no T-Paths exist
          router.push('/onboarding');
          return;
        }

        // Set welcome name based on initials
        const firstNameInitial = profileData.first_name ? profileData.first_name[0].toUpperCase() : '';
        const lastNameInitial = profileData.last_name ? profileData.last_name[0].toUpperCase() : '';
        const initials = `${firstNameInitial}${lastNameInitial}`;
        setWelcomeName(`Athlete ${initials}`);

      } catch (err: any) {
        console.error("Error checking onboarding status:", err);
        toast.info("Error loading dashboard.");
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [session, router, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-2 sm:p-4">
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
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      <header className="animate-fade-in-slide-up" style={{ animationDelay: '0s' }}>
        <h1 className="text-4xl font-bold tracking-tight">Welcome Back, {welcomeName}</h1>
        <p className="text-muted-foreground mt-2">Ready to Train? Let's get Started!</p>
      </header>

      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <NextWorkoutCard />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.15s' }}>
        <AllWorkoutsQuickStart />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.2s' }}>
        <ActionHub />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.3s' }}>
        <WeeklyVolumeChart />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.4s' }}>
        <PreviousWorkoutsCard onViewSummary={handleViewSummary} /> {/* Pass the handler */}
      </div>
      <WorkoutSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        sessionId={summarySessionId}
      />
    </div>
  );
}