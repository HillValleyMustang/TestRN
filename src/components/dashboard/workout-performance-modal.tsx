"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dumbbell, History, Trash2, CalendarDays, Timer, ListChecks } from 'lucide-react';
import { formatTimeAgo, getWorkoutColorClass, cn } from '@/lib/utils';
import { formatTime } from '@/lib/unit-conversions'; // Corrected import path for formatTime
import { db } from '@/lib/db';

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to get the start of the week (Monday)
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(0, 0, 0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
};

// Muscle group categorization
const UPPER_BODY_MUSCLES = new Set([
  'Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps', 'Triceps', 'Forearms'
]);
const LOWER_BODY_MUSCLES = new Set([
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abdominals', 'Core' // Including Core in Lower Body for this context
]);

const categorizeMuscle = (muscle: string): 'upper' | 'lower' | 'other' => {
  const cleanedMuscle = muscle.trim();
  if (UPPER_BODY_MUSCLES.has(cleanedMuscle)) return 'upper';
  if (LOWER_BODY_MUSCLES.has(cleanedMuscle)) return 'lower';
  return 'other';
};

interface WeeklyVolumeChartProps {
  bodyPart: 'upper' | 'lower';
  data: { date: string; volume: number; isCurrentWeek: boolean }[];
  totalVolume: number;
  loading: boolean;
}

const WeeklyBodyPartVolumeChart = ({ bodyPart, data, totalVolume, loading }: WeeklyVolumeChartProps) => {
  if (loading) {
    return <p className="text-muted-foreground text-center py-4">Loading volume data...</p>;
  }
  const hasData = data.some(d => d.volume > 0);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">This Week's {bodyPart === 'upper' ? 'Upper Body' : 'Lower Body'} Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            No {bodyPart} body workouts this week.
          </div>
        ) : (
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']} />
                <Bar dataKey="volume" name="Volume">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isCurrentWeek ? 'hsl(var(--action-primary))' : 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-center text-3xl font-bold text-action mt-2">{totalVolume.toLocaleString()} kg</p>
      </CardContent>
    </Card>
  );
};

interface WeeklyMuscleBreakdownChartProps {
  bodyPart: 'upper' | 'lower';
  data: { muscle: string; sets: number }[];
  loading: boolean;
}

