"use client";

import React from "react";
import { Tables, SetLogWithExercise } from "@/types/supabase"; // Import SetLogWithExercise
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { ExerciseVolumeChart } from "./exercise-volume-chart";

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>;

interface ExerciseSummaryCardProps {
  exerciseGroup: {
    name: string;
    type: ExerciseDefinition['type'] | undefined;
    category: ExerciseDefinition['category'] | null | undefined;
    sets: SetLogWithExercise[];
    id: string;
  };
  currentSessionId: string;
}

export const ExerciseSummaryCard = ({ exerciseGroup, currentSessionId }: ExerciseSummaryCardProps) => {
  return (
    <Card key={exerciseGroup.name} className="mb-4">
      <CardHeader>
        <CardTitle>{exerciseGroup.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Set</TableHead>
              {exerciseGroup.type === 'weight' && <TableHead>Weight (kg)</TableHead>}
              {exerciseGroup.type === 'weight' && <TableHead>Reps</TableHead>}
              {exerciseGroup.type === 'timed' && <TableHead>Time (s)</TableHead>}
              {exerciseGroup.category === 'Unilateral' && (
                <>
                  <TableHead>Reps (L)</TableHead>
                  <TableHead>Reps (R)</TableHead>
                </>
              )}
              <TableHead>PR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exerciseGroup.sets.map((set: SetLogWithExercise, index: number) => (
              <TableRow key={set.id}>
                <TableCell>{index + 1}</TableCell>
                {exerciseGroup.type === 'weight' && <TableCell>{set.weight_kg ?? '-'}</TableCell>}
                {exerciseGroup.type === 'weight' && <TableCell>{set.reps ?? '-'}</TableCell>}
                {exerciseGroup.type === 'timed' && <TableCell>{set.time_seconds ?? '-'}</TableCell>}
                {exerciseGroup.category === 'Unilateral' && (
                  <>
                    <TableCell>{set.reps_l ?? '-'}</TableCell>
                    <TableCell>{set.reps_r ?? '-'}</TableCell>
                  </>
                )}
                <TableCell>{set.is_pb ? <Trophy className="h-4 w-4 text-yellow-500" /> : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="mt-6">
          <ExerciseVolumeChart 
            currentSessionId={currentSessionId}
            exerciseName={exerciseGroup.name}
            exerciseId={exerciseGroup.id}
          />
        </div>
      </CardContent>
    </Card>
  );
};