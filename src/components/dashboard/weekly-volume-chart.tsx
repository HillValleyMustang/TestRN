"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;

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
        // Fetch all workout sessions for the user
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id, session_date')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: true }); // Order by date for chronological processing

        if (sessionsError) {
          throw new Error(sessionsError.message);
        }

        const sessionIds = sessionsData.map(s => s.id);

        if (sessionIds.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        // Fetch all set logs associated with these sessions
        const { data: setLogsData, error: setLogsError } = await supabase
          .from('set_logs')
          .select(`
            weight_kg,
            reps,
            session_id,
            exercise_definitions (*)
          `) // Corrected: Removed comment from inside string
          .in('session_id', sessionIds);

        if (setLogsError) {
          throw new Error(setLogsError.message);
        }

        // Map session dates to session IDs for easy lookup
        const sessionDateMap = new Map<string, string>(); // sessionId -> date string
        sessionsData.forEach(session => {
          sessionDateMap.set(session.id, new Date(session.session_date).toISOString().split('T')[0]);
        });

        // Aggregate volume by week
        const weeklyVolumeMap = new Map<string, number>(); // 'YYYY-WW' -> total volume

        setLogsData.forEach(log => {
          const exerciseType = (log.exercise_definitions as Tables<'exercise_definitions'>)?.type;
          if (exerciseType === 'weight' && log.weight_kg && log.reps && log.session_id) {
            const sessionDateStr = sessionDateMap.get(log.session_id);
            if (sessionDateStr) {
              const date = new Date(sessionDateStr);
              // Get the start of the week (e.g., Monday)
              const startOfWeek = new Date(date);
              startOfWeek.setDate(date.getDate() - (date.getDay() + 6) % 7); // Adjust to Monday
              startOfWeek.setHours(0, 0, 0, 0);

              const weekKey = startOfWeek.toISOString().split('T')[0]; // Use start of week as key

              const volume = (log.weight_kg || 0) * (log.reps || 0);
              weeklyVolumeMap.set(weekKey, (weeklyVolumeMap.get(weekKey) || 0) + volume);
            }
          }
        });

        // Convert map to array of objects for Recharts, sorted by date
        const sortedChartData = Array.from(weeklyVolumeMap.entries())
          .map(([date, volume]) => ({ date, volume }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setChartData(sortedChartData);

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
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Weekly Workout Volume (kg)</CardTitle>
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