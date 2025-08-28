"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { WorkoutBadge } from '../workout-badge'; // Import WorkoutBadge
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager'; // Corrected import statement

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
  loadingWorkoutFlow: boolean;
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
  loadingWorkoutFlow
}: WorkoutSelectorProps) => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [loadingTPaths, setLoadingTPaths] = useState(true);
  const [activeMainTPathId, setActiveMainTPathId] = useState<string | null>(null);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, WorkoutExercise[]>>({});

  useEffect(() => {
    const fetchWorkoutsAndProfile = async () => {
      if (!session) return;
      setLoadingTPaths(true);
      try {
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
          const { data, error: mainTPathsError } = await supabase
            .from('t_paths')
            .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
            .eq('user_id', session.user.id)
            .is('parent_t_path_id', null)
            .eq('id', fetchedActiveMainTPathId)
            .order('created_at', { ascending: true });

          if (mainTPathsError) throw mainTPathsError;
          mainTPathsData = data as TPath[];
        }

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

  const fetchExercisesForWorkout = useCallback(async (workoutId: string) => {
    if (!session || !workoutId) return [];
    if (workoutExercisesCache[workoutId]) {
      return workoutExercisesCache[workoutId];
    }

    try {
      const { data: tPathExercises, error: fetchLinksError } = await supabase
        .from('t_path_exercises')
        .select('exercise_id, is_bonus_exercise, order_index')
        .eq('template_id', workoutId)
        .order('order_index', { ascending: true });

      if (fetchLinksError) throw fetchLinksError;

      if (!tPathExercises || tPathExercises.length === 0) {
        return [];
      }

      const exerciseIds = tPathExercises.map(e => e.exercise_id);
      const exerciseInfoMap = new Map(tPathExercises.map(e => [e.exercise_id, { is_bonus_exercise: !!e.is_bonus_exercise, order_index: e.order_index }]));

      const { data: exerciseDetails, error: fetchDetailsError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .in('id', exerciseIds);

      if (fetchDetailsError) throw fetchDetailsError;

      const exercises = (exerciseDetails as Tables<'exercise_definitions'>[] || [])
        .map(ex => ({
          ...ex,
          is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false,
        }))
        .sort((a, b) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));
      
      setWorkoutExercisesCache(prev => ({ ...prev, [workoutId]: exercises }));
      return exercises;

    } catch (err: any) {
      toast.error(`Failed to fetch exercises for workout: ${err.message}`);
      console.error("Error fetching exercises:", err);
      return [];
    }
  }, [session, supabase, workoutExercisesCache]);

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `Last: ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  };

  const handleWorkoutClick = async (workoutId: string) => {
    if (selectedWorkoutId === workoutId) {
      onWorkoutSelect(null);
      resetWorkoutSession();
      return;
    }
    
    onWorkoutSelect(workoutId);
  };

  const handleAdHocClick = async () => {
    if (selectedWorkoutId === 'ad-hoc') {
      onWorkoutSelect(null);
      resetWorkoutSession();
      return;
    }
    
    onWorkoutSelect('ad-hoc');
  };
  const isAdHocExpanded = selectedWorkoutId === 'ad-hoc';

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
  const completedExerciseCount = completedExercises.size;

  return (
    <div className="space-y-6">
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

                    return (
                      <Button
                        key={workout.id}
                        variant="outline"
                        className={cn(
                          "h-auto p-3 flex flex-col items-center justify-center text-center relative w-full",
                          "border-2",
                          workoutBorderClass,
                          workoutBgClass,
                          selectedWorkoutId === workout.id && "ring-2 ring-primary",
                          (selectedWorkoutId !== null && selectedWorkoutId !== workout.id) && "opacity-50",
                          selectedWorkoutId !== workout.id && "transition-transform hover:scale-[1.02] duration-200 ease-out"
                        )}
                        onClick={() => handleWorkoutClick(workout.id)}
                      >
                        <div className="flex flex-col items-center gap-1 w-full">
                          <div className="flex items-center justify-center">
                            {Icon && <Icon className={cn("h-4 w-4", workoutColorClass)} />}
                          </div>
                          <span className={cn("font-semibold text-sm", workoutColorClass)}>{workout.template_name}</span>
                          <span className={cn("text-xs mt-1", workoutColorClass)}>
                            {formatLastCompleted(workout.last_completed_at)}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {(selectedWorkoutId !== null) && activeWorkout && (
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-center mb-4">
            <WorkoutBadge 
              workoutName={activeWorkout?.template_name || "Workout"} 
              className="text-xl px-6 py-3"
            >
            </WorkoutBadge>
          </div>

          {loadingWorkoutFlow ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-3 animate-bounce" />
              <h3 className="text-lg font-bold mb-2">Loading Workout...</h3>
              <p className="text-muted-foreground mb-4">Preparing your exercises.</p>
            </div>
          ) : (
            <>
              {isAdHocExpanded && (
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
                {exercisesForSession.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <Dumbbell className="h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-bold mb-2">No exercises added</h3>
                    <p className="text-muted-foreground mb-4">
                      {isAdHocExpanded 
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
                        workoutTemplateName={activeWorkout?.template_name || "Workout"}
                        onFirstSetSaved={updateSessionStartTime}
                        onExerciseCompleted={markExerciseAsCompleted}
                      />
                    ))}
                    
                    {totalExercises > 0 && (
                      <div className="mt-6">
                        <WorkoutSessionFooter
                          currentSessionId={currentSessionId}
                          sessionStartTime={sessionStartTime}
                          supabase={supabase}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      <Card
        className={cn(
          "cursor-pointer",
          selectedWorkoutId === 'ad-hoc' && "border-primary ring-2 ring-primary",
          (selectedWorkoutId !== null && selectedWorkoutId !== 'ad-hoc') && "opacity-50",
          selectedWorkoutId !== 'ad-hoc' && "transition-transform hover:scale-[1.02] duration-200 ease-out"
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
    </div>
  );
};