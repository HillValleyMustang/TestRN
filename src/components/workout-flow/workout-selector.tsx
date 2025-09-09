"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell, Settings, Sparkles } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, GroupedTPath, SetLogState, WorkoutExercise, FetchedExerciseDefinition } from '@/types/supabase';
import { cn, formatTimeAgo, getPillStyles } from '@/lib/utils';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { WorkoutBadge } from '../workout-badge';
import { LoadingOverlay } from '../loading-overlay';
import { useSession } from '@/components/session-context-provider';
import { WorkoutPill, WorkoutPillProps } from './workout-pill';
import { EditWorkoutExercisesDialog } from '../manage-t-paths/edit-workout-exercises-dialog';
import { ExerciseSelectionDropdown } from '@/components/shared/exercise-selection-dropdown';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutAwareLink, useWorkoutNavigation } from './workout-aware-link';
import { AnalyseGymButton } from "@/components/manage-exercises/exercise-form/analyze-gym-button"; // Renamed import
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog"; // Renamed import
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutSelectorProps {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  allAvailableExercises: FetchedExerciseDefinition[];
  setAllAvailableExercises: React.Dispatch<React.SetStateAction<FetchedExerciseDefinition[]>>; // New prop
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  addExerciseToSession: (exercise: ExerciseDefinition) => Promise<void>;
  removeExerciseFromSession: (exerciseId: string) => Promise<void>;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => Promise<void>;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
  selectWorkout: (workoutId: string | null) => Promise<void>;
  loadingWorkoutFlow: boolean;
  groupedTPaths: GroupedTPath[];
  isCreatingSession: boolean;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<string | null>;
  refreshAllData: () => void;
  isQuickStart?: boolean;
  expandedExerciseCards: Record<string, boolean>;
  toggleExerciseCardExpansion: (exerciseId: string) => void;
  isEditWorkoutDialogOpen: boolean;
  selectedWorkoutToEdit: { id: string; name: string } | null;
  handleOpenEditWorkoutDialog: (workoutId: string, workoutName: string) => void;
  handleEditWorkoutSaveSuccess: () => void;
  setIsEditWorkoutDialogOpen: (isOpen: boolean) => void;
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
    workoutType,
    category,
    variant,
    completedAt: workout.last_completed_at ? new Date(workout.last_completed_at) : null,
  };
};

