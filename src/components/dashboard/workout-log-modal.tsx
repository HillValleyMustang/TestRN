"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

type WorkoutSession = Tables<'workout_sessions'>;

interface WorkoutLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkoutLogModal = ({ open, onOpenChange }: WorkoutLogModalProps) => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && session) {
      const fetchRecentWorkouts = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('workout_sessions')
            .select('id, template_name, session_date, duration_string, created_at, rating, user_id') // Specify all columns required by WorkoutSession
            .eq('user_id', session.user.id)
            .order('session_date', { ascending: false })
            .limit(3);

          if (error) throw error;
          setRecentSessions(data as WorkoutSession[] || []); // Explicitly cast
        } catch (err: any) {
          toast.error("Failed to load recent workouts: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRecentWorkouts();
    }
  }, [open, session, supabase]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Recent Workouts</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-center">No recent workouts found.</p>
          ) : (
            recentSessions.map((sessionItem) => (
              <Card key={sessionItem.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{sessionItem.template_name || 'Ad Hoc Workout'}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sessionItem.session_date).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Duration: {sessionItem.duration_string || 'N/A'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/workout-summary/${sessionItem.id}`);
                    }}
                  >
                    View Summary
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              router.push('/workout-history');
            }}
          >
            View Full Workout History
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};