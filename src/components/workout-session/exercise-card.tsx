"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle2, Trophy, Edit, Trash2 } from 'lucide-react';
import { ExerciseHistoryDialog } from '@/components/exercise-history-dialog';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';
import { ExerciseProgressionDialog } from '@/components/exercise-progression-dialog';
import { Tables, SetLogState } from '@/types/supabase'; // Import SetLogState from consolidated types
import { useExerciseSets } from '@/hooks/use-exercise-sets';
import { SupabaseClient } from '@supabase/supabase-js';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateGlobalSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
}

export const ExerciseCard = ({ exercise, currentSessionId, supabase, onUpdateGlobalSets, initialSets }: ExerciseCardProps) => {
  const { sets, handleAddSet, handleInputChange, handleSaveSet, handleEditSet, handleDeleteSet } = useExerciseSets({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    exerciseCategory: exercise.category,
    currentSessionId,
    supabase,
    onUpdateSets: onUpdateGlobalSets,
    initialSets,
  });

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
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Set</TableHead>
              <TableHead>Hint</TableHead>
              <TableHead>Weight (kg)</TableHead>
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
              <TableRow key={set.id || `new-${setIndex}`}> {/* Use set.id if available, otherwise a temporary key */}
                <TableCell>{setIndex + 1}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {exercise.type === 'weight' && set.lastWeight && set.lastReps && `Last: ${set.lastWeight}kg x ${set.lastReps} reps`}
                  {exercise.type === 'timed' && set.lastTimeSeconds && `Last: ${set.lastTimeSeconds}s`}
                  {!set.lastWeight && !set.lastReps && !set.lastTimeSeconds && "-"}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={set.weight_kg ?? ''}
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
                      <Button variant="secondary" size="sm" onClick={() => handleSaveSet(setIndex)}>Save</Button>
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
        <Button variant="outline" className="mt-4" onClick={handleAddSet}>
          <Plus className="h-4 w-4 mr-2" /> Add Set
        </Button>
      </CardContent>
    </Card>
  );
};