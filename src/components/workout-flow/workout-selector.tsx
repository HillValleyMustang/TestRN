"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Dumbbell, Settings, Sparkles } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, GroupedTPath, SetLogState, WorkoutExercise, FetchedExerciseDefinition, Profile } from '@/types/supabase';
import { cn, formatTimeAgo, getPillStyles } from '@/lib/utils';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { WorkoutBadge } from '../workout-badge';
import { LoadingOverlay } from '../loading-overlay';
import { useSession } from '@/components/session-context-provider';
import { WorkoutPill, WorkoutPillProps } from '@/components/workout-flow/workout-pill';
import { EditWorkoutExercisesDialog } from '../manage-t-paths/edit-workout-exercises-dialog';
import { ExerciseSelectionDropdown } from '@/components/shared/exercise-selection-dropdown';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutAwareLink, useWorkoutNavigation } from './workout-aware-link';
import { AnalyseGymButton } from "@/components/manage-exercises/exercise-form/analyze-gym-button";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { UnconfiguredGymPrompt } from '@/components/prompts/unconfigured-gym-prompt';
import { useGym } from '@/components/gym-context-provider';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutSelectorProps {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  allAvailableExercises: FetchedExerciseDefinition[];
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
  profile: Profile | null; // Add profile prop
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
    else category = 'upper';
    
    if (lowerTitle.includes(' a')) variant = 'a';
    else if (lowerTitle.includes(' b')) variant = 'b';
  } else {
    if (lowerTitle.includes('push')) category = 'push';
    else if (lowerTitle.includes('pull')) category = 'pull';
    else if (lowerTitle.includes('legs')) category = 'legs';
    else category = 'push';
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
  profile, // Destructure profile prop
}: WorkoutSelectorProps) => {
  const { supabase, session } = useSession();
  const { activeGym } = useGym();
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [adHocExerciseSourceFilter, setAdHocExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [showSaveAiExercisePrompt, setShowSaveAiExercisePrompt] = useState(false);
  const [aiIdentifiedExercise, setAiIdentifiedExercise] = useState<Partial<FetchedExerciseDefinition> | null>(null);
  const [isAiSaving, setIsAiSaving] = useState(false);

  const activeTPathId = profile?.active_t_path_id;
  const activeTPathGroup = activeTPathId ? groupedTPaths.find(group => group.mainTPath.id === activeTPathId) : null;

  const isGymConfigured = useMemo(() => {
    if (!activeGym || groupedTPaths.length === 0) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths]);

  const filteredExercisesForAdHoc = useMemo(() => {
    if (!session) return [];
    return allAvailableExercises
      .filter(ex => {
        if (adHocExerciseSourceFilter === 'my-exercises') return ex.user_id === session.user.id;
        if (adHocExerciseSourceFilter === 'global-library') return ex.user_id === null;
        return false;
      })
      .filter(ex => !exercisesForSession.some(existingEx => existingEx.id === ex.id));
  }, [allAvailableExercises, adHocExerciseSourceFilter, exercisesForSession, session]);

  const handleWorkoutClick = (workoutId: string) => {
    selectWorkout(workoutId);
  };

  const handleAdHocClick = () => {
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

  const handleExerciseIdentified = useCallback((exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => {
    if (exercises.length > 0) {
      setAiIdentifiedExercise(exercises[0]);
      setShowSaveAiExercisePrompt(true);
    } else {
      toast.info("No exercises were identified from the photos.");
    }
  }, []);

  const handleSaveAiExerciseToMyExercises = useCallback(async (exercise: Partial<FetchedExerciseDefinition>) => {
    if (!session) {
      toast.info("You must be logged in to save exercises.");
      return;
    }
    setIsAiSaving(true);
    try {
      let finalExerciseToAdd: ExerciseDefinition | null = null;

      const { data: insertedExercise, error: insertError } = await supabase.from('exercise_definitions').insert([{
        name: exercise.name!,
        main_muscle: exercise.main_muscle!,
        type: exercise.type!,
        category: exercise.category,
        description: exercise.description,
        pro_tip: exercise.pro_tip,
        video_url: exercise.video_url,
        user_id: session.user.id,
        library_id: null,
        is_favorite: false,
        created_at: new Date().toISOString(),
      }]).select('*').single();

      if (insertError) {
        if (insertError.code === '23505') {
          toast.info(`You already have a custom exercise named "${exercise.name}".`);
        } else {
          throw insertError;
        }
      } else {
        console.log(`'${exercise.name}' added to My Exercises!`);
        finalExerciseToAdd = insertedExercise as ExerciseDefinition;
      }

      if (finalExerciseToAdd) {
        await addExerciseToSession(finalExerciseToAdd);
        console.log(`'${finalExerciseToAdd.name}' added to current workout!`);
      } else {
        throw new Error("Could not find the exercise to add to workout.");
      }

      refreshAllData();
      setShowSaveAiExercisePrompt(false);
      setAiIdentifiedExercise(null);

    } catch (err: any) {
      console.error("Failed to save AI identified exercise and add to workout:", err);
      toast.info("Failed to save exercise.");
    } finally {
      setIsAiSaving(false);
    }
  }, [session, supabase, addExerciseToSession, refreshAllData]);

  const handleAddAiExerciseToWorkoutOnly = useCallback(async (exercise: Partial<FetchedExerciseDefinition>) => {
    if (!session) {
      toast.info("You must be logged in to add exercises.");
      return;
    }
    setIsAiSaving(true);
    try {
      let finalExerciseToAdd: ExerciseDefinition | null = null;

      const existingExercise = allAvailableExercises.find(ex => 
        ex.name?.trim().toLowerCase() === exercise.name?.trim().toLowerCase() && 
        (ex.user_id === session.user.id || ex.user_id === null)
      );
      if (existingExercise) {
        finalExerciseToAdd = existingExercise as ExerciseDefinition;
      }
      
      if (!finalExerciseToAdd) {
        const { data: insertedExercise, error: insertError } = await supabase.from('exercise_definitions').insert([{
          name: exercise.name!,
          main_muscle: exercise.main_muscle!,
          type: exercise.type!,
          category: exercise.category,
          description: exercise.description,
          pro_tip: exercise.pro_tip,
          video_url: exercise.video_url,
          user_id: session.user.id,
          library_id: null,
          is_favorite: false,
          created_at: new Date().toISOString(),
        }]).select('*').single();

        if (insertError) {
          if (insertError.code === '23505') {
            toast.info(`You already have a custom exercise named "${exercise.name}".`);
            const existingUserExercise = allAvailableExercises.find(ex => ex.name?.trim().toLowerCase() === exercise.name?.trim().toLowerCase() && ex.user_id === session.user.id);
            if (existingUserExercise) {
              finalExerciseToAdd = existingUserExercise as ExerciseDefinition;
            } else {
               throw insertError;
            }
          } else {
            throw insertError;
          }
        } else {
          finalExerciseToAdd = insertedExercise as ExerciseDefinition;
        }
      }

      if (finalExerciseToAdd) {
        await addExerciseToSession(finalExerciseToAdd);
        console.log(`'${finalExerciseToAdd.name}' added to current workout!`);
      } else {
        throw new Error("Could not find or create the exercise to add to workout.");
      }

      refreshAllData();
      setShowSaveAiExercisePrompt(false);
      setAiIdentifiedExercise(null);

    } catch (err: any) {
      console.error("Failed to add AI identified exercise to workout only:", err);
      toast.info("Failed to add exercise.");
    } finally {
      setIsAiSaving(false);
    }
  }, [session, supabase, allAvailableExercises, addExerciseToSession, refreshAllData]);


  const totalExercises = exercisesForSession.length;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {loadingWorkoutFlow ? (
            <p className="text-muted-foreground text-center py-4">Loading Transformation Paths...</p>
          ) : !isGymConfigured && activeGym ? (
            <UnconfiguredGymPrompt gymName={activeGym.name} />
          ) : !activeTPathGroup ? (
            <p className="text-muted-foreground text-center py-4">
              No active Transformation Path found for this gym. Go to <WorkoutAwareLink href="/manage-t-paths" className="text-primary underline">Manage T-Paths</WorkoutAwareLink> to set one up.
            </p>
          ) : (
            <div key={activeTPathGroup.mainTPath.id} className="space-y-3">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                {activeTPathGroup.mainTPath.template_name}
              </h4>
              {activeTPathGroup.childWorkouts.length === 0 ? (
                <p className="text-muted-foreground text-sm ml-7">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {activeTPathGroup.childWorkouts.map((workout: WorkoutWithLastCompleted) => {
                    const pillProps = mapWorkoutToPillProps(workout, activeTPathGroup.mainTPath.template_name);
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
                    exercises={filteredExercisesForAdHoc as ExerciseDefinition[]}
                    selectedExerciseId={selectedExerciseToAdd}
                    setSelectedExerciseId={setSelectedExerciseToAdd}
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
      />
    </>
  );
};