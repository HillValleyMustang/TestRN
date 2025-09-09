"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { getCalendarItemColorCssVar, getCalendarItemDisplayName } from '@/lib/utils'; // Import new utilities
import { DayContentProps, ActiveModifiers } from 'react-day-picker'; // Import DayContentProps and ActiveModifiers
import { db } from '@/lib/db'; // Import db for fetching profile
import { Tables } from '@/types/supabase'; // Import Tables for Profile type

type Profile = Tables<'profiles'>;

interface ConsistencyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define a new interface for events
interface CalendarEvent {
  type: 'workout' | 'activity' | 'ad-hoc';
  name: string | null;
  logged_at: Date; // Use Date object for easier sorting
  date: Date; // ADDED: The actual date of the event
}

// Define a new interface for CustomDayContent's props
interface CustomDayContentProps extends DayContentProps {
  activityMap: Map<string, CalendarEvent[]>;
}

// Custom Day Content component
const CustomDayContent = (props: CustomDayContentProps) => {
  const { date, activeModifiers, activityMap } = props;
  const isSelected = activeModifiers.selected;
  const isToday = activeModifiers.today;

  // Use toLocaleDateString to get the local date string (YYYY-MM-DD) for map key
  const dateKey = date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const eventsForDay = activityMap.get(dateKey) || [];

  const primaryEvent = eventsForDay[0];
  const secondaryEvent = eventsForDay[1];
  const tertiaryEvent = eventsForDay[2];

  let backgroundColor = 'transparent';
  let borderColor = 'transparent';
  let dotColor = 'transparent';
  let textColor = 'hsl(var(--muted-foreground))'; // Default text color

  if (primaryEvent) {
    backgroundColor = getCalendarItemColorCssVar(primaryEvent.name, primaryEvent.type);
    textColor = 'hsl(0 0% 100%)'; // White text for colored backgrounds
  } else if (isToday && !isSelected) {
    backgroundColor = 'hsl(var(--muted))'; // Subtle highlight for today
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
        borderRadius: '0.375rem', // rounded-md
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        border: secondaryEvent ? `2px solid ${borderColor}` : 'none', // Apply border if secondary event exists
        position: 'relative', // Needed for absolute positioning of the dot
        padding: '6px', // Keeping 6px padding as requested
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


export const ConsistencyCalendarModal = ({ open, onOpenChange }: ConsistencyCalendarModalProps) => {
  const { session, supabase } = useSession();
  const [loading, setLoading] = useState(true);
  const [activityMap, setActivityMap] = useState<Map<string, CalendarEvent[]>>(new Map()); // Map<YYYY-MM-DD, CalendarEvent[]>
  const [uniqueActivityTypes, setUniqueActivityTypes] = useState<Set<string>>(new Set());
  const [currentStreak, setCurrentStreak] = useState<number>(0); // State for current streak

  useEffect(() => {
    if (open && session) {
      const fetchActivityDates = async () => {
        setLoading(true);
        try {
          // Fetch workout sessions with template_name and created_at
          const { data: workoutSessions, error: workoutError } = await supabase
            .from('workout_sessions')
            .select('session_date, template_name, created_at')
            .eq('user_id', session.user.id)
            .not('completed_at', 'is', null); // Only completed workouts
          if (workoutError) throw workoutError;

          // Fetch activity logs with activity_type and log_date
          const { data: activityLogs, error: activityError } = await supabase
            .from('activity_logs')
            .select('log_date, activity_type, created_at')
            .eq('user_id', session.user.id);
          if (activityError) throw activityError;

          // Fetch profile for current streak
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('current_streak')
            .eq('id', session.user.id)
            .single();
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile for streak:", profileError);
          } else if (profileData) {
            setCurrentStreak(profileData.current_streak || 0);
          }

          const newActivityMap = new Map<string, CalendarEvent[]>();
          const newUniqueActivityTypes = new Set<string>();

          // Process workout sessions
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
              logged_at: new Date(ws.created_at || ws.session_date) // Use created_at for sorting, fallback to session_date
            });
            newUniqueActivityTypes.add(getCalendarItemDisplayName(workoutName, workoutName === 'Ad Hoc Workout' ? 'ad-hoc' : 'workout'));
          });

          // Process activity logs
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
              logged_at: new Date(al.created_at || al.log_date) // Use created_at for sorting, fallback to log_date
            });
            newUniqueActivityTypes.add(getCalendarItemDisplayName(activityName, 'activity'));
          });

          // Sort events for each day by logged_at timestamp
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
  }, [open, session, supabase]);

  const calendarModifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {};
    // No styles needed here, as CustomDayContent will handle it
    return { modifiers, styles: {} };
  }, [activityMap]);

  const sortedUniqueActivityTypes = useMemo(() => {
    // Create a list of all unique event types (workout names + activity types)
    const allEventTypes = new Set<string>();
    activityMap.forEach(events => {
      events.forEach(event => {
        allEventTypes.add(getCalendarItemDisplayName(event.name, event.type));
      });
    });

    // Sort them alphabetically
    return Array.from(allEventTypes).sort();
  }, [activityMap]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle>Consistency Calendar</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center">
          {loading ? (
            <p>Loading calendar...</p>
          ) : (
            <>
              <p className="text-lg font-semibold mb-4">Current Streak: {currentStreak} Days</p>
              <Calendar
                mode="multiple"
                selected={Array.from(activityMap.values()).flatMap(events => events.map(e => e.date))}
                className="rounded-md border w-full"
                modifiers={calendarModifiers.modifiers}
                modifiersStyles={calendarModifiers.styles}
                components={{
                  DayContent: (props) => <CustomDayContent {...props} activityMap={activityMap} />,
                }}
                // Removed classNames as CustomDayContent handles styling
              />
              <div className="mt-6 w-full px-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {sortedUniqueActivityTypes.map(typeDisplayName => {
                    // Find the first event that matches this display name to get its original name and type for color lookup
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