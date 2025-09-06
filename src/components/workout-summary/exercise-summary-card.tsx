"use client";

import React from "react";
import { Tables, SetLogWithExercise } from "@/types/supabase"; // Import SetLogWithExercise
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react"; // Import new icons
import { ExerciseVolumeChart } from "./exercise-volume-chart";
import { Separator } from "@/components/ui/separator"; // Import Separator
import { cn } from "@/lib/utils"; // Import cn for conditional class names
import { formatWeight, formatTime } from '@/lib/unit-conversions'; // Import formatTime
import { ExerciseMiniChart } from "./exercise-mini-chart"; // Import ExerciseMiniChart

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

  const getPerformanceIndicator = (currentValue: number | null | undefined, previousValue: number | null | undefined, type: 'weight' | 'reps' | 'time', category?: string | null) => {
    if (previousValue === null || previousValue === undefined || currentValue === null || currentValue === undefined) {
      return { icon: null, color: 'text-muted-foreground', tooltip: 'No previous data' };
    }

    let improved = false;
    let maintained = false;
    let decreased = false;

    if (type === 'weight' || type === 'reps') {
      if (currentValue > previousValue) improved = true;
      else if (currentValue === previousValue) maintained = true;
      else decreased = true;
    } else if (type === 'time') {
      // For time, higher is generally better (longer hold)
      if (currentValue > previousValue) improved = true;
      else if (currentValue === previousValue) maintained = true;
      else decreased = true;
    }

    if (improved) return { icon: <ArrowUp className="h-3 w-3" />, color: 'text-green-500', tooltip: 'Improved' };
    if (decreased) return { icon: <ArrowDown className="h-3 w-3" />, color: 'text-red-500', tooltip: 'Decreased' };
    return { icon: <Minus className="h-3 w-3" />, color: 'text-muted-foreground', tooltip: 'Maintained' };
  };

  return (
    <Card key={exerciseGroup.name} className="mb-4">
      <CardHeader className="p-4">
        <CardTitle className="text-base">{exerciseGroup.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] px-2">Set</TableHead>
              {exerciseGroup.type === 'weight' && <TableHead className="px-2">Weight (kg)</TableHead>}
              {exerciseGroup.type === 'weight' && <TableHead className="px-2">Reps</TableHead>}
              {exerciseGroup.type === 'timed' && <TableHead className="px-2">Time</TableHead>}
              {exerciseGroup.category === 'Unilateral' && (
                <>
                  <TableHead className="px-2">Reps (L)</TableHead>
                  <TableHead className="px-2">Reps (R)</TableHead>
                </>
              )}
              <TableHead className="text-center px-2">PR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exerciseGroup.sets.map((set: SetLogWithExercise, index: number) => {
              const isEvenRow = index % 2 === 0;
              const weightIndicator = getPerformanceIndicator(set.weight_kg, set.last_session_weight_kg, 'weight');
              const repsIndicator = getPerformanceIndicator(set.reps, set.last_session_reps, 'reps');
              const repsLIndicator = getPerformanceIndicator(set.reps_l, set.last_session_reps_l, 'reps');
              const repsRIndicator = getPerformanceIndicator(set.reps_r, set.last_session_reps_r, 'reps');
              const timeIndicator = getPerformanceIndicator(set.time_seconds, set.last_session_time_seconds, 'time');

              return (
                <React.Fragment key={set.id}>
                  <TableRow className={cn(isEvenRow ? 'bg-muted/20' : '')}>
                    <TableCell className="font-medium px-2">{index + 1}</TableCell>
                    {exerciseGroup.type === 'weight' && (
                      <>
                        <TableCell className="flex items-center gap-1 px-2">
                          {set.weight_kg ?? '-'}
                          {weightIndicator.icon && <span className={weightIndicator.color} title={weightIndicator.tooltip}>{weightIndicator.icon}</span>}
                        </TableCell>
                        {exerciseGroup.category === 'Unilateral' ? (
                          <>
                            <TableCell className="flex items-center gap-1 px-2">
                              {set.reps_l ?? '-'}
                              {repsLIndicator.icon && <span className={repsLIndicator.color} title={repsLIndicator.tooltip}>{repsLIndicator.icon}</span>}
                            </TableCell>
                            <TableCell className="flex items-center gap-1 px-2">
                              {set.reps_r ?? '-'}
                              {repsRIndicator.icon && <span className={repsRIndicator.color} title={repsRIndicator.tooltip}>{repsRIndicator.icon}</span>}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell className="flex items-center gap-1 px-2">
                            {set.reps ?? '-'}
                            {repsIndicator.icon && <span className={repsIndicator.color} title={repsIndicator.tooltip}>{repsIndicator.icon}</span>}
                          </TableCell>
                        )}
                      </>
                    )}
                    {exerciseGroup.type === 'timed' && (
                      <TableCell className="flex items-center gap-1 px-2">
                        {set.time_seconds ? formatTime(set.time_seconds) : '-'}
                        {timeIndicator.icon && <span className={timeIndicator.color} title={timeIndicator.tooltip}>{timeIndicator.icon}</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-center px-2">{set.is_pb ? <Trophy className="h-4 w-4 text-yellow-500 mx-auto" /> : '-'}</TableCell>
                  </TableRow>
                  {index < exerciseGroup.sets.length - 1 && (
                    <TableRow className={cn(isEvenRow ? 'bg-muted/20' : '')}>
                      <TableCell colSpan={exerciseGroup.type === 'weight' ? (exerciseGroup.category === 'Unilateral' ? 5 : 4) : 3} className="p-0">
                        <Separator className="my-0" />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
        
        <div className="mt-4">
          <ExerciseMiniChart
            exerciseId={exerciseGroup.id}
            exerciseType={exerciseGroup.type || 'weight'} // Default to 'weight' if undefined
            currentSessionId={currentSessionId}
          />
        </div>
      </CardContent>
    </Card>
  );
};