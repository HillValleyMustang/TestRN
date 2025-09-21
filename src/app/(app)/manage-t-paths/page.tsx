"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables, WorkoutWithLastCompleted, GroupedTPath } from "@/types/supabase";
import { toast } from "sonner";
import { ActiveTPathWorkoutsList } from "@/components/manage-t-paths/active-t-path-workouts-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/loading-overlay";
import { EditWorkoutExercisesDialog } from "@/components/manage-t-paths/edit-workout-exercises-dialog";
import { useWorkoutDataFetcher } from "@/hooks/use-workout-data-fetcher";
import { useGym } from "@/components/gym-context-provider";
import { UnconfiguredGymPrompt } from "@/components/prompts/unconfigured-gym-prompt";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupGymPlanPrompt } from "@/components/manage-t-paths/setup-gym-plan-prompt";

type TPath = Tables<'t_paths'>;

export default function ManageTPathsPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const { activeGym, loadingGyms } = useGym();
  const { groupedTPaths, loadingData, refreshAllData, profile } = useWorkoutDataFetcher(); // Destructure profile here

  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const activeTPathGroup = useMemo(() => {
    if (!activeGym || groupedTPaths.length === 0) return null;
    return groupedTPaths.find(group => group.mainTPath.gym_id === activeGym.id) || null;
  }, [activeGym, groupedTPaths]);

  const isGymConfigured = !!activeTPathGroup;

  const handleEditWorkout = (workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  };

  const handleSaveSuccess = () => {
    refreshAllData();
    setIsEditWorkoutDialogOpen(false);
  };

  if (loadingData || loadingGyms) {
    return (
      <div className="flex flex-col gap-4 p-2 sm:p-4">
        <header className="mb-4"><Skeleton className="h-9 w-3/4" /></header>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Manage Workout Plans</h1>
        <p className="text-muted-foreground">
          Configure the workouts for your active gym: <span className="font-semibold text-primary">{activeGym?.name || '...'}</span>
        </p>
      </header>
      
      {!activeGym ? (
        <Card>
          <CardHeader><CardTitle>No Active Gym</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please add a gym in your profile settings to begin.</p>
            <Button onClick={() => router.push('/profile?tab=settings&edit=true')} className="mt-4">Go to Profile Settings</Button>
          </CardContent>
        </Card>
      ) : !isGymConfigured ? (
        <SetupGymPlanPrompt gym={activeGym} onSetupSuccess={refreshAllData} profile={profile} />
      ) : (
        <ActiveTPathWorkoutsList
          activeTPathName={activeTPathGroup.mainTPath.template_name}
          childWorkouts={activeTPathGroup.childWorkouts}
          loading={loadingData}
          onEditWorkout={handleEditWorkout}
        />
      )}

      {selectedWorkoutToEdit && (
        <EditWorkoutExercisesDialog
          open={isEditWorkoutDialogOpen}
          onOpenChange={setIsEditWorkoutDialogOpen}
          workoutId={selectedWorkoutToEdit.id}
          workoutName={selectedWorkoutToEdit.name}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}