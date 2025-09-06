"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'; // Import Cell
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Dumbbell, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db'; // Import Dexie db

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ChartData {
  date: string;
  volume: number;
  change?: number; // Percentage change from previous
  color?: string; // For bar color
}

interface WorkoutVolumeHistoryCardProps {
  workoutTemplateName: string;
  currentSessionId: string;
}

export const WorkoutVolumeHistoryCard = ({ workoutTemplateName, currentSessionId }: WorkoutVolumeHistoryCardProps) => {
  const { session, supabase } = useSession();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkoutVolumeHistory = async () => {
      if (!session || !workoutTemplateName) return;

      setLoading(true);
      setError(null);
      try {
        // 1. Fetch all completed workout sessions for this template name from Dexie
        const sessionsData = await db.workout_sessions
          .where('template_name').equals(workoutTemplateName)
          .and(s => s.user_id === session.user.id && s.completed_at !== null)
          .sortBy('session_date');

        const relevantSessionIds = (sessionsData || []).map(s => s.id);

        if (relevantSessionIds.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        // 2. Fetch all set logs for these sessions from Dexie
        const setLogsData = await db.set_logs
          .where('session_id').anyOf(relevantSessionIds)
          .toArray();
        
        const allExerciseDefs = await db.exercise_definitions_cache.toArray();
        const exerciseDefMap = new Map(allExerciseDefs.map(def => [def.id, def]));

        // 3. Calculate total volume for each session
        const sessionVolumes: Record<string, { date: string; volume: number }> = {};
        (sessionsData || []).forEach(s => {
          sessionVolumes[s.id] = { date: new Date(s.session_date).toLocaleDateString(), volume: 0 };
        });

        (setLogsData || []).forEach(log => {
          const exerciseDef = log.exercise_id ? exerciseDefMap.get(log.exercise_id) : null;
          if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
            sessionVolumes[log.session_id!].volume += (log.weight_kg * log.reps);
          }
        });

        // 4. Format for chart and calculate changes, taking the last 4 sessions
        const sortedVolumes = Object.entries(sessionVolumes)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-4);

        const formattedChartData: ChartData[] = sortedVolumes.map((item, index) => {
          const previousVolume = index > 0 ? sortedVolumes[index - 1].volume : 0;
          let change = 0;
          if (previousVolume > 0) {
            change = ((item.volume - previousVolume) / previousVolume) * 100;
          }

          let color = 'hsl(var(--primary))'; // Default color
          if (item.id === currentSessionId) {
            color = 'hsl(var(--action-primary))'; // Highlight current session
          } else if (change > 0) {
            color = 'hsl(var(--chart-2))'; // Green for improvement
          } else if (change < 0) {
            color = 'hsl(var(--destructive))'; // Red for decrease
          }

          return {
            date: item.date,
            volume: item.volume,
            change: change,
            color: color,
          };
        });
        
        setChartData(formattedChartData);

      } catch (err: any) {
        console.error("Failed to fetch workout volume history from local DB:", err);
        setError(err.message || "Failed to load workout volume history.");
        toast.error(err.message || "Failed to load workout volume history.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutVolumeHistory();
  }, [session, supabase, workoutTemplateName, currentSessionId]);

  if (loading) {
    return (
      <Card className="h-[250px] flex items-center justify-center mb-6">
        <p className="text-muted-foreground">Loading workout volume history...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[250px] flex items-center justify-center mb-6">
        <p className="text-destructive">Error: {error}</p>
      </Card>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" /> Workout Volume History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            No previous workout data for "{workoutTemplateName}". Complete more sessions to see your trend!
          </div>
        ) : (
          <div className="h-[150px]">
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
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    const dataPoint = props.payload;
                    if (dataPoint && dataPoint.change !== undefined) {
                      const changeText = dataPoint.change > 0 ? `+${dataPoint.change.toFixed(1)}%` : `${dataPoint.change.toFixed(1)}%`;
                      return [`${value.toLocaleString()} kg`, `Change: ${changeText}`];
                    }
                    return [`${value.toLocaleString()} kg`, 'Volume'];
                  }}
                />
                <Bar dataKey="volume" name="Total Volume">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 text-green-500"><TrendingUp className="h-4 w-4" /> Improved</span>
              <span className="flex items-center gap-1 text-red-500"><TrendingDown className="h-4 w-4" /> Decreased</span>
              <span className="flex items-center gap-1"><Minus className="h-4 w-4" /> Maintained</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};