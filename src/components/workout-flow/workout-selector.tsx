"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutPillProps } from '@/lib/utils';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { WorkoutBadge } from '../workout-badge';
import { LoadingOverlay } from '../loading-overlay';
import { useSession } from '@/components/session-context-provider';
import { WorkoutPillButton } from './workout-pill-button';

type TPath = Tables<'t_paths'>;

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
  finishWorkoutSession: () => Promise<void>; // New prop
}

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
  finishWorkoutSession // Destructure new prop
}: WorkoutSelectorProps) => {
  const { supabase } = useSession();
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `Last: ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  };

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

  const totalExercises = exercisesForSession.length;

  return (
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
                <div className="grid grid-cols-2 gap-4">
                  {group.childWorkouts.map(workout => {
                    const { accent, direction } = getWorkoutPillProps(workout.template_name);
                    const isSelected = selectedWorkoutId === workout.id;

                    return (
                      <WorkoutPillButton
                        key={workout.id}
                        name={workout.template_name}
                        time={formatLastCompleted(workout.last_completed_at)}
                        accent={accent}
                        selected={isSelected}
                        direction={direction}
                        onClick={() => handleWorkoutClick(workout.id)}
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
              className="text-xl px-6 py-3"
            >
              {selectedWorkoutId === 'ad-hoc' ? "Ad Hoc Workout" : (activeWorkout?.template_name || "Workout")}
            </WorkoutBadge>
          </div>

          {selectedWorkoutId === 'ad-hoc' && (
            <section className="mb-6 p-4 border rounded-lg bg-card">
              <h3 className="text-lg font-semibold mb-3">Add Exercises</h3>
              <div className="flex flex-col gap-3">
                <select 
                  value={selectedExerciseToAdd}
                  onChange={(e) => setSelectedExerciseToAdd(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select exercise</option>
                  {allAvailableExercises
                    .filter((ex) => !exercisesForSession.some((sessionEx) => sessionEx.id === ex.id))
                    .map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name} ({exercise.main_muscle})
                      </option>
                    ))}
                </select>
                <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Exercise
                </Button>
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
                    initialSets={exercisesWithSets[exercise.id] || []}
                    onSubstituteExercise={substituteExercise}
                    onRemoveExercise={removeExerciseFromSession}
                    workoutTemplateName={activeWorkout.template_name}
                    onFirstSetSaved={async (timestamp) => {
                      // Call the new function from useWorkoutFlowManager
                      return await createWorkoutSessionInDb(activeWorkout.template_name, timestamp);
                    }}
                    onExerciseCompleted={markExerciseAsCompleted}
                  />
                ))}
              </div>
            )}
          </section>

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
  );
};