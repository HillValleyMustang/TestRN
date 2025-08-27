"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { useRouter } from 'next/navigation';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';

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
  // New props for inline workout flow
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
}

export const WorkoutSelector = ({ 
  onWorkoutSelect, 
  selectedWorkoutId,
  // New props for inline workout flow
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
  updateExerciseSets
}: WorkoutSelectorProps) => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextRecommendedWorkoutId, setNextRecommendedWorkoutId] = useState<string | null>(null);
  const [activeMainTPathId, setActiveMainTPathId] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");

  const fetchWorkoutsAndProfile = useCallback(async () => {
    if (!session) return;
    setLoading(true);
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

      // Determine next recommended workout (least recently completed within the active main T-Path)
      if (fetchedActiveMainTPathId) {
        const activePathWorkouts = allChildWorkoutsWithLastDate.filter(cw => cw.parent_t_path_id === fetchedActiveMainTPathId);
        if (activePathWorkouts.length > 0) {
          const sortedByLastCompleted = [...activePathWorkouts].sort((a, b) => {
            const dateA = a.last_completed_at ? new Date(a.last_completed_at).getTime() : 0;
            const dateB = b.last_completed_at ? new Date(b.last_completed_at).getTime() : 0;
            return dateA - dateB; // Ascending order, so least recent is first
          });
          setNextRecommendedWorkoutId(sortedByLastCompleted[0].id);
        } else {
          setNextRecommendedWorkoutId(null);
        }
      } else {
        setNextRecommendedWorkoutId(null);
      }

    } catch (err: any) {
      toast.error("Failed to load Transformation Paths: " + err.message);
      console.error("Error fetching T-Paths:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchWorkoutsAndProfile();
  }, [fetchWorkoutsAndProfile]);

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `Last: ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  };

  const handleWorkoutClick = async (workoutId: string) => {
    // If clicking the already expanded workout, collapse it
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null);
      resetWorkoutSession();
      return;
    }
    
    // Expand the clicked workout
    setExpandedWorkoutId(workoutId);
    onWorkoutSelect(workoutId);
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
  const completedExerciseCount = completedExercises.size;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {groupedTPaths.length === 0 ? (
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
                    const isSelected = selectedWorkoutId === workout.id;
                    const isExpanded = expandedWorkoutId === workout.id;

                    return (
                      <div key={workout.id} className="space-y-2">
                        <Button
                          key={workout.id}
                          variant="outline"
                          className={cn(
                            "h-auto p-3 flex flex-col items-center justify-center text-center transition-colors relative w-full",
                            "border-2",
                            workoutBorderClass,
                            workoutBgClass,
                            isSelected && "ring-2 ring-primary",
                            "hover:brightness-90 dark:hover:brightness-110"
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
                            {isExpanded && (
                              <ChevronUp className="h-4 w-4 mt-1" />
                            )}
                          </div>
                        </Button>

                        {isExpanded && activeWorkout?.id === workout.id && (
                          <div className="ml-2 pl-2 border-l-2 border-muted">
                            {activeWorkout.id === 'ad-hoc' && (
                              <section className="mb-4 p-3 border rounded-lg bg-card">
                                <h2 className="text-lg font-semibold mb-3">Add Exercises</h2>
                                <div className="flex flex-col gap-2">
                                  <select 
                                    value={selectedExerciseToAdd}
                                    onChange={(e) => setSelectedExerciseToAdd(e.target.value)}
                                    className="w-full p-2 border rounded text-sm"
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
                                  <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd} className="text-sm py-1 px-2">
                                    <PlusCircle className="h-3 w-3 mr-1" /> Add
                                  </Button>
                                </div>
                              </section>
                            )}

                            <section className="mb-4">
                              {exercisesForSession.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-4">
                                  <Dumbbell className="h-8 w-8 text-muted-foreground mb-2" />
                                  <h2 className="text-base font-bold mb-1">No exercises</h2>
                                  <p className="text-muted-foreground text-xs mb-2">
                                    Add exercises to begin.
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
                                </div>
                              )}
                            </section>

                            {totalExercises > 0 && (
                              <WorkoutSessionFooter
                                currentSessionId={currentSessionId}
                                sessionStartTime={sessionStartTime}
                                supabase={supabase}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Ad-hoc workout card moved here */}
      <Card
        className={cn(
          "cursor-pointer hover:bg-accent transition-colors",
          selectedWorkoutId === 'ad-hoc' && "border-primary ring-2 ring-primary"
        )}
        onClick={() => onWorkoutSelect('ad-hoc')}
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