const WeeklyMuscleBreakdownChart = ({ bodyPart, data, loading }: WeeklyMuscleBreakdownChartProps) => {
  if (loading) {
    return <p className="text-muted-foreground text-center py-4">Loading muscle breakdown...</p>;
  }
  const hasData = data.length > 0;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">This Week's Muscle Breakdown (Sets)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            No {bodyPart} body workouts this week.
          </div>
        ) : (
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide domain={[0, 'auto']} />
                <YAxis type="category" dataKey="muscle" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value} sets`, 'Sets']} />
                <Bar dataKey="sets" fill="hsl(var(--chart-3))" name="Sets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface RecentWorkoutSessionsListProps {
  sessions: WorkoutSession[];
  onDeleteSession: (sessionId: string, templateName: string | null) => void;
  loading: boolean;
}

const RecentWorkoutSessionsList = ({ sessions, onDeleteSession, loading }: RecentWorkoutSessionsListProps) => {
  if (loading) {
    return <p className="text-muted-foreground text-center py-4">Loading recent sessions...</p>;
  }
  const hasSessions = sessions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasSessions ? (
          <p className="text-muted-foreground">No recent workouts found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((sessionItem) => {
              const workoutName = sessionItem.template_name || 'Ad Hoc Workout';
              const workoutBorderClass = getWorkoutColorClass(workoutName, 'border');
              return (
                <Card key={sessionItem.id} className={cn("border-2", workoutBorderClass)}>
                  <div className="flex items-center justify-between p-3">
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">
                        {new Date(sessionItem.session_date).toLocaleDateString()}
                        , {new Date(sessionItem.session_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        ({sessionItem.duration_string || 'N/A'})
                      </p>
                      <p className="text-xs text-muted-foreground">{workoutName}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteSession(sessionItem.id, sessionItem.template_name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const WorkoutPerformanceModal = ({ open, onOpenChange }: WorkoutPerformanceModalProps) => {
  const { session, supabase } = useSession();
  const [activeTab, setActiveTab] = useState<'upper' | 'lower'>('upper');
  const [loading, setLoading] = useState(true);
  const [weeklyVolumeData, setWeeklyVolumeData] = useState<{ upper: any[]; lower: any[] }>({ upper: [], lower: [] });
  const [weeklyMuscleBreakdown, setWeeklyMuscleBreakdown] = useState<{ upper: any[]; lower: any[] }>({ upper: [], lower: [] });
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [totalUpperVolume, setTotalUpperVolume] = useState(0);
  const [totalLowerVolume, setTotalLowerVolume] = useState(0);

  const fetchPerformanceData = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      const today = new Date();
      const currentWeekStart = getStartOfWeek(today);
      const fourWeeksAgo = new Date(currentWeekStart);
      fourWeeksAgo.setDate(currentWeekStart.getDate() - 3 * 7); // Start of 4 weeks ago

      // Fetch all relevant data
      const { data: setLogsData, error: setLogsError } = await supabase
        .from('set_logs')
        .select(`
          id, weight_kg, reps, exercise_id,
          exercise_definitions (name, main_muscle, type),
          workout_sessions (session_date, user_id)
        `)
        .eq('workout_sessions.user_id', session.user.id)
        .gte('workout_sessions.session_date', fourWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      if (setLogsError) throw setLogsError;

      const { data: recentSessionsData, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, template_name, session_date, duration_string, completed_at, created_at, rating, t_path_id, user_id')
        .eq('user_id', session.user.id)
        .not('completed_at', 'is', null)
        .order('session_date', { ascending: false })
        .limit(5);

      if (sessionsError) throw sessionsError;
      setRecentSessions(recentSessionsData || []);

      // Process data for charts
      const upperVolumeMap = new Map<string, number>();
      const lowerVolumeMap = new Map<string, number>();
      const upperMuscleSetsMap = new Map<string, number>();
      const lowerMuscleSetsMap = new Map<string, number>();

      let currentUpperVolume = 0;
      let currentLowerVolume = 0;

      (setLogsData || []).forEach((log: any) => {
        const exerciseDef = log.exercise_definitions;
        const workoutSession = log.workout_sessions;

        if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps && workoutSession?.session_date) {
          const date = new Date(workoutSession.session_date);
          const weekStart = getStartOfWeek(date);
          const weekKey = weekStart.toISOString().split('T')[0];
          const volume = (log.weight_kg || 0) * (log.reps || 0);

          const mainMuscles = exerciseDef.main_muscle.split(',').map((m: string) => m.trim());
          let isUpper = false;
          let isLower = false;

          mainMuscles.forEach((muscle: string) => {
            const category = categorizeMuscle(muscle);
            if (category === 'upper') isUpper = true;
            if (category === 'lower') isLower = true;
          });

          if (isUpper) {
            upperVolumeMap.set(weekKey, (upperVolumeMap.get(weekKey) || 0) + volume);
            if (weekStart.getTime() === currentWeekStart.getTime()) {
              currentUpperVolume += volume;
              mainMuscles.forEach((muscle: string) => {
                if (categorizeMuscle(muscle) === 'upper') {
                  upperMuscleSetsMap.set(muscle, (upperMuscleSetsMap.get(muscle) || 0) + 1);
                }
              });
            }
          }
          if (isLower) {
            lowerVolumeMap.set(weekKey, (lowerVolumeMap.get(weekKey) || 0) + volume);
            if (weekStart.getTime() === currentWeekStart.getTime()) {
              currentLowerVolume += volume;
              mainMuscles.forEach((muscle: string) => {
                if (categorizeMuscle(muscle) === 'lower') {
                  lowerMuscleSetsMap.set(muscle, (lowerMuscleSetsMap.get(muscle) || 0) + 1);
                }
              });
            }
          }
        }
      });

      setTotalUpperVolume(currentUpperVolume);
      setTotalLowerVolume(currentLowerVolume);

      // Generate data for the last 4 weeks for volume charts
      const volumeChartDataUpper = [];
      const volumeChartDataLower = [];
      for (let i = 3; i >= 0; i--) {
        const weekDate = new Date(currentWeekStart);
        weekDate.setDate(currentWeekStart.getDate() - i * 7);
        const weekKey = weekDate.toISOString().split('T')[0];
        volumeChartDataUpper.push({
          date: weekKey,
          volume: upperVolumeMap.get(weekKey) || 0,
          isCurrentWeek: weekDate.getTime() === currentWeekStart.getTime(),
        });
        volumeChartDataLower.push({
          date: weekKey,
          volume: lowerVolumeMap.get(weekKey) || 0,
          isCurrentWeek: weekDate.getTime() === currentWeekStart.getTime(),
        });
      }

      setWeeklyVolumeData({ upper: volumeChartDataUpper, lower: volumeChartDataLower });
      setWeeklyMuscleBreakdown({
        upper: Array.from(upperMuscleSetsMap.entries()).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
        lower: Array.from(lowerMuscleSetsMap.entries()).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
      });

    } catch (err: any) {
      toast.error("Failed to load workout performance data: " + err.message);
      console.error("Error fetching workout performance data:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (open) {
      fetchPerformanceData();
    }
  }, [open, fetchPerformanceData]);

  const handleDeleteSession = async (sessionId: string, templateName: string | null) => {
    if (!confirm(`Are you sure you want to delete the workout session "${templateName || 'Ad Hoc Workout'}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', session?.user?.id);

      if (error) {
        throw new Error(error.message);
      }
      toast.success("Workout session deleted successfully!");
      fetchPerformanceData(); // Re-fetch data after deletion
    } catch (err: any) {
      console.error("Failed to delete workout session:", err);
      toast.error("Failed to delete workout session: " + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Workout Log & Performance</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upper' | 'lower')} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="upper">Upper Body</TabsTrigger>
            <TabsTrigger value="lower">Lower Body</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-grow overflow-y-auto px-6 pb-6">
            <TabsContent value="upper" className="mt-0 border-none p-0">
              <WeeklyBodyPartVolumeChart
                bodyPart="upper"
                data={weeklyVolumeData.upper}
                totalVolume={totalUpperVolume}
                loading={loading}
              />
              <WeeklyMuscleBreakdownChart
                bodyPart="upper"
                data={weeklyMuscleBreakdown.upper}
                loading={loading}
              />
            </TabsContent>
            <TabsContent value="lower" className="mt-0 border-none p-0">
              <WeeklyBodyPartVolumeChart
                bodyPart="lower"
                data={weeklyVolumeData.lower}
                totalVolume={totalLowerVolume}
                loading={loading}
              />
              <WeeklyMuscleBreakdownChart
                bodyPart="lower"
                data={weeklyMuscleBreakdown.lower}
                loading={loading}
              />
            </TabsContent>
            <RecentWorkoutSessionsList
              sessions={recentSessions}
              onDeleteSession={handleDeleteSession}
              loading={loading}
            />
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};