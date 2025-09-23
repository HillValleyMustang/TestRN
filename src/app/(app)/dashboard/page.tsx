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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Profile = Tables<'profiles'>;

export default function DashboardPage() {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const router = useRouter();
  const { groupedTPaths, loadingData: loadingWorkoutData, profile, loadingData: loadingProfile, workoutExercisesCache, dataError } = useWorkoutDataFetcher(); // Corrected destructuring to include workoutExercisesCache and dataError
  const { loadingGyms, userGyms, activeGym } = useGym(); // NEW: Destructure from useGym hook
  
  const [welcomeName, setWelcomeName] = useState<string>('');

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);

  const handleViewSummary = (sessionId: string) => {
    setSummarySessionId(sessionId);
    setShowSummaryModal(true);
  };

  useEffect(() => {
    if (!memoizedSessionUserId) {
      router.push('/login');
      return;
    }

    if (profile) {
      const name = profile.full_name || profile.first_name || 'Athlete';
      setWelcomeName(name);
    } else if (!loadingProfile && !profile) { // If not loading and still no profile, they need to onboard
      router.push('/onboarding');
    }
  }, [memoizedSessionUserId, router, profile, loadingProfile]);

  if (!memoizedSessionUserId) return null;

  // Show full-page skeleton until profile is loaded
  if (loadingProfile || !profile) {
    return (
      <div className="flex flex-col gap-6 p-2 sm:p-4">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">Welcome Back, <Skeleton className="inline-block h-8 w-32" /></h1>
          <div className="text-muted-foreground mt-2"><Skeleton className="h-4 w-48" /></div>
        </header>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Once profile is loaded, render the main dashboard content
  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      <header className="animate-fade-in-slide-up" style={{ animationDelay: '0s' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome Back, {welcomeName}</h1>
            <p className="text-muted-foreground mt-2">Ready to Train? Let's get Started!</p>
          </div>
        </div>
      </header>

      {!loadingGyms && userGyms.length > 1 && (
        <div className="flex justify-center animate-fade-in-slide-up" style={{ animationDelay: '0.05s' }}>
          <GymToggle />
        </div>
      )}

      {/* These cards now handle their own internal loading/empty/unconfigured states */}
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <NextWorkoutCard 
          profile={profile}
          groupedTPaths={groupedTPaths}
          loadingPlans={loadingWorkoutData}
          activeGym={activeGym}
          loadingGyms={loadingGyms}
          // No need to pass workoutExercisesCache here, it's accessed internally by NextWorkoutCard
        />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.15s' }}>
        <AllWorkoutsQuickStart 
          profile={profile}
          groupedTPaths={groupedTPaths}
          loadingPlans={loadingWorkoutData}
          activeGym={activeGym}
          loadingGyms={loadingGyms}
          workoutExercisesCache={workoutExercisesCache} // NEW: Pass workoutExercisesCache
          dataError={dataError} // NEW: Pass dataError
        />
      </div>

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