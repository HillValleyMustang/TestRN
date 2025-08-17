"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ConsistencyCalendarPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState<Date[]>([]);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchActivityDates = async () => {
      setLoading(true);
      try {
        const { data: workoutDates, error: workoutError } = await supabase
          .from('workout_sessions')
          .select('session_date')
          .eq('user_id', session.user.id);
        if (workoutError) throw workoutError;

        const { data: activityDates, error: activityError } = await supabase
          .from('activity_logs')
          .select('log_date')
          .eq('user_id', session.user.id);
        if (activityError) throw activityError;

        const allDates = [
          ...(workoutDates || []).map(d => d.session_date),
          ...(activityDates || []).map(d => d.log_date)
        ].map(d => new Date(d));

        // Remove duplicates by comparing date strings
        const uniqueDates = Array.from(new Set(allDates.map(d => d.toDateString()))).map(ds => new Date(ds));
        setActiveDays(uniqueDates);

      } catch (err: any) {
        console.error("Failed to fetch activity dates:", err);
        toast.error("Failed to load activity data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityDates();
  }, [session, router, supabase]);

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consistency Calendar</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <Card>
        <CardContent className="pt-6 flex justify-center">
          {loading ? (
            <p>Loading calendar...</p>
          ) : (
            <Calendar
              mode="multiple"
              selected={activeDays}
              className="rounded-md border"
              modifiers={{
                active: activeDays,
              }}
              modifiersStyles={{
                active: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      <MadeWithDyad />
    </div>
  );
}