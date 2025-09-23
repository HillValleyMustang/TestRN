"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight, Eye, Dumbbell, Timer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, getWorkoutColorClass, cn } from '@/lib/utils';
import { useWorkoutHistory } from '@/hooks/data/useWorkoutHistory'; // Import the new hook

interface PreviousWorkoutsCardProps {
  onViewSummary: (sessionId: string) => void;
}

export const PreviousWorkoutsCard = ({ onViewSummary }: PreviousWorkoutsCardProps) => {
  const router = useRouter();
  const { sessions, isLoading, error } = useWorkoutHistory(); // Use the new centralized hook

  const recentSessions = sessions.slice(0, 3);

  const handleViewSummaryClick = (sessionId: string) => {
    onViewSummary(sessionId);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <History className="h-5 w-5" />
            Previous Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <History className="h-5 w-5" />
          Previous Workouts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && recentSessions.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recentSessions.length === 0 ? (
          <p className="text-muted-foreground">No previous workouts found. Complete a workout to see it here!</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((sessionItem) => {
              const workoutName = sessionItem.template_name || 'Ad Hoc Workout';
              const workoutBorderClass = getWorkoutColorClass(workoutName, 'border');
              const workoutTextClass = getWorkoutColorClass(workoutName, 'text');

              return (
                <Card key={sessionItem.id} className={cn("border-2", workoutBorderClass)}>
                  <div className="flex items-center justify-between p-3">
                    <div className="flex flex-col">
                      <CardTitle className={cn("text-base font-semibold leading-tight text-center", workoutTextClass)}>{workoutName}</CardTitle>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {sessionItem.completed_at ? formatTimeAgo(new Date(sessionItem.completed_at)) : 'N/A'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewSummaryClick(sessionItem.id)}
                      title="View Summary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="pt-0 pb-3 px-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" /> {sessionItem.exercise_count} Exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" /> {sessionItem.duration_string || 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Button
              variant="ghost"
              className="w-full justify-center text-primary hover:text-primary/90"
              onClick={() => router.push('/workout-history')}
            >
              View All History <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};