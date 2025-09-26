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
import { formatAthleteName } from '@/lib/utils';
import { WeeklyTargetWidget } from '@/components/dashboard/weekly-target-widget';

type Profile = Tables<'profiles'>;

export default function DashboardPage() {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const router = useRouter();
  const { 
    groupedTPaths, 
    loadingData: loadingWorkoutData, 
    profile, 
    loadingData: loadingProfile, 
    workoutExercisesCache, 
    dataError,
    refreshAllData,
    weeklySummary,
    loadingWeeklySummary
  } = useWorkoutDataFetcher();
  const { loadingGyms, userGyms, activeGym } = useGym();
  
  const [welcomeText, setWelcomeText] = useState<string>('');
  const [athleteName, setAthleteName] = useState<string>('');

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
      const formattedName = formatAthleteName(profile.full_name || profile.first_name);
      setAthleteName(formattedName);

      // Determine 'Welcome' vs 'Welcome Back'
      const now = new Date();
      const createdAt = new Date(profile.created_at!);
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (now.getTime() - createdAt.getTime() < fiveMinutes) {
        setWelcomeText('Welcome');
      } else {
        setWelcomeText('Welcome Back,');
      }
    } else if (!loadingProfile && !profile) {
      router.push('/onboarding');
    }
  }, [memoizedSessionUserId, router, profile, loadingProfile]);

  if (!memoizedSessionUserId) return null;

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      <header className="animate-fade-in-slide-up" style={{ animationDelay: '0s' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{welcomeText} {athleteName}</h1>
            <p className="text-muted-foreground mt-2">Ready to Train? Let's get Started!</p>
          </div>
        </div>
      </header>

      <WeeklyTargetWidget 
        onViewSummary={handleViewSummary} 
        summary={weeklySummary}
        loading={loadingWeeklySummary}
        error={dataError}
        profile={profile}
      />

      {!loadingGyms && userGyms.length > 1 && (
        <div className="flex justify-center animate-fade-in-slide-up" style={{ animationDelay: '0.1s' }}>
          <GymToggle />
        </div>
      )}

      <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <NextWorkoutCard 
          profile={profile}
          groupedTPaths={groupedTPaths}
          loadingPlans={loadingWorkoutData}
          activeGym={activeGym}
          loadingGyms={loadingGyms}
        />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.5s' }}>
        <AllWorkoutsQuickStart 
          profile={profile}
          groupedTPaths={groupedTPaths}
          loadingPlans={loadingWorkoutData}
          activeGym={activeGym}
          loadingGyms={loadingGyms}
          workoutExercisesCache={workoutExercisesCache}
          dataError={dataError}
        />
      </div>

      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.7s' }}>
        <ActionHub onActivityLogSuccess={refreshAllData} />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '0.85s' }}>
        <WeeklyVolumeChart />
      </div>
      <div className="animate-fade-in-slide-up" style={{ animationDelay: '1s' }}>
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