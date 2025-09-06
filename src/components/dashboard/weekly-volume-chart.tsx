"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'; // Import Cell
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatWeight } from '@/lib/unit-conversions';

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>; // Import ExerciseDefinition

// Define a type for SetLog with joined ExerciseDefinition and WorkoutSession
// Corrected to expect arrays for joined relationships, as Supabase returns them this way.
type SetLogWithExerciseAndSession = Pick<SetLog, 'weight_kg' | 'reps'> & {
  exercise_definitions: Pick<ExerciseDefinition, 'type'>[] | null; // Changed to array
  workout_sessions: Pick<WorkoutSession, 'session_date' | 'user_id'>[] | null; // Changed to array
};

interface ChartData {
  date: string;
  volume: number;
}

export const WeeklyVolumeChart = () => {
  const { session, supabase } = useSession();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklyVolume = async () => {
      if (!session) return;

      setLoading(true);
      setError(null);
      try {
        // Fetch all set logs for the user, joining with workout_sessions to get session_date
        // and exercise_definitions to get exercise type.
        const { data: setLogsData, error: setLogsError } = await supabase
          .from('set_logs')
          .select(`
            weight_kg, reps,
            exercise_definitions (type),
            workout_sessions (session_date, user_id)
          `)
          .eq('workout_sessions.user_id', session.user.id) // Filter by user_id directly on the joined table
          .order('created_at', { ascending: true }); // Order by created_at for chronological processing

        if (setLogsError) {
          throw new Error(setLogsError.message);
        }

        console.log("WeeklyVolumeChart: Fetched setLogsData:", setLogsData);

        // Aggregate volume by week
        const weeklyVolumeMap = new Map<string, number>(); // 'YYYY-WW' -> total volume

        (setLogsData as SetLogWithExerciseAndSession[]).forEach(log => {
          // Access the first element of the array for joined data
          const exerciseType = log.exercise_definitions?.[0]?.type; 
          const sessionDate = log.workout_sessions?.[0]?.session_date; 
          
          console.log(`WeeklyVolumeChart: Processing log: exerciseType=${exerciseType}, sessionDate=${sessionDate}, weight_kg=${log.weight_kg}, reps=${log.reps}`);

          if (exerciseType === 'weight' && log.weight_kg && log.reps && sessionDate) {
            const date = new Date(sessionDate);
            // Get the start of the week (e.g., Monday)
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - (date.getDay() + 6) % 7); // Adjust to Monday
            startOfWeek.setHours(0, 0, 0, 0);

            const weekKey = startOfWeek.toISOString().split('T')[0]; // Use start of week as key

            const volume = (log.weight_kg || 0) * (log.reps || 0);
            weeklyVolumeMap.set(weekKey, (weeklyVolumeMap.get(weekKey) || 0) + volume);
            console.log(`  Added volume ${volume} to week ${weekKey}. Current week total: ${weeklyVolumeMap.get(weekKey)}`);
          } else {
            console.log(`  Skipping log: criteria not met (type=${exerciseType}, weight=${log.weight_kg}, reps=${log.reps}, date=${sessionDate})`);
          }
        });

        console.log("WeeklyVolumeChart: Aggregated weeklyVolumeMap:", weeklyVolumeMap);

        // Convert map to array of objects for Recharts, sorted by date
        const sortedChartData = Array.from(weeklyVolumeMap.entries())
          .map(([date, volume]) => ({ date, volume }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setChartData(sortedChartData);
        console.log("WeeklyVolumeChart: Final sortedChartData:", sortedChartData);

      } catch (err: any) {
        console.error("Failed to fetch weekly volume data:", err);
        setError(err.message || "Failed to load weekly volume chart.");
        toast.error(err.message || "Failed to load weekly volume chart.");
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyVolume();
  }, [session, supabase]);

  if (loading) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">Weekly Workout Volume (kg)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No workout volume data available. Log some workouts to see your progress!
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']} />
                <Legend />
                <Bar dataKey="volume" fill="hsl(var(--primary))" name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};