"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables } from '@/types/supabase';
import { convertWeight, formatWeight } from '@/lib/unit-conversions';
import { useExerciseHistory } from '@/hooks/data/useExerciseHistory';
import { useSession } from '@/components/session-context-provider'; // Import useSession

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseHistoryDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  trigger?: React.ReactNode;
}

export const ExerciseHistoryDialog = ({ open, onOpenChange, exerciseId, exerciseName, exerciseType, exerciseCategory, trigger }: ExerciseHistoryDialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const { memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setCurrentOpen = isControlled ? onOpenChange : setInternalOpen;

  const { historyLogs, loading, error, preferredWeightUnit } = useExerciseHistory({
    exerciseId: currentOpen ? exerciseId : '',
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History for {exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex-grow overflow-hidden">
          {loading ? (
            <p className="text-muted-foreground text-center">Loading history...</p>
          ) : error ? (
            <p className="text-destructive text-center">{error}</p>
          ) : historyLogs.length === 0 ? (
            <p className="text-muted-foreground text-center">No history found for this exercise.</p>
          ) : (
            <ScrollArea className="h-full w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {exerciseType === 'weight' && <TableHead>Weight ({preferredWeightUnit})</TableHead>}
                    {exerciseType === 'weight' && <TableHead>Reps</TableHead>}
                    {exerciseType === 'timed' && <TableHead>Time (s)</TableHead>}
                    {exerciseCategory === 'Unilateral' && (
                      <>
                        <TableHead>Reps (L)</TableHead>
                        <TableHead>Reps (R)</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.workout_sessions?.session_date
                          ? new Date(log.workout_sessions.session_date).toLocaleDateString()
                          : (log.created_at ? new Date(log.created_at).toLocaleDateString() : '-')}
                      </TableCell>
                      {exerciseType === 'weight' && (
                        <TableCell>
                          {formatWeight(convertWeight(log.weight_kg, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs')}
                        </TableCell>
                      )}
                      {exerciseType === 'weight' && <TableCell>{log.reps ?? '-'}</TableCell>}
                      {exerciseType === 'timed' && <TableCell>{log.time_seconds ?? '-'}</TableCell>}
                      {exerciseCategory === 'Unilateral' && (
                        <>
                          <TableCell>{log.reps_l ?? '-'}</TableCell>
                          <TableCell>{log.reps_r ?? '-'}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};