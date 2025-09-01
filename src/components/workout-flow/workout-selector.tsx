"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell, Settings, Sparkles } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { cn, formatTimeAgo, getPillStyles } from '@/lib/utils';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { WorkoutBadge } from '../workout-badge';
import { LoadingOverlay } from '../loading-overlay';
import { useSession } from '@/components/session-context-provider';
import { WorkoutPill, WorkoutPillProps } from './workout-pill';
import { EditWorkoutExercisesDialog } from '../manage-t-paths/edit-workout-exercises-dialog';
import { ExerciseSelectionDropdown } from '@/components/shared/exercise-selection-dropdown';
// Removed: import { AnalyzeGymDialog } from '../manage-exercises/analyze-gym-dialog';
// Removed: import { DuplicateExerciseConfirmDialog } from '../manage-exercises/duplicate-exercise-confirm-dialog';
// Removed: import { SaveAiExercisePrompt } from './save-ai-exercise-prompt';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface GroupedTPath {
  mainTPath: TPath;
  childWorkouts: WorkoutWithLastCompleted[];
}

interface WorkoutSelectorProps {
  onWorkoutSelect: (workoutId: string | null) => void;
  selectedWorkoutId: string | null;
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  allAvailableExercises: Tables<'exercise_definitions'>[];
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  addExerciseToSession: (exercise: Tables<'exercise_definitions'>) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => void;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  resetWorkoutSession: () => void;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
  selectWorkout: (workoutId: string | null) => Promise<void>;
  loadingWorkoutFlow: boolean;
  groupedTPaths: GroupedTPath[];
  isCreatingSession: boolean;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<void>;
  refreshAllData: () => void;
}

const mapWorkoutToPillProps = (workout: WorkoutWithLastCompleted, mainTPathName: string): Omit<WorkoutPillProps, 'isSelected' | 'onClick'> => {
  const lowerTitle = workout.template_name.toLowerCase();
  const isUpperLowerSplit = mainTPathName.toLowerCase().includes('upper/lower');
  const workoutType: WorkoutPillProps['workoutType'] = isUpperLowerSplit ? 'upper-lower' : 'push-pull-legs';
  
  let category: WorkoutPillProps['category'];
  let variant: WorkoutPillProps['variant'] = undefined;

  if (isUpperLowerSplit) {
    if (lowerTitle.includes('upper')) category = 'upper';
    else if (lowerTitle.includes('lower')) category = 'lower';
    else category = 'upper'; // Default if neither, though should not happen with current data
    
    if (lowerTitle.includes(' a')) variant = 'a';
    else if (lowerTitle.includes(' b')) variant = 'b';
  } else { // push-pull-legs
    if (lowerTitle.includes('push')) category = 'push';
    else if (lowerTitle.includes('pull')) category = 'pull';
    else if (lowerTitle.includes('legs')) category = 'legs';
    else category = 'push'; // Default if neither, though should not happen with current data
  }

  return {
    id: workout.id,
    title: workout.template_name,
    workoutType, // Pass workoutType here
    category,
    variant,
    completedAt: workout.last_completed_at ? new Date(workout.last_completed_at) : null,
  };
};

