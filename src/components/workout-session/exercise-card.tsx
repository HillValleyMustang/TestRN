"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, Trophy, Edit, Trash2, Timer, RefreshCcw, Info, History, Menu, Play, Pause, RotateCcw, Save, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { ExerciseHistoryDialog } from '@/components/exercise-history-dialog';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';
import { Tables, SetLogState, WorkoutExercise, UserExercisePR } from '@/types/supabase';
import { useExerciseSets } from '@/hooks/use-exercise-sets';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@/components/session-context-provider';
import { formatWeight, convertWeight } from '@/lib/unit-conversions';
import { ExerciseSwapDialog } from './exercise-swap-dialog';
import { CantDoToggle } from './cant-do-toggle';
import { WorkoutBadge } from '../workout-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

type Profile = Tables<'profiles'>;

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseNumber: number;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateGlobalSets: (exerciseId: string, newSets: SetLogState[]) => void;
  onSubstituteExercise?: (oldExerciseId: string, newExercise: WorkoutExercise) => void;
  onRemoveExercise?: (exerciseId: string) => void;
  workoutTemplateName: string;
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  onExerciseCompleted: (exerciseId: string, isNewPR: boolean) => void;
  isInitiallyCollapsed?: boolean; // NEW PROP
}

export const ExerciseCard = ({
  exercise,
  exerciseNumber,
  currentSessionId,
  supabase,
  onUpdateGlobalSets,
  onSubstituteExercise,
  onRemoveExercise,
  workoutTemplateName,
  onFirstSetSaved,
  onExerciseCompleted,
  isInitiallyCollapsed = false, // Default to false (expanded)
}: ExerciseCardProps) => {
  const { session } = useSession();
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<Profile['preferred_weight_unit']>('kg');
  const [defaultRestTime, setDefaultRestTime] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultRestTime);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isExpanded, setIsExpanded] = useState(!isInitiallyCollapsed); // Initialize based on prop

  // State for dialogs
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showCantDoDialog, setShowCantDoDialog] = useState(false);
  const [showExerciseInfoDialog, setShowExerciseInfoDialog] = useState(false);
  const [showExerciseHistoryDialog, setShowExerciseHistoryDialog] = useState(false);

  const workoutColorClass = getWorkoutColorClass(workoutTemplateName, 'text');
  const workoutBorderClass = getWorkoutColorClass(workoutTemplateName, 'border');
  const workoutBgClass = getWorkoutColorClass(workoutTemplateName, 'bg');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) return;
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('preferred_weight_unit, default_rest_time_seconds')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile for units/rest time:", error);
      } else if (profileData) {
        setPreferredWeightUnit(profileData.preferred_weight_unit || 'kg');
        setDefaultRestTime(profileData.default_rest_time_seconds || 60);
        setTimeLeft(profileData.default_rest_time_seconds || 60);
      }
    };
    fetchUserProfile();
  }, [session, supabase]);

  const {
    sets,
    handleAddSet,
    handleInputChange,
    handleSaveSet,
    handleEditSet,
    handleDeleteSet,
    handleSaveExercise,
    exercisePR,
    loadingPR,
    handleSuggestProgression,
    isAllSetsSaved,
  } = useExerciseSets({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseType: exercise.type,
    exerciseCategory: exercise.category,
    currentSessionId,
    supabase,
    onUpdateSets: onUpdateGlobalSets,
    preferredWeightUnit,
    onFirstSetSaved: onFirstSetSaved,
    onExerciseCompleted: async (id, isNewPR) => {
      onExerciseCompleted(id, isNewPR);
    },
    workoutTemplateName,
    exerciseNumber,
  });

  // Derived state for trophy icon visibility
  const hasAchievedPRInSession = useMemo(() => {
    return sets.some(set => set.is_pb);
  }, [sets]);

  const handleSaveSetAndStartTimer = async (setIndex: number) => {
    await handleSaveSet(setIndex);
    setIsTimerRunning(true);
    setTimeLeft(defaultRestTime);
  };

  const handleToggleTimer = () => {
    setIsTimerRunning(prev => !prev);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(defaultRestTime);
  };

  const handleCompleteExercise = async () => {
    const { success, isNewPR } = await handleSaveExercise();
    if (success) {
      setIsExpanded(false);
    }
  };

  useEffect(() => {
    if (isTimerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setIsTimerRunning(false);
            toast.info("Rest time is over!");
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, defaultRestTime]);

  const formatTimeDisplay = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const hasAnyInput = sets.some(s => 
    (s.weight_kg !== null && s.weight_kg > 0) || 
    (s.reps !== null && s.reps > 0) || 
    (s.time_seconds !== null && s.time_seconds > 0) || 
    (s.reps_l !== null && s.reps_l > 0) || 
    (s.reps_r !== null && s.reps_r > 0)
  );

  return (
    <React.Fragment>
      <Card className={cn("mb-6 border-2 relative", workoutBorderClass, { "opacity-70": isAllSetsSaved })}>
        <CardHeader 
          className="p-0 cursor-pointer relative"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  {isAllSetsSaved && hasAchievedPRInSession && (
                    <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  )}
                  <CardTitle className={cn("text-lg font-semibold leading-none", workoutColorClass)}>
                    {exerciseNumber}. {exercise.name}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">{exercise.main_muscle}</p>
              </div>
              {exercise.is_bonus_exercise && <WorkoutBadge workoutName="Bonus" className="flex-shrink-0">Bonus</WorkoutBadge>}
            </div>

            <div className="flex items-center justify-between">
              {exercise.icon_url && (
                <img
                  src={exercise.icon_url}
                  alt={`${exercise.name} icon`}
                  className="h-10 w-10 object-contain flex-shrink-0 rounded-sm"
                />
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAllSetsSaved && (
                  <Check className="h-8 w-8 text-green-500" />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="More Options" onClick={(e) => e.stopPropagation()}>
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setShowExerciseHistoryDialog(true)}>
                      <History className="h-4 w-4 mr-2" /> History
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowExerciseInfoDialog(true)}>
                      <Info className="h-4 w-4 mr-2" /> Info
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowSwapDialog(true)}>
                      <RefreshCcw className="h-4 w-4 mr-2" /> Swap Exercise
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowCantDoDialog(true)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Can't Do
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} title={isExpanded ? "Collapse" : "Expand"}>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pb-16">
            <div className="space-y-4">
              {sets.map((set, setIndex) => (
                <React.Fragment key={set.id || `new-${setIndex}`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">Set {setIndex + 1}</h3>
                        {(set.lastWeight != null || set.lastReps != null || set.lastRepsL != null || set.lastRepsR != null || set.lastTimeSeconds != null) && (
                          <span className="text-muted-foreground text-xs">
                            (Last: {exercise.type === 'weight' ?
                              `${set.lastWeight != null ? formatWeight(convertWeight(set.lastWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs') : '-'} x ${exercise.category === 'Unilateral' ? `${set.lastRepsL != null ? set.lastRepsL : '-'} L / ${set.lastRepsR != null ? set.lastRepsR : '-'} R` : (set.lastReps != null ? set.lastReps : '-')}` :
                              `${set.lastTimeSeconds != null ? `${set.lastTimeSeconds}s` : '-'}`})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {set.isSaved && set.isPR && (
                          <span className="text-yellow-500 flex items-center text-xs font-semibold">
                            <Trophy className="h-3 w-3" /> PR!
                          </span>
                        )}
                        {!set.isSaved && !isAllSetsSaved && (
                          <Button variant="ghost" size="icon" onClick={() => handleSaveSetAndStartTimer(setIndex)} disabled={isAllSetsSaved} title="Save Set" className="h-6 w-6">
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                        {set.isSaved && !isAllSetsSaved && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditSet(setIndex)} title="Edit Set" className="h-6 w-6">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {!isAllSetsSaved && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSet(setIndex)} title="Delete Set" className="h-6 w-6">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {exercise.type === 'weight' && (
                        <>
                          <Input
                            id={`weight-${setIndex}`}
                            type="number"
                            step="0.1"
                            placeholder="kg"
                            value={convertWeight(set.weight_kg, 'kg', preferredWeightUnit as 'kg' | 'lbs') ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setIndex, 'weight_kg', e.target.value)}
                            disabled={set.isSaved || isAllSetsSaved}
                            className="w-20 text-center h-8 text-xs"
                          />
                          <span className="text-muted-foreground text-xs">x</span>
                          {exercise.category === 'Unilateral' ? (
                            <>
                              <Input
                                id={`reps-l-${setIndex}`}
                                type="number"
                                placeholder="L"
                                value={set.reps_l ?? ''}
                                onChange={(e) => handleInputChange(setIndex, 'reps_l', e.target.value)}
                                disabled={set.isSaved || isAllSetsSaved}
                                className="w-20 h-8 text-xs"
                              />
                              <Input
                                id={`reps-r-${setIndex}`}
                                type="number"
                                placeholder="R"
                                value={set.reps_r ?? ''}
                                onChange={(e) => handleInputChange(setIndex, 'reps_r', e.target.value)}
                                disabled={set.isSaved || isAllSetsSaved}
                                className="w-20 h-8 text-xs"
                              />
                            </>
                          ) : (
                            <Input
                              id={`reps-${setIndex}`}
                              type="number"
                              placeholder="reps"
                              value={set.reps ?? ''}
                              onChange={(e) => handleInputChange(setIndex, 'reps', e.target.value)}
                              disabled={set.isSaved || isAllSetsSaved}
                              className="w-20 text-center h-8 text-xs"
                            />
                          )}
                        </>
                      )}
                      {exercise.type === 'timed' && (
                        <Input
                          id={`time-${setIndex}`}
                          type="number"
                          placeholder="Time (seconds)"
                          value={set.time_seconds ?? ''}
                          onChange={(e) => handleInputChange(setIndex, 'time_seconds', e.target.value)}
                          disabled={set.isSaved || isAllSetsSaved}
                          className="flex-1 h-8 text-xs"
                        />
                      )}
                    </div>
                  </div>
                  {setIndex < sets.length - 1 && <Separator className="my-4" />}
                </React.Fragment>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 gap-2">
              <div className="flex gap-2">
                {sets.length < 5 && (
                  <Button variant="outline" onClick={handleAddSet} disabled={isAllSetsSaved} size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" onClick={handleSuggestProgression} disabled={isAllSetsSaved} size="icon" className="h-8 w-8">
                  <Lightbulb className="h-4 w-4 text-orange-500" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleTimer}
                  className="w-24 justify-center"
                >
                  {isTimerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {formatTimeDisplay(timeLeft)}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleResetTimer} title="Reset Timer">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Button
                className={cn(
                  "w-full",
                  {
                    "bg-orange-500 text-black hover:bg-orange-600": hasAnyInput && !isAllSetsSaved,
                    "bg-green-700 text-white hover:bg-green-800": isAllSetsSaved,
                  }
                )}
                onClick={handleCompleteExercise}
                disabled={!hasAnyInput}
              >
                {isAllSetsSaved ? (
                  <span className="flex items-center">
                    Saved
                    {hasAchievedPRInSession && <Trophy className="h-4 w-4 ml-2 fill-white text-white" />}
                  </span>
                ) : (
                  <span className="flex items-center">
                    Save Exercise
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <ExerciseHistoryDialog
        open={showExerciseHistoryDialog}
        onOpenChange={setShowExerciseHistoryDialog}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        exerciseType={exercise.type}
        exerciseCategory={exercise.category}
      />
      <ExerciseInfoDialog
        open={showExerciseInfoDialog}
        onOpenChange={setShowExerciseInfoDialog}
        exercise={exercise}
      />
      <ExerciseSwapDialog
        open={showSwapDialog}
        onOpenChange={setShowSwapDialog}
        currentExercise={exercise}
        onSwap={(newExercise) => {
          if (onSubstituteExercise) {
            onSubstituteExercise(exercise.id, { ...newExercise, is_bonus_exercise: exercise.is_bonus_exercise });
          }
          setShowSwapDialog(false);
        }}
      />
      <CantDoToggle
        open={showCantDoDialog}
        onOpenChange={setShowCantDoDialog}
        exercise={exercise}
        onRemove={() => {
          if (onRemoveExercise) {
            onRemoveExercise(exercise.id);
          }
          setShowCantDoDialog(false);
        }}
        onSubstitute={(newExercise) => {
          if (onSubstituteExercise) {
            onSubstituteExercise(exercise.id, { ...newExercise, is_bonus_exercise: exercise.is_bonus_exercise });
          }
          setShowCantDoDialog(false);
        }}
      />
    </React.Fragment>
  );
};