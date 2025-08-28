"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { Button } from '@/components/ui/button';
import { Dumbbell, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WorkoutBadge } from '@/components/workout-badge'; // Import WorkoutBadge

type TPath = Tables<'t_paths'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface GroupedTPath {
  mainTPath: TPath;
  childWorkouts: WorkoutWithLastCompleted[];
}

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutIdFromParams = searchParams.get('workoutId');

  // Use the workout flow manager hook
  const {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    allAvailableExercises,
    loading: loadingWorkoutFlow, // Renamed to avoid conflict with local loading states
    error,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    selectWorkout, // This function will be used to change the active workout
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateSessionStartTime,
    markExerciseAsCompleted,
    resetWorkoutSession,
    updateExerciseSets,
    selectedWorkoutId: activeWorkoutIdFromHook, // Get the currently selected workout ID from the hook
  } = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutIdFromParams,
    session,
    supabase,
    router,
  });

  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [loadingTPaths, setLoadingTPaths] = useState(true);
  const [activeMainTPathId, setActiveMainTPathId] = useState<string | null>(null);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");

  // Fetch workouts and profile data
  useEffect(() => {
    const fetchWorkoutsAndProfile = async () => {
      if (!session) return;
      setLoadingTPaths(true);
      try {
        // 1. Fetch user profile to get active_t_path_id
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('active_t_path_id')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }
        const fetchedActiveMainTPathId = profileData?.active_t_path_id || null;
        setActiveMainTPathId(fetchedActiveMainTPathId);

        let mainTPathsData: TPath[] | null = [];
        if (fetchedActiveMainTPathId) {
          // 2. Fetch ONLY the active main T-Path for the user
          const { data, error: mainTPathsError } = await supabase
            .from('t_paths')
            .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
            .eq('user_id', session.user.id)
            .is('parent_t_path_id', null)
            .eq('id', fetchedActiveMainTPathId) // Filter by active T-Path ID
            .order('created_at', { ascending: true });

          if (mainTPathsError) throw mainTPathsError;
          mainTPathsData = data as TPath[];
        }

        // 3. Fetch all child workouts for the user (these will be filtered by parent_t_path_id later)
        const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
          .from('t_paths')
          .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
          .eq('user_id', session.user.id)
          .eq('is_bonus', true)
          .order('template_name', { ascending: true });

        if (childWorkoutsError) throw childWorkoutsError;

        const workoutsWithLastDatePromises = (childWorkoutsData as TPath[] || []).map(async (workout) => {
          const { data: lastSessionDate, error: lastSessionError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
          
          if (lastSessionError) {
            console.error(`Error fetching last session date for workout ${workout.template_name}:`, lastSessionError);
          }
          
          return {
            ...workout,
            last_completed_at: lastSessionDate && lastSessionDate.length > 0 ? lastSessionDate[0].session_date : null,
          };
        });

        const allChildWorkoutsWithLastDate = await Promise.all(workoutsWithLastDatePromises);

        // Group child workouts under their respective main T-Paths
        const newGroupedTPaths: GroupedTPath[] = (mainTPathsData as TPath[] || []).map(mainTPath => ({
          mainTPath,
          childWorkouts: allChildWorkoutsWithLastDate.filter(cw => cw.parent_t_path_id === mainTPath.id),
        }));

        setGroupedTPaths(newGroupedTPaths);

      } catch (err: any) {
        toast.error("Failed to load Transformation Paths: " + err.message);
        console.error("Error fetching T-Paths:", err);
      } finally {
        setLoadingTPaths(false);
      }
    };

    fetchWorkoutsAndProfile();
  }, [session, supabase]);

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `Last: ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  };

  const handleWorkoutSelection = async (workoutId: string | null) => {
    if (activeWorkoutIdFromHook === workoutId) {
      // If clicking the currently active workout, deselect it
      await selectWorkout(null);
      resetWorkoutSession(); // Reset the session when deselecting
    } else {
      // If clicking a different workout, select it
      await selectWorkout(workoutId);
    }
  };

  const handleAddExercise = () => {
    if (selectedExerciseToAdd) {
      const exercise = allAvailableExercises.find((ex) => ex.id === selectedExerciseToAdd);
      if (exercise) {
        addExerciseToSession(exercise);
        setSelectedExerciseToAdd("");
      } else {
        toast.error("Selected exercise not found.");
      }
    } else {
      toast.error("Please select an exercise to add.");
    }
  };

  const totalExercises = exercisesForSession.length;

  return (
    <div className="p-2 sm:p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Start Your Workout</h1>
      </header>
      <div className="space-y-4">
        {loadingTPaths ? (
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
                {group.mainTPath.id === activeMainTPathId && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
                )}
              </h4>
              {group.childWorkouts.length === 0 ? (
                <p className="text-muted-foreground text-sm ml-7">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {group.childWorkouts.map(workout => {
                    const workoutColorClass = getWorkoutColorClass(workout.template_name, 'text');
                    const workoutBgClass = getWorkoutColorClass(workout.template_name, 'bg');
                    const workoutBorderClass = getWorkoutColorClass(workout.template_name, 'border');
                    const Icon = getWorkoutIcon(workout.template_name);
                    const isSelected = activeWorkoutIdFromHook === workout.id;

                    return (
                      <Button
                        key={workout.id}
                        variant="outline"
                        className={cn(
                          "h-auto p-3 flex flex-col items-start justify-start relative w-full",
                          "border-2",
                          workoutBorderClass,
                          workoutBgClass,
                          isSelected && "ring-2 ring-primary",
                          "hover:brightness-90 dark:hover:brightness-110",
                          // Apply opacity-50 if something is selected AND this is NOT the selected workout
                          (activeWorkoutIdFromHook !== null && !isSelected) && "opacity-50",
                        )}
                        onClick={() => handleWorkoutSelection(workout.id)}
                      >
                        <div className="flex justify-between items-center w-full mb-2">
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className={cn("h-5 w-5", workoutColorClass)} />}
                            <span className={cn("font-bold text-lg", workoutColorClass)}>{workout.template_name}</span>
                          </div>
                          {isSelected ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className={cn("text-xs w-full text-center", workoutColorClass)}>
                          {formatLastCompleted(workout.last_completed_at)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Expanded Workout Section - Full Width Below */}
      {(activeWorkoutIdFromHook !== null && activeWorkout) && (
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-center mb-4">
            <WorkoutBadge 
              workoutName={activeWorkout.template_name} 
              className="text-xl px-6 py-3"
            >
              {activeWorkout.template_name}
            </WorkoutBadge>
          </div>

          {activeWorkoutIdFromHook === 'ad-hoc' && (
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

              {loadingWorkoutFlow ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mb-3 animate-bounce" />
                  <h3 className="text-lg font-bold mb-2">Loading Workout...</h3>
                  <p className="text-muted-foreground mb-4">Preparing your exercises.</p>
                </div>
              ) : (
                <section className="mb-6">
                  {exercisesForSession.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <Dumbbell className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-bold mb-2">No exercises added</h3>
                      <p className="text-muted-foreground mb-4">
                        {activeWorkoutIdFromHook === 'ad-hoc'
                          ? "Add exercises to begin your workout."
                          : "This workout has no exercises. This may happen if your session length is too short."}
                      </p>
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
                          onFirstSetSaved={updateSessionStartTime}
                          onExerciseCompleted={markExerciseAsCompleted}
                        />
                      ))}

                      {totalExercises > 0 && (
                        <WorkoutSessionFooter
                          currentSessionId={currentSessionId}
                          sessionStartTime={sessionStartTime}
                          supabase={supabase}
                        />
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* Ad-hoc workout card moved to the bottom */}
          <Card
            className={cn(
              "cursor-pointer hover:bg-accent transition-colors",
              activeWorkoutIdFromHook === 'ad-hoc' && "border-primary ring-2 ring-primary",
              // Apply opacity-50 if something is selected AND this is NOT the ad-hoc workout
              (activeWorkoutIdFromHook !== null && activeWorkoutIdFromHook !== 'ad-hoc') && "opacity-50",
            )}
            onClick={() => handleWorkoutSelection('ad-hoc')}
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
          <MadeWithDyad />
        </div>
      );
    }