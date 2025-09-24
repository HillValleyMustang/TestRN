"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Dumbbell, Settings, Sparkles, Search, Heart, Home, Filter, ChevronsUpDown, Check } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, GroupedTPath, SetLogState, WorkoutExercise, FetchedExerciseDefinition, Profile, ExerciseDefinition } from '@/types/supabase';
import { cn, formatTimeAgo, getPillStyles } from '@/lib/utils';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { WorkoutBadge } from '../workout-badge';
import { LoadingOverlay } from '../loading-overlay';
import { useSession } from '@/components/session-context-provider';
import { WorkoutPill, WorkoutPillProps } from '@/components/workout-flow/workout-pill';
import { EditWorkoutExercisesDialog } from '../manage-t-paths/edit-workout-exercises-dialog';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutAwareLink } from './workout-aware-link';
import { AnalyseGymButton } from "@/components/manage-exercises/exercise-form/analyze-gym-button";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { useGym } from '@/components/gym-context-provider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { SetupGymPlanPrompt } from '../manage-t-paths/setup-gym-plan-prompt';
import { useRouter } from 'next/navigation';

type TPath = Tables<'t_paths'>;

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
  profile: Profile | null;
  isWorkoutSessionStarted: boolean;
  availableMuscleGroups: string[];
  userGyms: Tables<'gyms'>[];
  exerciseGymsMap: Record<string, string[]>;
  availableGymExerciseIds: Set<string>; // NEW
  allGymExerciseIds: Set<string>; // NEW
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
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
  } else { // push-pull-legs
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
  profile,
  isWorkoutSessionStarted,
  availableMuscleGroups,
  userGyms,
  exerciseGymsMap,
  availableGymExerciseIds, // NEW
  allGymExerciseIds, // NEW
  setTempStatusMessage, // NEW
}: WorkoutSelectorProps) => {
  const { supabase, session, memoizedSessionUserId } = useSession();
  const { activeGym } = useGym();
  const router = useRouter();
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [adHocExerciseSourceFilter, setAdHocExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [showSaveAiExercisePrompt, setShowSaveAiExercisePrompt] = useState(false);
  const [aiIdentifiedExercise, setAiIdentifiedExercise] = useState<Partial<FetchedExerciseDefinition> | null>(null);
  const [isAiSaving, setIsAiSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [gymFilter, setGymFilter] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const activeTPathId = profile?.active_t_path_id;
  const activeTPathGroup = activeTPathId ? groupedTPaths.find(group => group.mainTPath.id === activeTPathId) : null;

  const isGymConfigured = useMemo(() => {
    if (!activeGym || groupedTPaths.length === 0) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths]);

  const exercisesForCombobox = useMemo(() => {
    if (!memoizedSessionUserId) return [];

    return allAvailableExercises
      .filter(ex => {
        if (adHocExerciseSourceFilter === 'my-exercises') return ex.user_id === memoizedSessionUserId;
        if (adHocExerciseSourceFilter === 'global-library') return ex.user_id === null;
        return false;
      })
      .filter(ex => {
        return muscleFilter === 'all' || ex.main_muscle === muscleFilter;
      })
      .filter(ex => {
        if (gymFilter === 'all') return true;
        const exerciseGyms = exerciseGymsMap[ex.id as string] || [];
        return exerciseGyms.includes(userGyms.find(g => g.id === gymFilter)?.name || '');
      })
      .filter(ex => {
        if (!showFavoritesOnly) return true;
        return ex.is_favorite || ex.is_favorited_by_current_user;
      })
      .filter(ex => {
        return ex.name!.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => a.name!.localeCompare(b.name!));
  }, [
    allAvailableExercises, adHocExerciseSourceFilter, searchTerm,
    muscleFilter, gymFilter, showFavoritesOnly,
    exercisesForSession, memoizedSessionUserId, exerciseGymsMap, userGyms
  ]);

  const handleWorkoutClick = (workoutId: string) => {
    selectWorkout(workoutId);
  };

  const handleAdHocClick = () => {
    selectWorkout('ad-hoc');
  };

  const handleAddExercise = () => {
    if (!selectedExerciseToAdd) {
      setTempStatusMessage({ message: "Select exercise!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    const exercise = allAvailableExercises.find((ex: FetchedExerciseDefinition) => ex.id === selectedExerciseToAdd);
    if (exercise) {
      addExerciseToSession(exercise as ExerciseDefinition); 
      setSelectedExerciseToAdd("");
    } else {
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  };

  const handleExerciseIdentified = useCallback((exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => {
    if (exercises.length > 0) {
      setAiIdentifiedExercise(exercises[0]);
      setShowSaveAiExercisePrompt(true);
    } else {
      setTempStatusMessage({ message: "No exercises identified!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  }, [setAiIdentifiedExercise, setShowSaveAiExercisePrompt, setTempStatusMessage]);

  const handleSaveAiExerciseToMyExercises = useCallback(async (exercise: Partial<FetchedExerciseDefinition>) => {
    if (!memoizedSessionUserId) {
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
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
        user_id: memoizedSessionUserId,
        library_id: null,
        is_favorite: false,
        created_at: new Date().toISOString(),
        movement_type: exercise.movement_type,
        movement_pattern: exercise.movement_pattern,
      }]).select('*').single();

      if (insertError) {
        if (insertError.code === '23505') {
          setTempStatusMessage({ message: "Duplicate!", type: 'error' });
          const existingUserExercise = allAvailableExercises.find(ex => ex.name?.trim().toLowerCase() === exercise.name?.trim().toLowerCase() && ex.user_id === memoizedSessionUserId);
          if (existingUserExercise) {
            finalExerciseToAdd = existingUserExercise as ExerciseDefinition;
          } else {
             throw insertError;
          }
        } else {
          throw insertError;
        }
      } else {
        setTempStatusMessage({ message: "Added!", type: 'success' });
        finalExerciseToAdd = insertedExercise as ExerciseDefinition;
      }

      if (finalExerciseToAdd) {
        await addExerciseToSession(finalExerciseToAdd);
        setTempStatusMessage({ message: "Added!", type: 'success' });
      } else {
        throw new Error("Could not find the exercise to add to workout.");
      }

      refreshAllData();
      setShowSaveAiExercisePrompt(false);
      setAiIdentifiedExercise(null);

    } catch (err: any) {
      console.error("Failed to save AI identified exercise and add to workout:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
    } finally {
      setIsAiSaving(false);
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  }, [memoizedSessionUserId, supabase, allAvailableExercises, addExerciseToSession, refreshAllData, setShowSaveAiExercisePrompt, setAiIdentifiedExercise, setIsAiSaving, setTempStatusMessage]);

  const handleAddAiExerciseToWorkoutOnly = useCallback(async (exercise: Partial<FetchedExerciseDefinition>) => {
    if (!memoizedSessionUserId) {
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    setIsAiSaving(true);
    try {
      let finalExerciseToAdd: ExerciseDefinition | null = null;

      const existingExercise = allAvailableExercises.find(ex => 
        ex.name?.trim().toLowerCase() === exercise.name?.trim().toLowerCase() && 
        (ex.user_id === memoizedSessionUserId || ex.user_id === null)
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
          user_id: memoizedSessionUserId,
          library_id: null,
          is_favorite: false,
          created_at: new Date().toISOString(),
          movement_type: exercise.movement_type,
          movement_pattern: exercise.movement_pattern,
        }]).select('*').single();

        if (insertError) {
          if (insertError.code === '23505') {
            setTempStatusMessage({ message: "Duplicate!", type: 'error' });
            const existingUserExercise = allAvailableExercises.find(ex => ex.name?.trim().toLowerCase() === exercise.name?.trim().toLowerCase() && ex.user_id === memoizedSessionUserId);
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
        setTempStatusMessage({ message: "Added!", type: 'success' });
      } else {
        throw new Error("Could not find or create the exercise to add to workout.");
      }

      refreshAllData();
      setShowSaveAiExercisePrompt(false);
      setAiIdentifiedExercise(null);

    } catch (err: any) {
      console.error("Failed to add AI identified exercise to workout only:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
    } finally {
      setIsAiSaving(false);
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  }, [memoizedSessionUserId, supabase, allAvailableExercises, addExerciseToSession, refreshAllData, setShowSaveAiExercisePrompt, setAiIdentifiedExercise, setIsAiSaving, setTempStatusMessage]);


  const totalExercises = exercisesForSession.length;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {loadingWorkoutFlow ? (
            <p className="text-muted-foreground text-center py-4">Loading Transformation Paths...</p>
          ) : !activeGym ? (
            <Card>
              <CardHeader><CardTitle>No Active Gym</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Please add a gym in your profile settings to begin.</p>
                <Button onClick={() => router.push('/profile')} className="mt-4">Go to Profile Settings</Button>
              </CardContent>
            </Card>
          ) : !isGymConfigured ? (
            <SetupGymPlanPrompt gym={activeGym} onSetupSuccess={refreshAllData} profile={profile} setTempStatusMessage={setTempStatusMessage} />
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
                <div className="flex flex-col gap-3 mb-3">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Tabs value={adHocExerciseSourceFilter} onValueChange={(value) => setAdHocExerciseSourceFilter(value as 'my-exercises' | 'global-library')} className="flex-grow">
                      <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="my-exercises" className="text-xs">My Exercises</TabsTrigger>
                        <TabsTrigger value="global-library" className="text-xs">Global Library</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Select onValueChange={setMuscleFilter} value={muscleFilter}>
                      <SelectTrigger className="flex-1 h-8 text-xs min-w-[120px]">
                        <SelectValue placeholder="Muscle Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Muscles</SelectItem>
                        {availableMuscleGroups.map(muscle => (
                          <SelectItem key={muscle} value={muscle}>
                            {muscle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select onValueChange={setGymFilter} value={gymFilter} disabled={userGyms.length === 0}>
                      <SelectTrigger className="flex-1 h-8 text-xs min-w-[100px]">
                        <SelectValue placeholder="Gym" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Gyms</SelectItem>
                        {userGyms.map(gym => (
                          <SelectItem key={gym.id} value={gym.id}>
                            {gym.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant={showFavoritesOnly ? "default" : "outline"}
                      size="icon"
                      onClick={() => setShowFavoritesOnly(prev => !prev)}
                      className="h-8 w-8 flex-shrink-0"
                      title="Show Favorites Only"
                    >
                      <Heart className={cn("h-4 w-4", showFavoritesOnly ? "fill-white text-white" : "text-muted-foreground")} />
                    </Button>
                  </div>

                  {/* Combobox and Add Button */}
                  <div className="flex gap-2">
                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboboxOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedExerciseToAdd
                            ? allAvailableExercises.find(ex => ex.id === selectedExerciseToAdd)?.name
                            : "Select exercise..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search exercises..."
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No exercise found.</CommandEmpty>
                            <CommandGroup>
                              {exercisesForCombobox.map((exercise) => (
                                <CommandItem
                                  key={exercise.id}
                                  value={exercise.name!}
                                  onSelect={() => {
                                    setSelectedExerciseToAdd(exercise.id!);
                                    setIsComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedExerciseToAdd === exercise.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {exercise.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd} className="flex-shrink-0">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
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
<dyad-problem-report summary="4 problems">
<problem file="src/components/layout/header.tsx" line="94" column="13" code="2322">Type '{ message: string; type: &quot;added&quot; | &quot;removed&quot; | &quot;success&quot; | &quot;error&quot;; } | null' is not assignable to type '{ message: string; type: &quot;added&quot; | &quot;removed&quot; | &quot;success&quot;; } | null'.
  Type '{ message: string; type: &quot;added&quot; | &quot;removed&quot; | &quot;success&quot; | &quot;error&quot;; }' is not assignable to type '{ message: string; type: &quot;added&quot; | &quot;removed&quot; | &quot;success&quot;; }'.
    Types of property 'type' are incompatible.
      Type '&quot;added&quot; | &quot;removed&quot; | &quot;success&quot; | &quot;error&quot;' is not assignable to type '&quot;added&quot; | &quot;removed&quot; | &quot;success&quot;'.
        Type '&quot;error&quot;' is not assignable to type '&quot;added&quot; | &quot;removed&quot; | &quot;success&quot;'.</problem>
<problem file="src/app/(app)/layout.tsx" line="44" column="13" code="2322">Type '(message: { message: string; type: &quot;added&quot; | &quot;removed&quot; | &quot;success&quot; | &quot;error&quot;; } | null) =&gt; void' is not assignable to type '{ message: string; type: &quot;added&quot; | &quot;removed&quot; | &quot;success&quot; | &quot;error&quot;; }'.</problem>
<problem file="src/app/(app)/manage-exercises/page.tsx" line="371" column="10" code="2741">Property 'setTempStatusMessage' is missing in type '{ open: true; onOpenChange: () =&gt; void; exercise: FetchedExerciseDefinition; onSaveSuccess: () =&gt; void; }' but required in type 'EditExerciseDialogProps'.</problem>
<problem file="src/app/(app)/profile/page.tsx" line="401" column="22" code="2741">Property 'setTempStatusMessage' is missing in type '{ form: UseFormReturn&lt;{ full_name: string; weight_kg?: number | null | undefined; primary_goal?: string | null | undefined; preferred_session_length?: string | null | undefined; height_cm?: number | null | undefined; body_fat_pct?: number | ... 1 more ... | undefined; health_notes?: string | ... 1 more ... | undefin...' but required in type 'ProfileSettingsTabProps'.</problem>
</dyad-problem-report>You're absolutely right! My apologies for missing these in the previous round. It seems there were a few more places where the `setTempStatusMessage` prop needed to be passed down or its type definition adjusted.

Here's a breakdown of the fixes:

1.  **`src/components/layout/header.tsx`**: The `tempStatusMessage` prop in `RollingStatusBadge` was expecting a type without `'error'`. I've updated the `RollingStatusBadgeProps` interface to correctly include `'error'` as a valid type.
2.  **`src/app/(app)/layout.tsx`**: The `tempStatusMessage` prop in `Header` was receiving the `setTempStatusMessage` *function* instead of the `tempStatusMessage` *state value*. I've corrected this to pass the state value.
3.  **`src/app/(app)/manage-exercises/page.tsx`**: The `EditExerciseDialog` component was missing the `setTempStatusMessage` prop. I've added it.
4.  **`src/app/(app)/profile/page.tsx`**: The `ProfileSettingsTab` component was missing the `setTempStatusMessage` prop. I've added it.

These changes should resolve all the remaining TypeScript compile-time errors.

<dyad-write path="src/components/layout/header.tsx" description="Updated `RollingStatusBadgeProps` to include 'error' type for `tempStatusMessage`.">
"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Home, Dumbbell, LayoutTemplate, History, User, BarChart3, PanelLeft, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserNav } from "./user-nav";
import { NotificationBell } from "./notification-bell";
import { ActivityLoggingDialog } from "../activity-logging-dialog";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import { cn } from "@/lib/utils";
import { RollingStatusBadge } from "./rolling-status-badge";
import { WorkoutAwareLink } from "../workout-flow/workout-aware-link"; // Import WorkoutAwareLink
import { usePathname } from "next/navigation"; // Import usePathname to check active link

const mobileNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home }, // Reverted to Dashboard
  { href: "/workout-history", label: "History", icon: History },
  { href: "/activity-logs", label: "Activities", icon: BarChart3 },
  { href: "/manage-exercises", label: "Exercises", icon: Dumbbell },
  { href: "/manage-t-paths", label: "Management", icon: LayoutTemplate }, // CHANGED LABEL
  { href: "/profile", label: "Profile", icon: User },
  { href: "/workout", label: "Workout", icon: Dumbbell }, // Moved workout here for consistent styling
];

interface HeaderProps {
  isGeneratingPlan: boolean;
  tempStatusMessage: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null; // NEW
}

export function Header({ isGeneratingPlan, tempStatusMessage }: HeaderProps) { // NEW PROP
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // NEW: State for sheet
  const isScrolled = useScrollPosition();
  const pathname = usePathname(); // Get current pathname

  return (
    <>
      <header className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 sm:static sm:h-auto sm:border-0 sm:px-6",
        "transition-all duration-300 ease-in-out",
        isScrolled ? "bg-background/80 backdrop-blur-md border-b-transparent" : "bg-background border-b"
      )}>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}> {/* Bind state */}
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <span>
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <nav className="grid gap-1 text-lg font-medium overflow-y-auto h-full py-1"> {/* Reduced gap, py */}
              {mobileNavLinks.map(link => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <WorkoutAwareLink
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors", // Adjusted px, py, gap
                      isActive 
                        ? "bg-action text-action-foreground font-semibold shadow-md" 
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsSheetOpen(false)} // NEW: Close sheet on click
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-action-foreground" : "text-primary")} /> {/* Reduced h/w */}
                    {link.label}
                  </WorkoutAwareLink>
                );
              })}
              <hr className="my-2" />
              <Button 
                variant="default" 
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg justify-start text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90" // Styled as a primary button
                onClick={() => {
                  setIsActivityLogOpen(true);
                  setIsSheetOpen(false); // NEW: Close sheet on click
                }}
              >
                <Plus className="h-4 w-4 text-primary-foreground" /> {/* Reduced h/w */}
                Log Activity
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="relative ml-auto flex flex-1 items-center justify-end gap-2 md:grow-0">
          <RollingStatusBadge 
            isGeneratingPlan={isGeneratingPlan} 
            tempStatusMessage={tempStatusMessage} // NEW
          />
          <NotificationBell />
          <UserNav />
        </div>
      </header>

      <ActivityLoggingDialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen} />
    </>
  );
}