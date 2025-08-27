"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle2, Trophy, Edit, Trash2, Timer, RefreshCcw, Info, History, Menu, Play, Pause, RotateCcw, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { ExerciseHistoryDialog } from '@/components/exercise-history-dialog';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';
import { ExerciseProgressionDialog } from '@/components/exercise-progression-dialog';
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
import { cn, getWorkoutColorClass } from '@/lib/utils';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator'; // Import Separator

type Profile = Tables<'profiles'>;

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseNumber: number;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateGlobalSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
  onSubstituteExercise?: (oldExerciseId: string, newExercise: WorkoutExercise) => void;
  onRemoveExercise?: (exerciseId: string) => void;
  workoutTemplateName: string;
  onFirstSetSaved: (timestamp: string) => void; // New prop
  onExerciseCompleted: (exerciseId: string, isNewPR: boolean) => void; // New prop for parent
}

export const ExerciseCard = ({
  exercise,
  exerciseNumber,
  currentSessionId,
  supabase,
  onUpdateGlobalSets,
  initialSets,
  onSubstituteExercise,
  onRemoveExercise,
  workoutTemplateName,
  onFirstSetSaved,
  onExerciseCompleted,
}: ExerciseCardProps) => {
  const { session } = useSession();
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<Profile['preferred_weight_unit']>('kg');
  const [defaultRestTime, setDefaultRestTime] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultRestTime);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isExerciseSaved, setIsExerciseSaved] = useState(false); // New state for exercise completion
  const [isExpanded, setIsExpanded] = useState(false); // New state for expand/collapse

  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showCantDoDialog, setShowCantDoDialog] = useState(false);
  const [showExerciseInfoDialog, setShowExerciseInfoDialog] = useState(false);
  const [showExerciseHistoryDialog, setShowExerciseHistoryDialog] = useState(false);
  const [showExerciseProgressionDialog, setShowExerciseProgressionDialog] = useState(false);

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
    handleSaveExercise, // New function
    exercisePR, // New state
    loadingPR,
  } = useExerciseSets({
    exerciseId: exercise.id,
    exerciseName: exercise.name, // Pass exercise.name here
    exerciseType: exercise.type,
    exerciseCategory: exercise.category,
    currentSessionId,
    supabase,
    onUpdateSets: onUpdateGlobalSets,
    initialSets,
    preferredWeightUnit,
    onFirstSetSaved, // Pass the new prop
    onExerciseComplete: async (id, isNewPR) => { // Implement the callback
      setIsExerciseSaved(true);
      onExerciseCompleted(id, isNewPR);
    },
  });

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
    const success = await handleSaveExercise();
    if (success) {
      setIsExerciseSaved(true);
      setIsExpanded(false); // Collapse the card on successful save
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
            const audio = new Audio('/path/to/chime.mp3');
            audio.play().catch(e => console.error("Error playing audio:", e));
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isNewExercisePR = !loadingPR && exercisePR && (
    (exercise.type === 'weight' && sets.reduce((totalVolume, set) => totalVolume + ((set.weight_kg || 0) * (set.reps || 0)), 0) > (exercisePR.best_volume_kg || 0)) ||
    (exercise.type === 'timed' && sets.map(set => set.time_seconds).filter((time): time is number => time !== null).length > 0 && Math.min(...sets.map(set => set.time_seconds).filter((time): time is number => time !== null)) < (exercisePR.best_time_seconds || Infinity))
  );

  // Determine if any set has valid input data
  const hasAnyInput = sets.some(s => 
    (s.weight_kg !== null && s.weight_kg > 0) || 
    (s.reps !== null && s.reps > 0) || 
    (s.time_seconds !== null && s.time_seconds > 0) || 
    (s.reps_l !== null && s.reps_l > 0) || 
    (s.reps_r !== null && s.reps_r > 0)
  );

  return (
    <> {/* Added React Fragment */}
      <Card className={cn("mb-6 border-4", workoutBorderClass)}> {/* Changed border-2 to border-4 and removed opacity-70 */}
        <CardHeader 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Left side: Exercise details */}
          <div className="flex flex-col flex-1 min-w-0"> {/* min-w-0 to allow shrinking */}
            <div className="flex items-center gap-2"> {/* Line 1: Number, Name, Bonus, Check */}
              <CardTitle className={cn("text-xl font-bold leading-none", workoutColorClass)}>
                {exerciseNumber}. {exercise.name}
              </CardTitle>
              {exercise.is_bonus_exercise && <WorkoutBadge workoutName="Bonus" className="flex-shrink-0">Bonus</WorkoutBadge>}
              {isExerciseSaved && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">{exercise.main_muscle}</p> {/* Line 2: Muscle Group */}
          </div>

          {/* Right side: Menu and Chevron */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
                <DropdownMenuItem onSelect={() => setShowExerciseProgressionDialog(true)}>
                  <Trophy className="h-4 w-4 mr-2" /> Progression
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
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="space-y-4"> {/* This div now wraps all sets and separators */}
              {sets.map((set, setIndex) => (
                <React.Fragment key={set.id || `new-${setIndex}`}>
                  <div className="space-y-1"> {/* Container for each set's content */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">Set {setIndex + 1}</h3>
                        {!set.isSaved && !isExerciseSaved && (
                          <Button variant="ghost" size="icon" onClick={() => handleSaveSetAndStartTimer(setIndex)} disabled={isExerciseSaved} title="Save Set" className="h-6 w-6">
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {set.isSaved && set.isPR && (
                          <span className="text-yellow-500 flex items-center text-xs font-semibold">
                            <Trophy className="h-3 w-3 ml-1" /> PR!
                          </span>
                        )}
                        {set.isSaved ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditSet(setIndex)} title="Edit Set" disabled={isExerciseSaved} className="h-6 w-6">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSet(setIndex)} title="Delete Set" disabled={isExerciseSaved} className="h-6 w-6">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSet(setIndex)} title="Delete Set" disabled={isExerciseSaved} className="h-6 w-6">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Input fields and 'Last' info */}
                    <div className="flex items-center gap-2">
                      {exercise.type === 'weight' && (
                        <>
                          <Input
                            id={`weight-${setIndex}`}
                            type="number"
                            step="0.1"
                            placeholder="kg"
                            value={convertWeight(set.weight_kg, 'kg', preferredWeightUnit as 'kg' | 'lbs') ?? ''}
                            onChange={(e) => handleInputChange(setIndex, 'weight_kg', e.target.value)}
                            disabled={set.isSaved || isExerciseSaved}
                            className="w-20 text-center h-8" // Added h-8 for height
                          />
                          <span className="text-muted-foreground text-sm">x</span>
                          <Input
                            id={`reps-${setIndex}`}
                            type="number"
                            placeholder="reps"
                            value={set.reps ?? ''}
                            onChange={(e) => handleInputChange(setIndex, 'reps', e.target.value)}
                            disabled={set.isSaved || isExerciseSaved}
                            className="w-20 text-center h-8" // Added h-8 for height
                          />
                        </>
                      )}
                      {exercise.type === 'timed' && (
                        <Input
                          id={`time-${setIndex}`}
                          type="number"
                          placeholder="Time (seconds)"
                          value={set.time_seconds ?? ''}
                          onChange={(e) => handleInputChange(setIndex, 'time_seconds', e.target.value)}
                          disabled={set.isSaved || isExerciseSaved}
                          className="flex-1 h-8" // Added h-8 for height
                        />
                      )}
                      {exercise.category === 'Unilateral' && (
                        <>
                          <Input
                            id={`reps-l-${setIndex}`}
                            type="number"
                            placeholder="Reps (L)"
                            value={set.reps_l ?? ''}
                            onChange={(e) => handleInputChange(setIndex, 'reps_l', e.target.value)}
                            disabled={set.isSaved || isExerciseSaved}
                            className="flex-1 h-8"
                          />
                          <Input
                            id={`reps-r-${setIndex}`}
                            type="number"
                            placeholder="Reps (R)"
                            value={set.reps_r ?? ''}
                            onChange={(e) => handleInputChange(setIndex, 'reps_r', e.target.value)}
                            disabled={set.isSaved || isExerciseSaved}
                            className="flex-1 h-8"
                          />
                        </>
                      )}
                    </div>
                    {(set.lastWeight || set.lastReps || set.lastTimeSeconds) && (
                      <p className="text-muted-foreground text-xs mt-1 text-right"> {/* Aligned right */}
                        Last: {exercise.type === 'weight' ?
                          `${set.lastWeight ? formatWeight(convertWeight(set.lastWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs') : ''} x ${set.lastReps || ''}` :
                          `${set.lastTimeSeconds ? `${set.lastTimeSeconds}s` : ''}`}
                      </p>
                    )}
                  </div>
                  {setIndex < sets.length - 1 && <Separator className="my-4" />} {/* Separator between sets */}
                </React.Fragment>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4">
              {sets.length < 5 && (
                <Button variant="outline" onClick={handleAddSet} disabled={isExerciseSaved}>
                  <Plus className="h-4 w-4 mr-2" /> Add Set
                </Button>
              )}
              {sets.length >= 5 && <div />} {/* Spacer to keep layout consistent */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleTimer}
                  className="w-24 justify-center"
                >
                  {isTimerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {formatTime(timeLeft)}
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
                    "bg-orange-500 text-black hover:bg-orange-600": hasAnyInput && !isExerciseSaved,
                    "bg-green-700 text-white hover:bg-green-800": isExerciseSaved,
                  }
                )}
                onClick={handleCompleteExercise}
                disabled={!hasAnyInput} // Only disable if no input
              >
                {isExerciseSaved ? (
                  <span className="flex items-center">
                    Saved
                    {isNewExercisePR && <Trophy className="h-4 w-4 ml-2 fill-white text-white" />}
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
      <ExerciseProgressionDialog
        open={showExerciseProgressionDialog}
        onOpenChange={setShowExerciseProgressionDialog}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        exerciseType={exercise.type}
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
    </>
  );
};