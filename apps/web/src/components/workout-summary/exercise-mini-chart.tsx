"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatWeight, formatTime } from '@data/utils/unit-conversions';

type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ChartData {
  date: string;
  value: number;
}

interface ExerciseMiniChartProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  currentSessionId: string;
}

export const ExerciseMiniChart = ({ exerciseId, exerciseType, currentSessionId }: ExerciseMiniChartProps) => {
  const { session, supabase } = useSession();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExerciseHistory = async () => {
      if (!session || !exerciseId) return;

      setLoading(true);
      setError(null);
      try {
        // Fetch last 4 workout sessions for this exercise (including current if completed)
        const { data: setLogs, error: fetchError } = await supabase
          .from('set_logs')
          .select(`
            weight_kg, reps, time_seconds,
            workout_sessions (
              session_date,
              id
            )
          `)
          .eq('exercise_id', exerciseId)
          .order('created_at', { ascending: false })
          .limit(20); // Fetch more to ensure we get enough distinct sessions

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const sessionPerformance: Record<string, { date: string; value: number; sessionId: string }> = {};
        
        (setLogs || []).forEach(log => {
          const sessionInfo = (log.workout_sessions as { session_date: string; id: string }[] | null)?.[0];
          const sessionId = sessionInfo?.id;

          if (!sessionId || !sessionInfo.session_date) return;
          
          const dateKey = new Date(sessionInfo.session_date).toLocaleDateString();
          let performanceValue: number | null = null;

          if (exerciseType === 'weight') {
            const weight = log.weight_kg || 0;
            const reps = log.reps || 0;
            performanceValue = weight * reps; // Total volume for the set
          } else if (exerciseType === 'timed') {
            performanceValue = log.time_seconds || 0;
          }

          if (performanceValue !== null) {
            if (!sessionPerformance[sessionId]) {
              sessionPerformance[sessionId] = {
                date: dateKey,
                value: 0,
                sessionId
              };
            }
            // For weight: sum volume. For timed: take max time (or average, depending on desired metric)
            if (exerciseType === 'weight') {
              sessionPerformance[sessionId].value += performanceValue;
            } else if (exerciseType === 'timed') {
              sessionPerformance[sessionId].value = Math.max(sessionPerformance[sessionId].value, performanceValue);
            }
          }
        });

        // Convert to array and sort by date, take last 4 unique sessions
        const sortedSessions = Object.values(sessionPerformance)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-4); // Show last 4 sessions

        const formattedChartData = sortedSessions.map(session => ({
          date: session.date,
          value: session.value
        }));

        setChartData(formattedChartData);

      } catch (err: any) {
        console.error("Failed to fetch exercise history for mini-chart:", err);
        setError(err.message || "Failed to load exercise mini-chart.");
        toast.error(err.message || "Failed to load exercise mini-chart."); // Added toast.error
      } finally {
        setLoading(false);
      }
    };

    fetchExerciseHistory();
  }, [session, supabase, exerciseId, exerciseType, currentSessionId]);

  if (loading || error || chartData.length < 2) { // Need at least 2 data points for a line chart
    return (
      <div className="h-20 w-full flex items-center justify-center text-muted-foreground text-xs">
        {loading ? "Loading..." : (error ? "Error" : "No trend data")}
      </div>
    );
  }

  const tooltipFormatter = (value: number) => {
    if (exerciseType === 'weight') {
      return `${formatWeight(value, 'kg')}`;
    } else if (exerciseType === 'timed') {
      return `${formatTime(value)}`;
    }
    return value.toString();
  };

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip formatter={tooltipFormatter} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};