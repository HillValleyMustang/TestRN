"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import { formatTime } from '@/lib/unit-conversions'; // Import formatTime

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
        const { data: prs, error } = await supabase.rpc('get_user_personal_records', {
          p_user_id: session.user.id,
          p_limit: 5 // Fetch top 5 PRs
        });

        if (error) throw error;

        const formattedRecords: PersonalRecord[] = (prs || []).map(pr => ({
          exerciseName: pr.exercise_name,
          exerciseType: pr.exercise_type,
          value: pr.best_value || 0,
          date: new Date(pr.last_achieved_date).toLocaleDateString(),
          unit: pr.unit || '',
        }));
        
        setPersonalRecords(formattedRecords);
      } catch (err: any) {
        toast.error("Failed to load personal bests: " + err.message);
        console.error("Error fetching personal records:", err);
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
                      ? `${record.value.toLocaleString()} kg` 
                      : `${formatTime(record.value)}`}
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