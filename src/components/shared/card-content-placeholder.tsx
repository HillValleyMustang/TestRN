"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CardContentPlaceholderProps {
  isLoading: boolean;
  hasActiveGym: boolean;
  isGymConfigured: boolean;
  activeGymName: string | null;
  hasWorkouts: boolean;
  children: React.ReactNode;
  loadingSkeleton?: React.ReactNode; // Optional custom skeleton
  emptyWorkoutsMessage?: string; // Custom message for no workouts
}

export const CardContentPlaceholder = ({
  isLoading,
  hasActiveGym,
  isGymConfigured,
  activeGymName,
  hasWorkouts,
  children,
  loadingSkeleton,
  emptyWorkoutsMessage = "No active Transformation Path found or no workouts defined for your current session length. Complete onboarding or set one in your profile to get started.",
}: CardContentPlaceholderProps) => {
  const router = useRouter();

  if (isLoading) {
    return loadingSkeleton || (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (!hasActiveGym) {
    return (
      <div className="text-muted-foreground text-center py-4">
        <p className="mb-4">No active gym selected. Please set one in your profile.</p>
        <Button onClick={() => router.push('/profile')} size="sm">Go to Profile Settings</Button>
      </div>
    );
  }

  if (!isGymConfigured) {
    return (
      <div className="text-muted-foreground text-center py-4">
        <p className="mb-4">Your active gym "{activeGymName}" has no workout plan. Go to <Link href="/manage-t-paths" className="text-primary underline">Manage T-Paths</Link> to set one up.</p>
      </div>
    );
  }

  if (!hasWorkouts) {
    return (
      <p className="text-muted-foreground text-center py-4">
        {emptyWorkoutsMessage}
      </p>
    );
  }

  return <>{children}</>;
};