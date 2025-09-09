"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';

type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type WorkoutSession = Tables<'workout_sessions'>; // Import WorkoutSession type

interface PersonalRecord {
  exerciseName: string;
  exerciseType: string;
  value: number;
  date: string;
  unit: string;
}

export const PersonalRecordsCard = () => {
  const { session, supabase } = useSession();
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPersonalRecords = async () => {
      if (!session) return;
      
      setLoading(true);
      try {
        // Fetch all set logs for the user that are marked as PRs
        // We need to join with workout_sessions to filter by user_id
        const { data: prSets, error } = await supabase
          .from('set_logs')
          .select(`
            id, created_at, weight_kg, reps, time_seconds, is_pb,
            exercise_definitions (name, type),
            workout_sessions (user_id)
          `)
          .eq('is_pb', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter the results on the client side to ensure they belong to the current user
        // This is necessary because RLS on set_logs only allows access to sets linked to user's sessions,
        // but the initial select doesn't directly filter by user_id on set_logs.
        const userPrSets = (prSets || []).filter((set: any) => set.workout_sessions?.user_id === session.user.id);

        // Process the records
        const records: PersonalRecord[] = [];
        userPrSets.forEach((set: any) => {
          const exercise = set.exercise_definitions;
          if (!exercise) return;

          if (exercise.type === 'weight' && set.weight_kg && set.reps) {
            records.push({
              exerciseName: exercise.name,
              exerciseType: exercise.type,
              value: set.weight_kg * set.reps,
              date: new Date(set.created_at).toLocaleDateString(),
              unit: 'kg'
            });
          } else if (exercise.type === 'timed' && set.time_seconds) {
            records.push({
              exerciseName: exercise.name,
              exerciseType: exercise.type,
              value: set.time_seconds,
              date: new Date(set.created_at).toLocaleDateString(),
              unit: 'seconds'
            });
          }
        });

        // Sort by value (highest first for weight, lowest for timed)
        records.sort((a, b) => {
          if (a.exerciseType === 'weight' && b.exerciseType === 'weight') {
            return b.value - a.value;
          } else if (a.exerciseType === 'timed' && b.exerciseType === 'timed') {
            return a.value - b.value;
          }
          return 0;
        });

        setPersonalRecords(records.slice(0, 5)); // Show top 5 records
      } catch (err: any) {
        toast.error("Failed to load personal bests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalRecords();
  }, [session, supabase]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Personal Bests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Personal Bests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {personalRecords.length === 0 ? (
          <p className="text-muted-foreground">No personal bests yet. Complete workouts to set new PBs!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personalRecords.map((record, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{record.exerciseName}</TableCell>
                  <TableCell>
                    {record.exerciseType === 'weight' 
                      ? `${record.value} kg` 
                      : `${record.value} seconds`}
                  </TableCell>
                  <TableCell>{record.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};