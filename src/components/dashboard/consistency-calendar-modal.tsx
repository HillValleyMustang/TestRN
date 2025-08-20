"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

interface ConsistencyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConsistencyCalendarModal = ({ open, onOpenChange }: ConsistencyCalendarModalProps) => {
  const { session, supabase } = useSession();
  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState<Date[]>([]);

  useEffect(() => {
    if (open && session) {
      const fetchActivityDates = async () => {
        setLoading(true);
        try {
          const { data: workoutDates, error: workoutError } = await supabase
            .from('workout_sessions')
            .select('session_date') // Specify columns
            .eq('user_id', session.user.id);
          if (workoutError) throw workoutError;

          const { data: activityDates, error: activityError } = await supabase
            .from('activity_logs')
            .select('log_date') // Specify columns
            .eq('user_id', session.user.id);
          if (activityError) throw activityError;

          const allDates = [
            ...(workoutDates || []).map(d => d.session_date),
            ...(activityDates || []).map(d => d.log_date)
          ].map(d => new Date(d));

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
    }
  }, [open, session, supabase]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consistency Calendar</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex justify-center">
          {loading ? (
            <p>Loading calendar...</p>
          ) : (
            <Calendar
              mode="multiple"
              selected={activeDays}
              className="rounded-md border"
              modifiers={{ active: activeDays }}
              modifiersStyles={{
                active: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                },
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};