export const WorkoutSelector = ({ 
  activeWorkout,
  exercisesForSession,
  exercisesWithSets,
  allAvailableExercises,
  setAllAvailableExercises, // Destructure new prop
  currentSessionId,
  sessionStartTime,
  completedExercises,
  addExerciseToSession,
  removeExerciseFromSession,
  substituteExercise,
  updateSessionStartTime,
  markExerciseAsCompleted,
  updateExerciseSets,
  selectWorkout,
  loadingWorkoutFlow,
  groupedTPaths,
  isCreatingSession,
  createWorkoutSessionInDb,
  finishWorkoutSession,
  refreshAllData,
  isQuickStart = false,
  expandedExerciseCards,
  toggleExerciseCardExpansion,
  isEditWorkoutDialogOpen,
  selectedWorkoutToEdit,
  handleOpenEditWorkoutDialog,
  handleEditWorkoutSaveSuccess,
  setIsEditWorkoutDialogOpen,
}: WorkoutSelectorProps) => {
  const { supabase, session } = useSession();
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [adHocExerciseSourceFilter, setAdHocExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  // AI-related states for Workout Page
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [showSaveAiExercisePrompt, setShowSaveAiExercisePrompt] = useState(false);
  const [aiIdentifiedExercise, setAiIdentifiedExercise] = useState<Partial<Tables<'exercise_definitions'>> | null>(null);
  const [isAiSaving, setIsAiSaving] = useState(false);
  const [isDuplicateAiExercise, setIsDuplicateAiExercise] = useState(false);

  const mainMuscleGroups: string[] = useMemo(() => {
    return Array.from(new Set(allAvailableExercises.map((ex: FetchedExerciseDefinition) => ex.main_muscle))).sort();
  }, [allAvailableExercises]);

  const handleWorkoutClick = (workoutId: string) => {
    console.log(`[WorkoutSelector] handleWorkoutClick triggered for ID: ${workoutId}`);
    selectWorkout(workoutId);
  };

  const handleAdHocClick = () => {
    console.log(`[WorkoutSelector] handleAdHocClick triggered.`);
    selectWorkout('ad-hoc');
  };

  const handleAddExercise = () => {
    if (selectedExerciseToAdd) {
      const exercise = allAvailableExercises.find((ex: FetchedExerciseDefinition) => ex.id === selectedExerciseToAdd);
      if (exercise) {
        addExerciseToSession(exercise as ExerciseDefinition); 
        setSelectedExerciseToAdd("");
      }
    }
  };

  // AI Gym Analysis Handlers for Workout Page
  const handleExerciseIdentified = useCallback((exercise: Partial<Tables<'exercise_definitions'>>, isDuplicate: boolean) => {
    setAiIdentifiedExercise(exercise);
    setIsDuplicateAiExercise(isDuplicate);
    setShowSaveAiExercisePrompt(true);
  }, []);

  const handleSaveAiExerciseToMyExercises = useCallback(async (exercise: Partial<Tables<'exercise_definitions'>>) => {
    if (!session) {
      toast.error("You must be logged in to save exercises.");
      return;
    }
    setIsAiSaving(true);
    try {
      let finalExerciseToAdd: ExerciseDefinition | null = null;

      if (!isDuplicateAiExercise) { // Only insert if not a duplicate
        const { data: insertedExercise, error: insertError } = await supabase.from('exercise_definitions').insert([{
          name: exercise.name!,
          main_muscle: exercise.main_muscle!,
          type: exercise.type!,
          category: exercise.category,
          description: exercise.description,
          pro_tip: exercise.pro_tip,
          video_url: exercise.video_url,
          user_id: session.user.id,
          library_id: null, // User-created, not from global library
          is_favorite: false,
          created_at: new Date().toISOString(),
        }]).select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url').single(); // Select all fields for FetchedExerciseDefinition

        if (insertError) {
          if (insertError.code === '23505') { // Unique violation code
            toast.error("This exercise already exists in your custom exercises.");
          } else {
            throw insertError;
          }
        } else {
          toast.success(`'${exercise.name}' added to My Exercises!`);
          finalExerciseToAdd = insertedExercise as ExerciseDefinition;
          // Immediately update allAvailableExercises with the new exercise
          setAllAvailableExercises((prev: FetchedExerciseDefinition[]) => [...prev, insertedExercise as FetchedExerciseDefinition]);
        }
      } else {
        // If it's a duplicate, we just need its ID to add to the workout
        const existingExercise = allAvailableExercises.find(ex => 
          ex.name === exercise.name && ex.main_muscle === exercise.main_muscle && ex.type === exercise.type
        );
        if (existingExercise) {
          finalExerciseToAdd = existingExercise as ExerciseDefinition;
        } else {
          throw new Error("Duplicate exercise found but could not retrieve its ID.");
        }
      }

      // Now add to current workout session
      if (finalExerciseToAdd) {
        await addExerciseToSession(finalExerciseToAdd);
        toast.success(`'${finalExerciseToAdd.name}' added to current workout!`);
      } else {
        throw new Error("Could not find the exercise to add to workout.");
      }

      refreshAllData(); // Trigger refresh of exercise lists
      setShowSaveAiExercisePrompt(false);
      setAiIdentifiedExercise(null);

    } catch (err: any) {
      console.error("Failed to save AI identified exercise and add to workout:", err);
      toast.error("Failed to save exercise: " + err.message);
    } finally {
      setIsAiSaving(false);
    }
  }, [session, supabase, isDuplicateAiExercise, allAvailableExercises, setAllAvailableExercises, addExerciseToSession, refreshAllData]);

  const handleAddAiExerciseToWorkoutOnly = useCallback(async (exercise: Partial<Tables<'exercise_definitions'>>) => {
    if (!session) {
      toast.error("You must be logged in to add exercises.");
      return;
    }
    setIsAiSaving(true);
    try {
      let finalExerciseToAdd: ExerciseDefinition | null = null;

      // If it's a duplicate, we just need its ID to add to the workout
      if (isDuplicateAiExercise) {
        const existingExercise = allAvailableExercises.find(ex => 
          ex.name === exercise.name && ex.main_muscle === exercise.main_muscle && ex.type === exercise.type
        );
        if (existingExercise) {
          finalExerciseToAdd = existingExercise as ExerciseDefinition;
        } else {
          throw new Error("Duplicate exercise found but could not retrieve its ID.");
        }
      } else {
        // If not a duplicate, but only adding to workout, we still need to create it in the DB
        // as a user-owned exercise, but without explicitly saving to "My Exercises" list.
        const { data: insertedExercise, error: insertError } = await supabase.from('exercise_definitions').insert([{
          name: exercise.name!,
          main_muscle: exercise.main_muscle!,
          type: exercise.type!,
          category: exercise.category,
          description: exercise.description,
          pro_tip: exercise.pro_tip,
          video_url: exercise.video_url,
          user_id: session.user.id,
          library_id: null, // User-created, not from global library
          is_favorite: false,
          created_at: new Date().toISOString(),
        }]).select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url').single(); // Select all fields for FetchedExerciseDefinition

        if (insertError) {
          throw insertError;
        }
        finalExerciseToAdd = insertedExercise as ExerciseDefinition;
        // Immediately update allAvailableExercises with the new exercise
        setAllAvailableExercises((prev: FetchedExerciseDefinition[]) => [...prev, insertedExercise as FetchedExerciseDefinition]);
      }

      if (finalExerciseToAdd) {
        await addExerciseToSession(finalExerciseToAdd);
        toast.success(`'${finalExerciseToAdd.name}' added to current workout!`);
      } else {
        throw new Error("Could not find the exercise to add to workout.");
      }

      refreshAllData(); // Trigger refresh of exercise lists
      setShowSaveAiExercisePrompt(false);
      setAiIdentifiedExercise(null);

    } catch (err: any) {
      console.error("Failed to add AI identified exercise to workout only:", err);
      toast.error("Failed to add exercise: " + err.message);
    } finally {
      setIsAiSaving(false);
    }
  }, [session, supabase, isDuplicateAiExercise, allAvailableExercises, setAllAvailableExercises, addExerciseToSession, refreshAllData]);


  const totalExercises = exercisesForSession.length;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {loadingWorkoutFlow ? (
            <p className="text-muted-foreground text-center py-4">Loading Transformation Paths...</p>
          ) : groupedTPaths.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              You haven't created any Transformation Paths yet. Go to <WorkoutAwareLink href="/manage-t-paths" className="text-primary underline">Manage T-Paths</WorkoutAwareLink> to create one.
            </p>
          ) : (
            groupedTPaths.map((group: GroupedTPath) => (
              <div key={group.mainTPath.id} className="space-y-3">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  {group.mainTPath.template_name}
                </h4>
                {group.childWorkouts.length === 0 ? (
                  <p className="text-muted-foreground text-sm ml-7">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {group.childWorkouts.map((workout: WorkoutWithLastCompleted) => {
                      const pillProps = mapWorkoutToPillProps(workout, group.mainTPath.template_name);
                      const isPPLAndLegs = pillProps.workoutType === 'push-pull-legs' && pillProps.category === 'legs';
                      const isSelectedPill = activeWorkout?.id === workout.id;
                      return (
                        <WorkoutPill
                          key={workout.id}
                          {...pillProps}
                          isSelected={isSelectedPill}
                          onClick={handleWorkoutClick}
                          className={cn(isPPLAndLegs && "col-span-2 justify-self-center")}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {activeWorkout && (
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-center mb-4">
              <WorkoutBadge 
                workoutName={activeWorkout.id === 'ad-hoc' ? "Ad Hoc Workout" : (activeWorkout?.template_name || "Workout")} 
                className="text-lg px-4 py-2"
              >
                {activeWorkout.id === 'ad-hoc' ? "Ad Hoc Workout" : (activeWorkout?.template_name || "Workout")}
              </WorkoutBadge>
            </div>

            {activeWorkout.id === 'ad-hoc' && (
              <section className="mb-6 p-4 border rounded-lg bg-card">
                <h3 className="text-lg font-semibold mb-3">Add Exercises</h3>
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <ExerciseSelectionDropdown
                    allAvailableExercises={allAvailableExercises}
                    exercisesInCurrentContext={exercisesForSession}
                    selectedExerciseId={selectedExerciseToAdd}
                    setSelectedExerciseId={setSelectedExerciseToAdd}
                    exerciseSourceFilter={adHocExerciseSourceFilter}
                    setExerciseSourceFilter={setAdHocExerciseSourceFilter}
                    mainMuscleGroups={mainMuscleGroups}
                    placeholder="Select exercise to add"
                  />
                  <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd} className="flex-shrink-0">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <AnalyseGymButton onClick={() => setShowAnalyseGymDialog(true)} />
              </section>
            )}

            <section className="mb-6">
              {exercisesForSession.length === 0 && activeWorkout.id !== 'ad-hoc' ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-bold mb-2">No exercises for this workout</h3>
                  <p className="text-muted-foreground mb-4">This may happen if your session length is too short.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exercisesForSession.map((exercise: WorkoutExercise, index: number) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      exerciseNumber={index + 1}
                      currentSessionId={currentSessionId}
                      supabase={supabase}
                      onUpdateGlobalSets={updateExerciseSets}
                      onSubstituteExercise={substituteExercise}
                      onRemoveExercise={removeExerciseFromSession}
                      workoutTemplateName={activeWorkout.template_name}
                      onFirstSetSaved={async (timestamp) => {
                        return await createWorkoutSessionInDb(activeWorkout.template_name, timestamp);
                      }}
                      onExerciseCompleted={markExerciseAsCompleted}
                      isExerciseCompleted={completedExercises.has(exercise.id)}
                      isExpandedProp={expandedExerciseCards[exercise.id] || false}
                      onToggleExpand={toggleExerciseCardExpansion}
                    />
                  ))}
                </div>
              )}
            </section>

            {activeWorkout.id !== 'ad-hoc' && activeWorkout && (
              <Button 
                variant="outline" 
                onClick={() => handleOpenEditWorkoutDialog(activeWorkout.id, activeWorkout.template_name)} 
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
            activeWorkout?.id === 'ad-hoc' && "border-primary ring-2 ring-primary"
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
      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExerciseIdentified={handleExerciseIdentified}
      />
      <SaveAiExercisePrompt
        open={showSaveAiExercisePrompt}
        onOpenChange={setShowSaveAiExercisePrompt}
        exercise={aiIdentifiedExercise}
        onSaveToMyExercises={handleSaveAiExerciseToMyExercises}
        onAddOnlyToCurrentWorkout={handleAddAiExerciseToWorkoutOnly}
        context="workout-flow"
        isSaving={isAiSaving}
        isDuplicate={isDuplicateAiExercise}
      />
    </>
  );
};