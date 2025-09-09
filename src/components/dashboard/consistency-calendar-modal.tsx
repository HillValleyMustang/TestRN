"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { getCalendarItemColorCssVar, getCalendarItemDisplayName } from '@/lib/utils'; // Import new utilities
import { DayContentProps, ActiveModifiers } from 'react-day-picker'; // Import DayContentProps and ActiveModifiers

interface ConsistencyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActivityEntry {
  date: Date;
  type: 'workout' | 'activity' | 'ad-hoc';
  name: string | null;
}

// Define a new interface for CustomDayContent's props
interface CustomDayContentProps extends DayContentProps {
  activityMap: Map<string, ActivityEntry>;
}

// Custom Day Content component
const CustomDayContent = (props: CustomDayContentProps) => {
  const { date, activeModifiers, displayMonth, activityMap } = props; // Destructure activityMap
  const isSelected = activeModifiers.selected;
  const isToday = activeModifiers.today;

  // Find the corresponding activity entry for this date
  const dateKey = date.toISOString().split('T')[0];
  const activityEntry = activityMap.get(dateKey);

  let backgroundColor = 'transparent';
  if (activityEntry) {
    backgroundColor = getCalendarItemColorCssVar(activityEntry.name, activityEntry.type);
  } else if (isToday && !isSelected) {
    // If it's today and not selected, use a subtle highlight
    backgroundColor = 'hsl(var(--muted))';
  }

  return (
    <span
      style={{
        backgroundColor: backgroundColor,
        color: activityEntry ? 'hsl(0 0% 100%)' : (isToday ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'),
        borderRadius: '0.375rem', // rounded-md
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
      className="relative z-10" // Ensure it's above any default button background
    >
      {date.getDate()}
    </span>
  );
};


export const ConsistencyCalendarModal = ({ open, onOpenChange }: ConsistencyCalendarModalProps) => {
  const { session, supabase } = useSession();
  const [loading, setLoading] = useState(true);
  const [activityMap, setActivityMap] = useState<Map<string, ActivityEntry>>(new Map()); // Map<YYYY-MM-DD, ActivityEntry>
  const [uniqueActivityTypes, setUniqueActivityTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && session) {
      const fetchActivityDates = async () => {
        setLoading(true);
        try {
          // Fetch workout sessions with template_name
          const { data: workoutSessions, error: workoutError } = await supabase
            .from('workout_sessions')
            .select('session_date, template_name')
            .eq('user_id', session.user.id)
            .not('completed_at', 'is', null); // Only completed workouts
          if (workoutError) throw workoutError;

          // Fetch activity logs with activity_type
          const { data: activityLogs, error: activityError } = await supabase
            .from('activity_logs')
            .select('log_date, activity_type')
            .eq('user_id', session.user.id);
          if (activityError) throw activityError;

          const newActivityMap = new Map<string, ActivityEntry>();
          const newUniqueActivityTypes = new Set<string>();

          // Process workout sessions
          (workoutSessions || []).forEach(ws => {
            const date = new Date(ws.session_date);
            const dateKey = date.toISOString().split('T')[0];
            const workoutName = ws.template_name || 'Ad Hoc Workout';
            
            // Prioritize workouts over activities if both exist on the same day
            // Or if a workout is already there, keep it.
            if (!newActivityMap.has(dateKey) || newActivityMap.get(dateKey)?.type === 'activity') {
              newActivityMap.set(dateKey, { date, type: workoutName === 'Ad Hoc Workout' ? 'ad-hoc' : 'workout', name: workoutName });
            }
            newUniqueActivityTypes.add(getCalendarItemDisplayName(workoutName, workoutName === 'Ad Hoc Workout' ? 'ad-hoc' : 'workout'));
          });

          // Process activity logs (only if no workout is already logged for that day)
          (activityLogs || []).forEach(al => {
            const date = new Date(al.log_date);
            const dateKey = date.toISOString().split('T')[0];
            const activityName = al.activity_type;

            // Only add if no workout is present for this day, or if it's an activity and the existing entry is also an activity
            if (!newActivityMap.has(dateKey) || newActivityMap.get(dateKey)?.type === 'activity') {
              newActivityMap.set(dateKey, { date, type: 'activity', name: activityName });
            }
            newUniqueActivityTypes.add(getCalendarItemDisplayName(activityName, 'activity'));
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
    return Array.from(uniqueActivityTypes).sort();
  }, [uniqueActivityTypes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consistency Calendar</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center">
          {loading ? (
            <p>Loading calendar...</p>
          ) : (
            <>
              <Calendar
                mode="multiple"
                selected={Array.from(activityMap.values()).map(entry => entry.date)}
                className="rounded-md border"
                modifiers={calendarModifiers.modifiers}
                modifiersStyles={calendarModifiers.styles}
                components={{
                  DayContent: (props) => <CustomDayContent {...props} activityMap={activityMap} />,
                }}
                // Removed classNames as CustomDayContent handles styling
              />
              <div className="mt-6 w-full px-4">
                <h3 className="text-md font-semibold mb-3">Key:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {sortedUniqueActivityTypes.map(typeDisplayName => {
                    // Find the original entry to get the correct name and type for color lookup
                    const originalEntry = Array.from(activityMap.values()).find(entry => 
                      getCalendarItemDisplayName(entry.name, entry.type) === typeDisplayName
                    );
                    if (!originalEntry) return null;

                    return (
                      <div key={typeDisplayName} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: getCalendarItemColorCssVar(originalEntry.name, originalEntry.type) }}
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