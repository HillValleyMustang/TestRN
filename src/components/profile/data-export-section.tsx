"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileText } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { useGlobalStatus } from '@/contexts'; // NEW: Import useGlobalStatus

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ActivityLog = Tables<'activity_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

export const DataExportSection = () => {
  const { session, supabase } = useSession();
  const { startLoading, endLoadingSuccess, endLoadingError } = useGlobalStatus(); // NEW: Use global status
  const [loading, setLoading] = useState(false); // Keep local loading for button disabled state

  const exportDataToCsv = async () => {
    if (!session) {
      toast.error("You must be logged in to export data.");
      return;
    }

    setLoading(true);
    startLoading("Preparing your data for export..."); // NEW: Use global loading

    try {
      // Fetch Workout Sessions
      const { data: workoutSessions, error: wsError } = await supabase
        .from('workout_sessions')
        .select('id, template_name, session_date, duration_string, rating, completed_at')
        .eq('user_id', session.user.id)
        .order('session_date', { ascending: false });
      if (wsError) throw wsError;

      // Fetch Set Logs with Exercise Names
      const { data: setLogs, error: slError } = await supabase
        .from('set_logs')
        .select(`
          id, session_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at,
          exercise_definitions (name),
          workout_sessions (template_name)
        `)
        .eq('workout_sessions.user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (slError) throw slError;

      // Fetch Activity Logs
      const { data: activityLogs, error: alError } = await supabase
        .from('activity_logs')
        .select('id, activity_type, log_date, distance, time, avg_time, is_pb, created_at')
        .eq('user_id', session.user.id)
        .order('log_date', { ascending: false });
      if (alError) throw alError;

      const csvContent: string[] = [];

      // --- Workout Sessions CSV ---
      csvContent.push('Workout Sessions\n');
      if (workoutSessions && workoutSessions.length > 0) {
        const wsHeaders = ['ID', 'Template Name', 'Session Date', 'Duration', 'Rating', 'Completed At'];
        csvContent.push(wsHeaders.join(',') + '\n');
        workoutSessions.forEach(sessionItem => {
          const row = [
            sessionItem.id,
            sessionItem.template_name || 'Ad Hoc Workout',
            new Date(sessionItem.session_date).toLocaleString(),
            sessionItem.duration_string || 'N/A',
            sessionItem.rating || 'N/A',
            sessionItem.completed_at ? new Date(sessionItem.completed_at).toLocaleString() : 'N/A',
          ];
          csvContent.push(row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',') + '\n');
        });
      } else {
        csvContent.push('No workout sessions found.\n');
      }
      csvContent.push('\n'); // Separator

      // --- Set Logs CSV ---
      csvContent.push('Set Logs\n');
      if (setLogs && setLogs.length > 0) {
        const slHeaders = ['ID', 'Session ID', 'Workout Name', 'Exercise Name', 'Weight (kg)', 'Reps', 'Reps (L)', 'Reps (R)', 'Time (s)', 'Is PR', 'Created At'];
        csvContent.push(slHeaders.join(',') + '\n');
        setLogs.forEach((log: any) => { // Use 'any' for joined data for simplicity in export
          const row = [
            log.id,
            log.session_id,
            log.workout_sessions?.template_name || 'N/A',
            log.exercise_definitions?.name || 'Unknown Exercise',
            log.weight_kg || 'N/A',
            log.reps || 'N/A',
            log.reps_l || 'N/A',
            log.reps_r || 'N/A',
            log.time_seconds || 'N/A',
            log.is_pb ? 'Yes' : 'No',
            new Date(log.created_at).toLocaleString(),
          ];
          csvContent.push(row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',') + '\n');
        });
      } else {
        csvContent.push('No set logs found.\n');
      }
      csvContent.push('\n'); // Separator

      // --- Activity Logs CSV ---
      csvContent.push('Activity Logs\n');
      if (activityLogs && activityLogs.length > 0) {
        const alHeaders = ['ID', 'Activity Type', 'Log Date', 'Distance', 'Time', 'Avg. Time', 'Is PB', 'Created At'];
        csvContent.push(alHeaders.join(',') + '\n');
        activityLogs.forEach(activity => {
          const row = [
            activity.id,
            activity.activity_type,
            new Date(activity.log_date).toLocaleDateString(),
            activity.distance || 'N/A',
            activity.time || 'N/A',
            activity.avg_time || 'N/A',
            activity.is_pb ? 'Yes' : 'No',
            new Date(activity.created_at).toLocaleString(),
          ];
          csvContent.push(row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',') + '\n');
        });
      } else {
        csvContent.push('No activity logs found.\n');
      }

      const blob = new Blob([csvContent.join('')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `workout_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      URL.revokeObjectURL(url);

      endLoadingSuccess("Your data has been exported successfully!"); // NEW: Use global success

    } catch (error: any) {
      console.error("Error exporting data:", error);
      endLoadingError("Failed to export data: " + error.message); // NEW: Use global error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Data Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Download all your workout sessions, set logs, and activity logs as a CSV file.
          This allows you to keep a personal backup of your fitness journey.
        </p>
        <Button onClick={exportDataToCsv} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {loading ? "Exporting Data..." : "Export My Data"}
        </Button>
      </CardContent>
    </Card>
  );
};