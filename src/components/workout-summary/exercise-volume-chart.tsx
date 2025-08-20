"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatWeight } from '@/lib/unit-conversions';

type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ChartData {
  date: string;
  [key: string]: number | string;
}

interface ExerciseVolumeChartProps {
  currentSessionId: string;
  exerciseName: string;
  exerciseId: string;
}

export const ExerciseVolumeChart = ({ currentSessionId, exerciseName, exerciseId }: ExerciseVolumeChartProps) => {
  const { session, supabase } = useSession();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExerciseHistory = async () => {
      if (!session) return;

      setLoading(true);
      setError(null);
      try {
        // Fetch last 3 workout sessions for this exercise
        const { data: setLogs, error: fetchError } = await supabase
          .from('set_logs')
          .select(`
            weight_kg, reps,
            workout_sessions (
              session_date,
              id
            )
          `)
          .eq('exercise_id', exerciseId)
          .order('created_at', { ascending: false })
          .limit(20); // Get more sets to ensure we get 3 different sessions

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        // Group sets by workout session and calculate volume for each
        const sessionVolumes: Record<string, { date: string; volume: number; sessionId: string }> = {};
        
        (setLogs || []).forEach(log => {
          // Access workout_sessions as an array and get the first element
          const sessionInfo = (log.workout_sessions as { session_date: string; id: string }[] | null)?.[0];
          const sessionId = sessionInfo?.id;

          if (!sessionId) return;
          
          // Skip the current session
          if (sessionId === currentSessionId) return;
          
          const weight = log.weight_kg || 0;
          const reps = log.reps || 0;
          const volume = weight * reps;
          
          if (!sessionVolumes[sessionId]) {
            sessionVolumes[sessionId] = {
              date: new Date(sessionInfo.session_date || '').toLocaleDateString(),
              volume: 0,
              sessionId
            };
          }
          
          sessionVolumes[sessionId].volume += volume;
        });

        // Convert to array and sort by date, take last 3
        const sortedSessions = Object.values(sessionVolumes)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-3);

        // Format for chart
        const chartDataFormatted = sortedSessions.map(session => ({
          date: session.date,
          [exerciseName]: session.volume
        }));

        setChartData(chartDataFormatted);

      } catch (err: any) {
        console.error("Failed to fetch exercise history for chart:", err);
        setError(err.message || "Failed to load exercise history chart.");
        toast.error(err.message || "Failed to load exercise history chart.");
      } finally {
        setLoading(false);
      }
    };

    fetchExerciseHistory();
  }, [session, supabase, exerciseId, exerciseName, currentSessionId]);

  if (loading) {
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <p className="text-destructive">Error: {error}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Not enough data to show volume comparison. Complete more workouts to see your progress!
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${formatWeight(value, 'kg')}`, 'Volume']} />
                <Legend />
                <Bar dataKey={exerciseName} fill="hsl(var(--primary))" name="Volume (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};