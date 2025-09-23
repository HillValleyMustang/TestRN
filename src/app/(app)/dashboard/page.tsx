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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Profile = Tables<'profiles'>;

export default function DashboardPage() {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const router = useRouter();
  const { userGyms, activeGym, loadingGyms } = useGym();
  const { groupedTPaths, loadingData: loadingWorkoutData, profile, loadingData: loadingProfile } = useWorkoutDataFetcher();
  
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
    } else if (!loadingProfile) {
      // If not loading and still no profile, they need to onboard
      router.push('/onboarding');
    }
  }, [memoizedSessionUserId, router, profile, loadingProfile]);

  const isGymConfigured = useMemo(() => {
    if (loadingWorkoutData || !activeGym) return false; 
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths, loadingWorkoutData]);

  const overallLoading = loadingProfile || loadingGyms || loadingWorkoutData;

  if (!memoizedSessionUserId) return null;

  // Case 1: No active gym found after loading
  if (!activeGym && !overallLoading) {
    return (
      <div className="flex flex-col gap-6 p-2 sm:p-4">
        <header className="animate-fade-in-slide-up">
          <h1 className="text-4xl font-bold tracking-tight">Welcome, {welcomeName}</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              You don't have any gyms set up yet. Go to your profile to add your first gym and create a workout plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/profile')}>Go to Profile Settings</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 2: Still loading, show a general loading state for the main content area
  if (overallLoading) {
    return (
      <div className="flex flex-col gap-6 p-2 sm:p-4">
        <header className="animate-fade-in-slide-up">
          <h1 className="text-4xl font-bold tracking-tight">Welcome Back, {welcomeName}</h1>
          <p className="text-muted-foreground mt-2">Ready to Train? Let's get Started!</p>
        </header>
        {!loadingGyms && userGyms.length > 1 && (
          <div className="flex justify-center animate-fade-in-slide-up" style={{ animationDelay: '0.05s' }}>
            <GymToggle />
          </div>
        )}
        <Skeleton className="h-48 w-full animate-fade-in-slide-up" style={{ animationDelay: '0.1s' }} />
        <Skeleton className="h-48 w-full animate-fade-in-slide-up" style={{ animationDelay: '0.15s' }} />
        <Skeleton className="h-48 w-full animate-fade-in-slide-up" style={{ animationDelay: '0.2s' }} />
        <Skeleton className="h-48 w-full animate-fade-in-slide-up" style={{ animationDelay: '0.3s' }} />
        <Skeleton className="h-48 w-full animate-fade-in-slide-up" style={{ animationDelay: '0.4s' }} />
      </div>
    );
  }

  // Case 3: All data loaded, activeGym exists, but it's unconfigured
  if (!isGymConfigured && activeGym) {
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
        <UnconfiguredGymPrompt gymName={activeGym.name} />
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

  // Case 4: All data loaded, activeGym exists, and it's configured
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

      <>
        <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.1s' }}>
          <NextWorkoutCard />
        </div>
        <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.15s' }}>
          <AllWorkoutsQuickStart />
        </div>
      </>

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