"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/utils';

type WorkoutSession = Tables<'workout_sessions'>;

export const PreviousWorkoutsCard = () => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWorkouts = async () => {
      if (!session) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select('id, template_name, session_date, duration_string, completed_at, created_at, rating, t_path_id, user_id') // Added missing columns
          .eq('user_id', session.user.id)
          .not('completed_at', 'is', null) // Only show completed workouts
          .order('session_date', { ascending: false })
          .limit(3);

        if (error) throw error;
        setRecentSessions(data || []);
      } catch (err: any) {
        toast.error("Failed to load previous workouts: " + err.message);
        console.error("Error fetching previous workouts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentWorkouts();
  }, [session, supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Previous Workouts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recentSessions.length === 0 ? (
          <p className="text-muted-foreground">No previous workouts found. Complete a workout to see it here!</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((sessionItem) => (
              <div key={sessionItem.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                <div>
                  <h3 className="font-semibold text-base">{sessionItem.template_name || 'Ad Hoc Workout'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {sessionItem.completed_at ? formatTimeAgo(new Date(sessionItem.completed_at)) : 'N/A'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/workout-summary/${sessionItem.id}`)}
                >
                  View Summary
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-center text-primary hover:text-primary/90"
              onClick={() => router.push('/workout-history')}
            >
              View All History <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};