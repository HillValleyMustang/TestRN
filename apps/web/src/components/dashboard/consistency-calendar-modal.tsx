"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { getCalendarItemColorCssVar, getCalendarItemDisplayName } from '@/lib/utils'; // Keep web-specific utils;
import { db } from '@/lib/db';
import { Tables } from '@/types/supabase';

type Profile = Tables<'profiles'>;

interface CalendarEvent {
  type: 'workout' | 'activity' | 'ad-hoc';
  name: string | null;
  logged_at: Date;
  date: Date;
}

export const ConsistencyCalendarModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [loading, setLoading] = useState(true);
  const [activityMap, setActivityMap] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [uniqueActivityTypes, setUniqueActivityTypes] = useState<Set<string>>(new Set());
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  useEffect(() => {
    if (open && memoizedSessionUserId) {
      const fetchActivityDates = async () => {
        setLoading(true);
        try {
          const { data: workoutSessions, error: workoutError } = await supabase
            .from('workout_sessions')
            .select('session_date, template_name, created_at')
            .eq('user_id', memoizedSessionUserId)
            .not('completed_at', 'is', null);
          if (workoutError) throw workoutError;

          const { data: activityLogs, error: activityError } = await supabase
            .from('activity_logs')
            .select('log_date, activity_type, created_at')
            .eq('user_id', memoizedSessionUserId);
          if (activityError) throw activityError;

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('current_streak')
            .eq('id', memoizedSessionUserId)
            .single();
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile for streak:", profileError);
            toast.error("Failed to load user streak data.");
          } else if (profileData) {
            setCurrentStreak(profileData.current_streak || 0);
          }

          const newActivityMap = new Map<string, CalendarEvent[]>();
          const newUniqueActivityTypes = new Set<string>();

          (workoutSessions || []).forEach(ws => {
            const date = new Date(ws.session_date);
            const dateKey = date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const workoutName = ws.template_name || 'Ad Hoc Workout';
            
            if (!newActivityMap.has(dateKey)) {
              newActivityMap.set(dateKey, []);
            }
            newActivityMap.get(dateKey)?.push({ 
              date, 
              type: workoutName === 'Ad Hoc Workout' ? 'ad-hoc' : 'workout', 
              name: workoutName,
              logged_at: new Date(ws.created_at || ws.session_date)
            });
            newUniqueActivityTypes.add(getCalendarItemDisplayName(workoutName, workoutName === 'Ad Hoc Workout' ? 'ad-hoc' : 'workout'));
          });

          (activityLogs || []).forEach(al => {
            const date = new Date(al.log_date);
            const dateKey = date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const activityName = al.activity_type;

            if (!newActivityMap.has(dateKey)) {
              newActivityMap.set(dateKey, []);
            }
            newActivityMap.get(dateKey)?.push({ 
              date, 
              type: 'activity', 
              name: activityName,
              logged_at: new Date(al.created_at || al.log_date)
            });
            newUniqueActivityTypes.add(getCalendarItemDisplayName(activityName, 'activity'));
          });

          newActivityMap.forEach((events, dateKey) => {
            events.sort((a, b) => a.logged_at.getTime() - b.logged_at.getTime());
            newActivityMap.set(dateKey, events);
          });

          setActivityMap(newActivityMap);
          setUniqueActivityTypes(newUniqueActivityTypes);

        } catch (err: any) {
          console.error("Failed to fetch activity dates:", err);
          toast.error("Failed to load activity data: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchActivityDates();
    }
  }, [open, memoizedSessionUserId, supabase]);

  const { modifiers, modifiersStyles } = useMemo(() => {
    const mods: Record<string, Date[]> = {};
    const styles: Record<string, React.CSSProperties> = {};

    activityMap.forEach((events, dateKey) => {
      const date = new Date(dateKey);
      const primaryEvent = events[0];
      const secondaryEvent = events[1];

      if (primaryEvent) {
        const primaryModName = `primary-${dateKey}`;
        mods[primaryModName] = [date];
        styles[primaryModName] = {
          backgroundColor: getCalendarItemColorCssVar(primaryEvent.name, primaryEvent.type),
          color: 'hsl(0 0% 100%)', // white text
        };
      }
      if (secondaryEvent) {
        const secondaryModName = `secondary-${dateKey}`;
        mods[secondaryModName] = [date];
        styles[secondaryModName] = {
          border: `2px solid ${getCalendarItemColorCssVar(secondaryEvent.name, secondaryEvent.type)}`,
        };
      }
    });

    return { modifiers: mods, modifiersStyles: styles };
  }, [activityMap]);

  const sortedUniqueActivityTypes = useMemo(() => {
    const allEventTypes = new Set<string>();
    activityMap.forEach(events => {
      events.forEach(event => {
        allEventTypes.add(getCalendarItemDisplayName(event.name, event.type));
      });
    });
    return Array.from(allEventTypes).sort();
  }, [activityMap]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-2 sm:p-4">
        <DialogHeader>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center">
          {loading ? (
            <p>Loading calendar...</p>
          ) : (
            <>
              <p className="text-lg font-semibold mb-4">Consistency Calendar</p>
              <Calendar
                mode="multiple"
                selected={Array.from(activityMap.values()).flatMap(events => events.map(e => e.date))}
                className="rounded-md border w-full"
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
              />
              <div className="mt-6 w-full px-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {sortedUniqueActivityTypes.map(typeDisplayName => {
                    const originalEvent = Array.from(activityMap.values()).flatMap(events => events).find(event => 
                      getCalendarItemDisplayName(event.name, event.type) === typeDisplayName
                    );
                    if (!originalEvent) return null;

                    return (
                      <div key={typeDisplayName} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: getCalendarItemColorCssVar(originalEvent.name, originalEvent.type) }}
                        ></div>
                        <span>{typeDisplayName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};