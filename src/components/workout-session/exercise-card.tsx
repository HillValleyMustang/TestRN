"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle2, Trophy, Edit, Trash2, Timer, RefreshCcw, Info, History } from 'lucide-react';
import { ExerciseHistoryDialog } from '@/components/exercise-history-dialog';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';
import { ExerciseProgressionDialog } from '@/components/exercise-progression-dialog';
import { Tables, SetLogState } from '@/types/supabase';
import { useExerciseSets } from '@/hooks/use-exercise-sets';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@/components/session-context-provider';
import { formatWeight, convertWeight } from '@/lib/unit-conversions';
import { RestTimer } from './rest-timer';
import { ExerciseSwapDialog } from './exercise-swap-dialog';
import { CantDoToggle } from './cant-do-toggle';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateGlobalSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
  onSubstituteExercise?: (oldExerciseId: string, newExercise: ExerciseDefinition) => void;
  onRemoveExercise?: (exerciseId: string) => void;
}

export const ExerciseCard = ({ 
  exercise, 
  currentSessionId, 
  supabase, 
  onUpdateGlobalSets, 
  initialSets,
  onSubstituteExercise,
  onRemoveExercise
}: ExerciseCardProps) => {
  const { session } = useSession();
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<Profile['preferred_weight_unit']>('kg');
  const [defaultRestTime, setDefaultRestTime] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) return;
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('preferred_weight_unit, default_rest_time_seconds') // Specify columns
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile for units/rest time:", error);
      } else if (profileData) {
        setPreferredWeightUnit(profileData.preferred_weight_unit || 'kg');
        setDefaultRestTime(profileData.default_rest_time_seconds || 60);
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
    preferredWeightUnit, // Pass preferred unit to hook
  });

  const handleSaveSetAndStartTimer = async (setIndex: number) => {
    await handleSaveSet(setIndex);
    setIsTimerRunning(true);
  };

  const handleSwapExercise = (newExercise: ExerciseDefinition) => {
    // This is a placeholder for the actual swap logic.
    // In a real application, you'd likely want to replace the current exercise card
    // with a new one for the swapped exercise, and potentially remove the old one.
    // For now, we'll just log it and close the dialog.
    console.log(`Swapping ${exercise.name} with ${newExercise.name}`);
    setShowSwapDialog(false);
    // A more complete implementation would involve updating the parent component's state
    // to replace this ExerciseCard with a new one for newExercise.
    // For example, by calling a prop like `onExerciseSwap(exercise.id, newExercise)`.
  };

  const handleSubstitute = (newExercise: ExerciseDefinition) => {
    if (onSubstituteExercise) {
      onSubstituteExercise(exercise.id, newExercise);
    }
  };

  const handleRemove = () => {
    if (onRemoveExercise) {
      onRemoveExercise(exercise.id);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{exercise.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{exercise.main_muscle}</p>
        </div>
        <div className="flex space-x-2">
          <ExerciseHistoryDialog
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            exerciseType={exercise.type}
            exerciseCategory={exercise.category}
          />
          <ExerciseInfoDialog exercise={exercise} />
          <ExerciseProgressionDialog
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            exerciseType={exercise.type}
          />
          <Button variant="outline" size="icon" title="Swap Exercise" onClick={() => setShowSwapDialog(true)}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <CantDoToggle 
            exercise={exercise} 
            onRemove={handleRemove}
            onSubstitute={handleSubstitute}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Set</TableHead>
              <TableHead>Hint</TableHead>
              <TableHead>Weight ({preferredWeightUnit})</TableHead>
              <TableHead>Reps</TableHead>
              {exercise.type === 'timed' && <TableHead>Time (s)</TableHead>}
              {exercise.category === 'Unilateral' && (
                <>
                  <TableHead>Reps (L)</TableHead>
                  <TableHead>Reps (R)</TableHead>
                </>
              )}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sets.map((set, setIndex) => (
              <TableRow key={set.id || `new-${setIndex}`}>
                <TableCell>{setIndex + 1}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {exercise.type === 'weight' && set.lastWeight && set.lastReps && `Last: ${formatWeight(convertWeight(set.lastWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs')} x ${set.lastReps} reps`}
                  {exercise.type === 'timed' && set.lastTimeSeconds && `Last: ${set.lastTimeSeconds}s`}
                  {!set.lastWeight && !set.lastReps && !set.lastTimeSeconds && "-"}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={convertWeight(set.weight_kg, 'kg', preferredWeightUnit as 'kg' | 'lbs') ?? ''}
                    onChange={(e) => handleInputChange(setIndex, 'weight_kg', e.target.value)}
                    disabled={set.isSaved || exercise.type === 'timed'}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={set.reps ?? ''}
                    onChange={(e) => handleInputChange(setIndex, 'reps', e.target.value)}
                    disabled={set.isSaved || exercise.type === 'timed'}
                    className="w-20"
                  />
                </TableCell>
                {exercise.type === 'timed' && (
                  <TableCell>
                    <Input
                      type="number"
                      value={set.time_seconds ?? ''}
                      onChange={(e) => handleInputChange(setIndex, 'time_seconds', e.target.value)}
                      disabled={set.isSaved}
                      className="w-20"
                    />
                  </TableCell>
                )}
                {exercise.category === 'Unilateral' && (
                  <>
                    <TableCell>
                      <Input
                        type="number"
                        value={set.reps_l ?? ''}
                        onChange={(e) => handleInputChange(setIndex, 'reps_l', e.target.value)}
                        disabled={set.isSaved}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={set.reps_r ?? ''}
                        onChange={(e) => handleInputChange(setIndex, 'reps_r', e.target.value)}
                        disabled={set.isSaved}
                        className="w-20"
                      />
                    </TableCell>
                  </>
                )}
                <TableCell>
                  {set.isSaved ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500 flex items-center">
                        <CheckCircle2 className="h-5 w-5 mr-1" /> Saved
                      </span>
                      {set.isPR && <Trophy className="h-5 w-5 text-yellow-500" />}
                      <Button variant="ghost" size="sm" onClick={() => handleEditSet(setIndex)} title="Edit Set">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(setIndex)} title="Delete Set">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => handleSaveSetAndStartTimer(setIndex)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(setIndex)} title="Delete Set">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={handleAddSet}>
            <Plus className="h-4 w-4 mr-2" /> Add Set
          </Button>
          <RestTimer
            initialTime={defaultRestTime}
            isRunning={isTimerRunning}
            onReset={() => setIsTimerRunning(false)}
          />
        </div>
      </CardContent>

      <ExerciseSwapDialog
        open={showSwapDialog}
        onOpenChange={setShowSwapDialog}
        currentExercise={exercise}
        onSwap={handleSwapExercise}
      />
    </Card>
  );
};