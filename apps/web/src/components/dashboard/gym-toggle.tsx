"use client";

import React from 'react';
import { useGym } from '@/components/gym-context-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';

export const GymToggle = () => {
  const { userGyms, activeGym, switchActiveGym, loadingGyms } = useGym();
  const { refreshProfile } = useWorkoutDataFetcher(); // Get the refresh function

  if (loadingGyms) {
    return <Skeleton className="h-12 w-48" />;
  }

  if (!activeGym || userGyms.length <= 1) {
    return null; // Don't show if only one or zero gyms
  }

  const currentIndex = userGyms.findIndex(g => g.id === activeGym.id);

  const handleSwitch = async (newIndex: number) => {
    const success = await switchActiveGym(userGyms[newIndex].id);
    if (success) {
      // On successful switch, manually trigger a profile refresh.
      // This ensures useWorkoutDataFetcher gets the new active_t_path_id immediately.
      refreshProfile();
    }
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + userGyms.length) % userGyms.length;
    handleSwitch(prevIndex);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % userGyms.length;
    handleSwitch(nextIndex);
  };

  return (
    <Card className="p-0 border rounded-xl bg-card shadow-sm w-full max-w-xs mx-auto"> {/* Added w-full max-w-xs mx-auto for mobile centering */}
      <CardContent className="p-2 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <p className="text-xs text-muted-foreground">Active Gym</p>
          <p className="font-semibold text-sm flex items-center gap-1">
            <Home className="h-4 w-4" />
            {activeGym.name}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
};