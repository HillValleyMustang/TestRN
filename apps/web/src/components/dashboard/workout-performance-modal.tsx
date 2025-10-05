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
import { formatTime } from '@/lib/unit-conversions';
import { useWorkoutPerformanceData } from '@/hooks/data/useWorkoutPerformanceData'; // Import the new hook

type WorkoutSession = Tables<'workout_sessions'>;

interface WorkoutPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WeeklyBodyPartVolumeChart = ({ bodyPart, data, totalVolume, loading }: { bodyPart: 'upper' | 'lower', data: any[], totalVolume: number, loading: boolean }) => {
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

const WeeklyMuscleBreakdownChart = ({ bodyPart, data, loading }: { bodyPart: 'upper' | 'lower', data: any[], loading: boolean }) => {
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

const RecentWorkoutSessionsList = ({ sessions, onDeleteSession, loading }: { sessions: WorkoutSession[], onDeleteSession: (sessionId: string, templateName: string | null) => void, loading: boolean }) => {
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
                      size="icon"
                      onClick={() => onDeleteSession(sessionItem.id, sessionItem.template_name)}
                    >
                      <Trash2 className="h-4 w-4" />
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
  
  // Use the new centralized hook for all data and state
  const {
    weeklyVolumeData,
    weeklyMuscleBreakdown,
    recentSessions,
    totalUpperVolume,
    totalLowerVolume,
    loading,
    error,
    refresh,
  } = useWorkoutPerformanceData();

  useEffect(() => {
    if (error) {
      toast.error("Failed to load workout performance data: " + error);
    }
  }, [error]);

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
      refresh(); // Re-fetch data after deletion using the hook's refresh function
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