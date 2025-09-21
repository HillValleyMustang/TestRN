"use client";

import { useEffect, useState, useMemo } from 'react';
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
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal';
import { GymToggle } from '@/components/dashboard/gym-toggle';
import { useGym } from '@/components/gym-context-provider';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';
import { UnconfiguredGymPrompt } from '@/components/prompts/unconfigured-gym-prompt';

type Profile = Tables<'profiles'>;

export default function DashboardPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const { userGyms, activeGym, loadingGyms } = useGym();
  const { groupedTPaths, loadingData: loadingWorkoutData } = useWorkoutDataFetcher();
  
  const [welcomeName, setWelcomeName] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

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
      setLoadingProfile(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        if (!profileData) {
          router.push('/onboarding');
          return;
        }

        setProfile(profileData as Profile);
        const name = profileData.full_name || profileData.first_name || 'Athlete';
        setWelcomeName(name);

      } catch (err: any) {
        console.error("Error checking onboarding status:", err);
        toast.error("Error loading dashboard.");
      } finally {
        setLoadingProfile(false);
      }
    };

    checkOnboardingStatus();
  }, [session, router, supabase]);

  const isGymConfigured = useMemo(() => {
    // Only determine if gym is configured once all workout data has finished loading.
    if (loadingWorkoutData) return false; 
    if (!activeGym || groupedTPaths.length === 0) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths, loadingWorkoutData]);

  const loading = loadingProfile || loadingGyms || loadingWorkoutData;

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

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      <header className="animate-fade-in-slide-up" style={{ animationDelay: '0s' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome Back, {welcomeName}</h1>
            <p className="text-muted-foreground mt-2">Ready to Train? Let's get Started!</p>
          </div>
          {/* GymToggle is now moved out of here */}
        </div>
      </header>

      {/* NEW: GymToggle placement */}
      {!loadingGyms && userGyms.length > 1 && ( // Only show if there are multiple gyms and not loading
        <div className="flex justify-center animate-fade-in-slide-up" style={{ animationDelay: '0.05s' }}>
          <GymToggle />
        </div>
      )}

      {activeGym && !isGymConfigured ? ( // Only show prompt if activeGym exists and is not configured
        <UnconfiguredGymPrompt gymName={activeGym.name} />
      ) : (
        <>
          <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.1s' }}>
            <NextWorkoutCard />
          </div>
          <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.15s' }}>
            <AllWorkoutsQuickStart />
          </div>
        </>
      )}

      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.2s' }}>
        <ActionHub />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.3s' }}>
        <WeeklyVolumeChart />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.4s' }}>
        <PreviousWorkoutsCard onViewSummary={handleViewSummary} />
      </div>
      <WorkoutSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        sessionId={summarySessionId}
      />
    </div>
  );
}