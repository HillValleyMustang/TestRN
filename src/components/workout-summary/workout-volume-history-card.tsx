"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Dumbbell } from 'lucide-react';
import { db, LocalWorkoutSession, LocalSetLog, LocalExerciseDefinition } from '@/lib/db';

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ChartData {
  date: string;
  volume: number;
  change?: number;
  color?: string;
}

interface WorkoutVolumeHistoryCardProps {
  workoutTemplateName: string;
  currentSessionId: string;
}

export const WorkoutVolumeHistoryCard = ({ workoutTemplateName, currentSessionId }: WorkoutVolumeHistoryCardProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkoutVolumeHistory = async () => {
      if (!memoizedSessionUserId || !workoutTemplateName) return; // Use memoized ID

      setLoading(true);
      setError(null);
      try {
        const sessionsData = await db.workout_sessions
          .where('template_name').equals(workoutTemplateName)
          .and(s => s.user_id === memoizedSessionUserId && s.completed_at !== null) // Use memoized ID
          .sortBy('session_date');

        const relevantSessionIds = (sessionsData || []).map(s => s.id);
        if (relevantSessionIds.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        const setLogsData = await db.set_logs.where('session_id').anyOf(relevantSessionIds).toArray();
        const allExerciseDefs = await db.exercise_definitions_cache.toArray();
        const exerciseDefMap = new Map(allExerciseDefs.map(def => [def.id, def]));

        const sessionVolumes: Record<string, { date: string; volume: number }> = {};
        (sessionsData || []).forEach(s => {
          sessionVolumes[s.id] = { date: new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), volume: 0 };
        });

        (setLogsData || []).forEach(log => {
          const exerciseDef = log.exercise_id ? exerciseDefMap.get(log.exercise_id) : null;
          if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
            sessionVolumes[log.session_id!].volume += (log.weight_kg * log.reps);
          }
        });

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

          let color = 'hsl(var(--primary))';
          if (item.id === currentSessionId) color = 'hsl(var(--action-primary))';
          else if (change > 0) color = 'hsl(var(--chart-2))';
          else if (change < 0) color = 'hsl(var(--destructive))';

          return { date: item.date, volume: item.volume, change, color };
        });
        
        setChartData(formattedChartData);
      } catch (err: any) {
        setError(err.message || "Failed to load workout volume history.");
        toast.error("Failed to load workout volume history."); // Changed to toast.error
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutVolumeHistory();
  }, [memoizedSessionUserId, supabase, workoutTemplateName, currentSessionId]); // Depend on memoized ID

  if (loading) {
    return <Card className="h-[250px] flex items-center justify-center mb-6"><p className="text-muted-foreground">Loading history...</p></Card>;
  }
  if (error) {
    return <Card className="h-[250px] flex items-center justify-center mb-6"><p className="text-destructive">Error: {error}</p></Card>;
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
          <div className="h-[220px] flex items-center justify-center text-muted-foreground">
            No previous workout data for "{workoutTemplateName}". Complete more sessions to see your trend!
          </div>
        ) : (
          <>
            <div className="h-[200px]"> {/* Increased height to accommodate legend */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}> {/* Adjusted left margin */}
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value >= 1000) {
                        return `${Math.round(value / 1000)}k`;
                      }
                      return value.toLocaleString();
                    }}
                    label={{ value: 'Volume (kg)', angle: -90, position: 'left', offset: -10, style: { textAnchor: 'middle', fontSize: 12 } }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                    formatter={(value: number, name: string, props: any) => {
                      const dataPoint = props.payload;
                      if (dataPoint && dataPoint.change !== undefined) {
                        const changeText = dataPoint.change > 0 ? `+${dataPoint.change.toFixed(1)}%` : `${dataPoint.change.toFixed(1)}%`;
                        return [`${value.toLocaleString()} kg`, `Change: ${changeText}`];
                      }
                      return [`${value.toLocaleString()} kg`, 'Volume'];
                    }}
                  />
                  <Bar dataKey="volume" name="Total Volume" barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--action-primary))' }} /><span>Current</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }} /><span>Improved</span></div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--destructive))' }} /><span>Decreased</span></div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};