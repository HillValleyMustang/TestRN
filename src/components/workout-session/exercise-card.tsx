"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle2, Trophy, Edit, Trash2, Timer, RefreshCcw, Info, History, Menu, Play, Pause, RotateCcw } from 'lucide-react';
import { ExerciseHistoryDialog } from '@/components/exercise-history-dialog';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';
import { ExerciseProgressionDialog } from '@/components/exercise-progression-dialog';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';
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
import { toast } from 'sonner'; // Explicitly import toast

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
  workoutTemplateName: string; // New prop for the parent workout's template name
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
  workoutTemplateName, // Destructure new prop
}: ExerciseCardProps) => {
  const { session } = useSession();
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<Profile['preferred_weight_unit']>('kg');
  const [defaultRestTime, setDefaultRestTime] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultRestTime);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showCantDoDialog, setShowCantDoDialog] = useState(false);
  const [showExerciseInfoDialog, setShowExerciseInfoDialog] = useState(false);
  const [showExerciseHistoryDialog, setShowExerciseHistoryDialog] = useState(false);
  const [showExerciseProgressionDialog, setShowExerciseProgressionDialog] = useState(false);

  // Use the new workoutTemplateName prop for color classes
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
        setTimeLeft(profileData.default_rest_time_seconds || 60); // Initialize timer with default
      }
    };
    fetchUserProfile();
  }, [session, supabase]);

  const { sets, handleAddSet, handleInputChange, handleSaveSet, handleEditSet, handleDeleteSet } = useExerciseSets({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    exerciseCategory: exercise.category,
    currentSessionId,
    supabase,
    onUpdateSets: onUpdateGlobalSets,
    initialSets,
    preferredWeightUnit,
  });

  const handleSaveSetAndStartTimer = async (setIndex: number) => {
    await handleSaveSet(setIndex);
    // Manually start timer after saving
    setIsTimerRunning(true);
    setTimeLeft(defaultRestTime); // Reset timer to default time
  };

  const handleToggleTimer = () => {
    setIsTimerRunning(prev => !prev);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(defaultRestTime);
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
            // Play audio cue
            const audio = new Audio('/path/to/chime.mp3'); // You'll need to add an audio file
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

  return (
    <Card className={cn("mb-6 border-2", workoutBorderClass)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className={cn("text-xl flex items-center gap-2", workoutColorClass)}>
            {exerciseNumber}. {exercise.name}
            {exercise.is_bonus_exercise && <WorkoutBadge workoutName="Bonus">Bonus</WorkoutBadge>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{exercise.main_muscle}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="More Options">
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sets.map((set, setIndex) => (
            <div key={set.id || `new-${setIndex}`} className={cn("p-4 border rounded-md", {
              "border-primary ring-1 ring-primary": !set.isSaved, // Highlight unsaved sets
              "bg-accent/50": set.isSaved, // Subtle background for saved sets
            })}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg">Set {setIndex + 1}</h3>
                {set.isSaved && set.isPR && (
                  <span className="text-yellow-500 flex items-center text-sm font-semibold">
                    <Trophy className="h-4 w-4 mr-1" /> New PR!
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                {exercise.type === 'weight' && set.lastWeight && set.lastReps && `Last: ${formatWeight(convertWeight(set.lastWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs')} x ${set.lastReps} reps`}
                {exercise.type === 'timed' && set.lastTimeSeconds && `Last: ${set.lastTimeSeconds}s`}
                {!set.lastWeight && !set.lastReps && !set.lastTimeSeconds && "No previous data"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {exercise.type === 'weight' && (
                  <>
                    <div>
                      <label htmlFor={`weight-${setIndex}`} className="text-sm font-medium">Weight ({preferredWeightUnit})</label>
                      <Input
                        id={`weight-${setIndex}`}
                        type="number"
                        step="0.1"
                        value={convertWeight(set.weight_kg, 'kg', preferredWeightUnit as 'kg' | 'lbs') ?? ''}
                        onChange={(e) => handleInputChange(setIndex, 'weight_kg', e.target.value)}
                        disabled={set.isSaved}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor={`reps-${setIndex}`} className="text-sm font-medium">Reps</label>
                      <Input
                        id={`reps-${setIndex}`}
                        type="number"
                        value={set.reps ?? ''}
                        onChange={(e) => handleInputChange(setIndex, 'reps', e.target.value)}
                        disabled={set.isSaved}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                {exercise.type === 'timed' && (
                  <div className="col-span-2">
                    <label htmlFor={`time-${setIndex}`} className="text-sm font-medium">Time (seconds)</label>
                    <Input
                      id={`time-${setIndex}`}
                      type="number"
                      value={set.time_seconds ?? ''}
                      onChange={(e) => handleInputChange(setIndex, 'time_seconds', e.target.value)}
                      disabled={set.isSaved}
                      className="mt-1"
                    />
                  </div>
                )}
                {exercise.category === 'Unilateral' && (
                  <>
                    <div>
                      <label htmlFor={`reps-l-${setIndex}`} className="text-sm font-medium">Reps (L)</label>
                      <Input
                        id={`reps-l-${setIndex}`}
                        type="number"
                        value={set.reps_l ?? ''}
                        onChange={(e) => handleInputChange(setIndex, 'reps_l', e.target.value)}
                        disabled={set.isSaved}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor={`reps-r-${setIndex}`} className="text-sm font-medium">Reps (R)</label>
                      <Input
                        id={`reps-r-${setIndex}`}
                        type="number"
                        value={set.reps_r ?? ''}
                        onChange={(e) => handleInputChange(setIndex, 'reps_r', e.target.value)}
                        disabled={set.isSaved}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end items-center mt-4 space-x-2">
                {set.isSaved ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleEditSet(setIndex)} title="Edit Set">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(setIndex)} title="Delete Set">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => handleSaveSetAndStartTimer(setIndex)}>Save Set</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(setIndex)} title="Delete Set">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={handleAddSet}>
            <Plus className="h-4 w-4 mr-2" /> Add Set
          </Button>
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
      </CardContent>

      {/* Dialogs controlled by state */}
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
    </Card>
  );
};