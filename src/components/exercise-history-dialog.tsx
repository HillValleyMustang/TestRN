"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { convertWeight, formatWeight } from '@/lib/unit-conversions';

type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

// Define a new type to correctly represent the fetched data with the joined workout_sessions
type SetLogWithSession = Pick<SetLog, 'id' | 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds' | 'created_at' | 'exercise_id' | 'is_pb' | 'session_id'> & {
  workout_sessions: Pick<Tables<'workout_sessions'>, 'session_date'> | null;
};

interface ExerciseHistoryDialogProps {
  open?: boolean; // Make open prop optional for controlled/uncontrolled usage
  onOpenChange?: (open: boolean) => void; // Make onOpenChange prop optional
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  trigger?: React.ReactNode; // Destructure this prop
}

export const ExerciseHistoryDialog = ({ open, onOpenChange, exerciseId, exerciseName, exerciseType, exerciseCategory, trigger }: ExerciseHistoryDialogProps) => {
  const { session, supabase } = useSession();
  const [internalOpen, setInternalOpen] = useState(false); // Internal state for uncontrolled usage
  const [historyLogs, setHistoryLogs] = useState<SetLogWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<Profile['preferred_weight_unit']>('kg');

  // Determine if the dialog is controlled or uncontrolled
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;
  const setCurrentOpen = isControlled ? onOpenChange : setInternalOpen;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_weight_unit')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile for units:", profileError);
      } else if (profileData) {
        setPreferredWeightUnit(profileData.preferred_weight_unit || 'kg');
      }
    };
    fetchUserData();
  }, [session, supabase]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session || !exerciseId || !currentOpen) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('set_logs')
          .select(`
            id, weight_kg, reps, reps_l, reps_r, time_seconds, created_at, exercise_id, is_pb, session_id,
            workout_sessions (
              session_date
            )
          `)
          .eq('exercise_id', exerciseId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        const mappedData: SetLogWithSession[] = (data as (SetLog & { workout_sessions: Pick<Tables<'workout_sessions'>, 'session_date'>[] | null })[]).map(log => ({
          ...log,
          workout_sessions: (log.workout_sessions && log.workout_sessions.length > 0) ? log.workout_sessions[0] : null,
        }));

        setHistoryLogs(mappedData || []);
      } catch (err: any) {
        console.error("Failed to fetch exercise history:", err);
        toast.info("Failed to load exercise history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentOpen, session, exerciseId, supabase]);

  return (
    <Dialog open={currentOpen} onOpenChange={setCurrentOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>} {/* Only render trigger if provided */}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History for {exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex-grow overflow-hidden">
          {loading ? (
            <p className="text-muted-foreground text-center">Loading history...</p>
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