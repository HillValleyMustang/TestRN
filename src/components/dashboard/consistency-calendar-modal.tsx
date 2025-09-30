"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { getCalendarItemColorCssVar, getCalendarItemDisplayName } from '@/lib/utils';
import { DayProps } from 'react-day-picker';
import { db } from '@/lib/db';
import { Tables } from '@/types/supabase';

type Profile = Tables<'profiles'>;

interface CalendarEvent {
  type: 'workout' | 'activity' | 'ad-hoc';
  name: string | null;
  logged_at: Date;
  date: Date;
}

interface CustomDayProps extends DayProps {
  activityMap: Map<string, CalendarEvent[]>;
}

const CustomDay = (props: CustomDayProps) => {
  const { date, modifiers, activityMap } = props;
  const isSelected = modifiers.selected;
  const isToday = modifiers.today;

  const dateKey = date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const eventsForDay = activityMap.get(dateKey) || [];

  const primaryEvent = eventsForDay[0];
  const secondaryEvent = eventsForDay[1];
  const tertiaryEvent = eventsForDay[2];

  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  let dotColor = 'transparent';
  let textColor = 'hsl(var(--muted-foreground))';

  if (primaryEvent) {
    backgroundColor = getCalendarItemColorCssVar(primaryEvent.name, primaryEvent.type);
    textColor = 'hsl(0 0% 100%)';
  } else if (isToday && !isSelected) {
    backgroundColor = 'hsl(var(--muted))';
  }

  if (secondaryEvent) {
    borderColor = getCalendarItemColorCssVar(secondaryEvent.name, secondaryEvent.type);
  }

  if (tertiaryEvent) {
    dotColor = getCalendarItemColorCssVar(tertiaryEvent.name, tertiaryEvent.type);
  }

  return (
    <span
      style={{
        backgroundColor: backgroundColor,
        color: textColor,
        borderRadius: '0.375rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        border: secondaryEvent ? `2px solid ${borderColor}` : 'none',
        position: 'relative',
        padding: '6px',
      }}
      className="relative z-10"
    >
      {date.getDate()}
      {tertiaryEvent && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
          }}
        ></div>
      )}
    </span>
  );
};


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
                components={{
                  Day: (props) => <CustomDay {...props} activityMap={activityMap} />,
                }}
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