export const WorkoutSelector = ({ 
  onWorkoutSelect, 
  selectedWorkoutId,
  activeWorkout,
  exercisesForSession,
  exercisesWithSets,
  allAvailableExercises,
  currentSessionId,
  sessionStartTime,
  completedExercises,
  addExerciseToSession,
  removeExerciseFromSession,
  substituteExercise,
  updateSessionStartTime,
  markExerciseAsCompleted,
  resetWorkoutSession,
  updateExerciseSets,
  selectWorkout,
  loadingWorkoutFlow,
  groupedTPaths,
  isCreatingSession,
  createWorkoutSessionInDb,
  finishWorkoutSession,
  refreshAllData
}: WorkoutSelectorProps) => {
  const { supabase, session } = useSession();
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);
  const [adHocExerciseSourceFilter, setAdHocExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  // Removed: State for AI gym analysis flow
  // Removed: const [showAnalyzeGymDialog, setShowAnalyzeGymDialog] = useState(false);
  // Removed: const [identifiedExerciseFromAI, setIdentifiedExerciseFromAI] = useState<Partial<ExerciseDefinition> | null>(null);
  // Removed: const [showSaveNewExercisePrompt, setShowSaveNewExercisePrompt] = useState(false);
  // Removed: const [isSavingNewExerciseToLibrary, setIsSavingNewExerciseToLibrary] = useState(false);
  // Removed: const [isDuplicateIdentified, setIsDuplicateIdentified] = useState(false);

  const mainMuscleGroups = useMemo(() => {
    return Array.from(new Set(allAvailableExercises.map(ex => ex.main_muscle))).sort();
  }, [allAvailableExercises]);

  const handleWorkoutClick = (workoutId: string) => {
    onWorkoutSelect(workoutId);
  };

  const handleAdHocClick = () => {
    onWorkoutSelect('ad-hoc');
  };

  const handleAddExercise = () => {
    if (selectedExerciseToAdd) {
      const exercise = allAvailableExercises.find((ex) => ex.id === selectedExerciseToAdd);
      if (exercise) {
        addExerciseToSession(exercise);
        setSelectedExerciseToAdd("");
      }
    }
  };

  const handleOpenEditWorkoutDialog = () => {
    if (activeWorkout && activeWorkout.id !== 'ad-hoc') {
      setSelectedWorkoutToEdit({ id: activeWorkout.id, name: activeWorkout.template_name });
      setIsEditWorkoutDialogOpen(true);
    }
  };

  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    if (selectedWorkoutId) {
      await selectWorkout(selectedWorkoutId); // Re-fetch exercises for the current workout
    }
  }, [selectedWorkoutId, selectWorkout]);

  // Removed: AI Gym Analysis Handlers
  // Removed: handleAIIdentifiedExercise
  // Removed: handleSaveToMyExercises
  // Removed: handleAddJustToThisWorkout
  // Removed: handleCloseSavePrompt

  const totalExercises = exercisesForSession.length;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {loadingWorkoutFlow ? (
            <p className="text-muted-foreground text-center py-4">Loading Transformation Paths...</p>
          ) : groupedTPaths.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              You haven't created any Transformation Paths yet. Go to <a href="/manage-t-paths" className="text-primary underline">Manage T-Paths</a> to create one.
            </p>
          ) : (
            groupedTPaths.map(group => (
              <div key={group.mainTPath.id} className="space-y-3">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  {group.mainTPath.template_name}
                </h4>
                {group.childWorkouts.length === 0 ? (
                  <p className="text-muted-foreground text-sm ml-7">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {group.childWorkouts.map(workout => {
                      const pillProps = mapWorkoutToPillProps(workout, group.mainTPath.template_name);
                      const isPPLAndLegs = pillProps.workoutType === 'push-pull-legs' && pillProps.category === 'legs';
                      return (
                        <WorkoutPill
                          key={workout.id}
                          {...pillProps}
                          isSelected={selectedWorkoutId === workout.id}
                          onClick={handleWorkoutClick}
                          className={cn(isPPLAndLegs && "col-span-2 justify-self-center max-w-[calc(50%-0.5rem)]")}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {selectedWorkoutId && activeWorkout && (
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-center mb-4">
              <WorkoutBadge 
                workoutName={selectedWorkoutId === 'ad-hoc' ? "Ad Hoc Workout" : (activeWorkout?.template_name || "Workout")} 
                className="text-lg px-4 py-2"
              >
                {selectedWorkoutId === 'ad-hoc' ? "Ad Hoc Workout" : (activeWorkout?.template_name || "Workout")}
              </WorkoutBadge>
            </div>

            {selectedWorkoutId === 'ad-hoc' && (
              <section className="mb-6 p-4 border rounded-lg bg-card">
                <h3 className="text-lg font-semibold mb-3">Add Exercises</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <ExerciseSelectionDropdown
                    allAvailableExercises={allAvailableExercises}
                    exercisesInCurrentContext={exercisesForSession}
                    selectedExerciseId={selectedExerciseToAdd}
                    setSelectedExerciseId={setSelectedExerciseToAdd}
                    exerciseSourceFilter={adHocExerciseSourceFilter}
                    setExerciseSourceFilter={setAdHocExerciseSourceFilter} // Corrected prop name
                    mainMuscleGroups={mainMuscleGroups}
                    placeholder="Select exercise to add"
                  />
                  <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd} className="flex-shrink-0">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  {/* Removed AI Analyse button */}
                </div>
              </section>
            )}

            <section className="mb-6">
              {exercisesForSession.length === 0 && selectedWorkoutId !== 'ad-hoc' ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-bold mb-2">No exercises for this workout</h3>
                  <p className="text-muted-foreground mb-4">This may happen if your session length is too short.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exercisesForSession.map((exercise, index) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      exerciseNumber={index + 1}
                      currentSessionId={currentSessionId}
                      supabase={supabase}
                      onUpdateGlobalSets={updateExerciseSets}
                      // Removed initialSets prop
                      onSubstituteExercise={substituteExercise}
                      onRemoveExercise={removeExerciseFromSession}
                      workoutTemplateName={activeWorkout.template_name}
                      onFirstSetSaved={async (timestamp) => {
                        return await createWorkoutSessionInDb(activeWorkout.template_name, timestamp);
                      }}
                      onExerciseCompleted={markExerciseAsCompleted}
                    />
                  ))}
                </div>
              )}
            </section>

            {selectedWorkoutId !== 'ad-hoc' && activeWorkout && (
              <Button 
                variant="outline" 
                onClick={handleOpenEditWorkoutDialog} 
                className="w-full mt-4 mb-6"
              >
                <Settings className="h-4 w-4 mr-2" /> Manage Exercises for this Workout
              </Button>
            )}

            {totalExercises > 0 && (
              <Button size="lg" onClick={finishWorkoutSession} className="w-full mt-6">
                Finish Workout
              </Button>
            )}
          </div>
        )}

        <Card
          className={cn(
            "cursor-pointer hover:bg-accent transition-colors",
            selectedWorkoutId === 'ad-hoc' && "border-primary ring-2 ring-primary"
          )}
          onClick={handleAdHocClick}
        >
          <CardHeader className="p-4">
            <CardTitle className="flex items-center text-base">
              <PlusCircle className="h-4 w-4 mr-2" />
              Start Ad-Hoc Workout
            </CardTitle>
            <CardDescription className="text-xs">
              Start a workout without a T-Path. Add exercises as you go.
            </CardDescription>
          </CardHeader>
        </Card>
        <LoadingOverlay isOpen={isCreatingSession} title="Starting Workout..." description="Please wait while your session is being prepared." />
      </div>

      {selectedWorkoutToEdit && (
        <EditWorkoutExercisesDialog
          open={isEditWorkoutDialogOpen}
          onOpenChange={setIsEditWorkoutDialogOpen}
          workoutId={selectedWorkoutToEdit.id}
          workoutName={selectedWorkoutToEdit.name}
          onSaveSuccess={handleEditWorkoutSaveSuccess}
        />
      )}

      {/* Removed: AI Gym Analysis Dialogs */}
      {/* Removed: AnalyzeGymDialog */}
      {/* Removed: SaveAiExercisePrompt */}
    </>
  );
};