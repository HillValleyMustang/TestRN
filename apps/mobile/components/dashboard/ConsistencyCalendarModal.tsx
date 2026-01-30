/**
 * ConsistencyCalendarModal Component
 * Shows workout and activity consistency calendar
 * Matches web version functionality
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/_contexts/auth-context';
import { useData } from '../../app/_contexts/data-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { getWorkoutColor } from '../../lib/workout-colors';

interface CalendarEvent {
  type: 'workout' | 'activity' | 'ad-hoc';
  name: string | null;
  logged_at: Date;
  date: Date;
}

interface ConsistencyCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsistencyCalendarModal({ open, onOpenChange }: ConsistencyCalendarModalProps) {
  const { userId, supabase } = useAuth();
  const { getWorkoutSessions } = useData();
  const [loading, setLoading] = useState(true);
  const [activityMap, setActivityMap] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [uniqueActivityTypes, setUniqueActivityTypes] = useState<Set<string>>(new Set());
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  useEffect(() => {
    if (open && userId) {
      const fetchActivityDates = async () => {
        setLoading(true);
        try {
          // Get workout sessions
          const workoutSessions = await getWorkoutSessions(userId);

          // Get profile data for streak (if available)
          let streak = 0;
          if (supabase) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('current_streak')
              .eq('id', userId)
              .single();

            if (profileData) {
              streak = profileData.current_streak || 0;
            }
          }
          setCurrentStreak(streak);

          const newActivityMap = new Map<string, CalendarEvent[]>();
          const newUniqueActivityTypes = new Set<string>();

          // Process workout sessions
          workoutSessions.forEach(ws => {
            if (!ws.completed_at) return; // Only completed workouts

            const date = new Date(ws.session_date);
            const dateKey = date.toLocaleDateString('en-CA', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            const rawName = ws.template_name || 'Ad-Hoc';
            // Normalize "Workout" and "Ad Hoc Workout" to "Ad-Hoc"
            const workoutName = (rawName === 'Workout' || rawName === 'Ad Hoc Workout') ? 'Ad-Hoc' : rawName;

            if (!newActivityMap.has(dateKey)) {
              newActivityMap.set(dateKey, []);
            }
            newActivityMap.get(dateKey)?.push({
              date,
              type: workoutName === 'Ad-Hoc' ? 'ad-hoc' : 'workout',
              name: workoutName,
              logged_at: new Date(ws.created_at || ws.session_date)
            });
            newUniqueActivityTypes.add(workoutName);
          });

          // Sort events by logged time
          newActivityMap.forEach((events, dateKey) => {
            events.sort((a, b) => a.logged_at.getTime() - b.logged_at.getTime());
            newActivityMap.set(dateKey, events);
          });

          setActivityMap(newActivityMap);
          setUniqueActivityTypes(newUniqueActivityTypes);

        } catch (err: any) {
          console.error("Failed to fetch activity dates:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchActivityDates();
    }
  }, [open, userId, supabase, getWorkoutSessions]);

  const sortedUniqueActivityTypes = useMemo(() => {
    const types = Array.from(uniqueActivityTypes);

    // Define custom order for workout types
    const workoutOrder: Record<string, number> = {
      // ULUL pattern
      'Upper Body A': 1,
      'Lower Body A': 2,
      'Upper Body B': 3,
      'Lower Body B': 4,
      // PPL pattern
      'Push': 5,
      'Pull': 6,
      'Legs': 7,
      // Ad-hoc always last
      'Ad-Hoc': 999,
    };

    return types.sort((a, b) => {
      const orderA = workoutOrder[a] ?? 100; // Unknown workouts go in the middle
      const orderB = workoutOrder[b] ?? 100;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // If same order priority (or both unknown), sort alphabetically
      return a.localeCompare(b);
    });
  }, [uniqueActivityTypes]);

  // Generate calendar data for current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const events = activityMap.get(dateKey) || [];
      const isCurrentMonth = current.getMonth() === month;

      days.push({
        date: new Date(current),
        dateKey,
        events,
        isCurrentMonth,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [activityMap]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        <Pressable style={styles.container} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Consistency Calendar</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => onOpenChange(false)}
            >
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Calendar Header */}
              <Text style={styles.monthTitle}>{currentMonth}</Text>

              {/* Week day headers */}
              <View style={styles.weekHeader}>
                {weekDays.map(day => (
                  <Text key={day} style={styles.weekDayHeader}>{day}</Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarData.map((day, index) => {
                  const primaryEvent = day.events[0];
                  const secondaryEvent = day.events[1];

                  let backgroundColor = 'transparent';
                  let borderColor = 'transparent';
                  let textColor = day.isCurrentMonth ? Colors.foreground : Colors.mutedForeground;

                  if (primaryEvent) {
                    const colors = getWorkoutColor(primaryEvent.name || 'Ad-Hoc');
                    backgroundColor = colors.main;
                    textColor = 'white';
                  }

                  if (secondaryEvent) {
                    const colors = getWorkoutColor(secondaryEvent.name || 'Ad-Hoc');
                    borderColor = colors.main;
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor,
                          borderColor,
                          borderWidth: borderColor !== 'transparent' ? 2 : 0,
                        }
                      ]}
                    >
                      <Text style={[styles.dayText, { color: textColor }]}>
                        {day.date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Legend</Text>
                <View style={styles.legendGrid}>
                  {sortedUniqueActivityTypes.map(typeName => {
                    const colors = getWorkoutColor(typeName);
                    return (
                      <View key={typeName} style={styles.legendItem}>
                        <View
                          style={[styles.legendColor, { backgroundColor: colors.main }]}
                        />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {typeName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxHeight: '94%',
    width: '98%',
    maxWidth: 520,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.mutedForeground,
    fontSize: 16,
  },
  scrollView: {
    maxHeight: 500,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontFamily: 'Poppins_600SemiBold',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    gap: 4,
    paddingHorizontal: 4,
  },
  weekDayHeader: {
    width: '12.5%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_500Medium',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
  },
  dayCell: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  legendContainer: {
    marginTop: Spacing.lg,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.md,
    fontFamily: 'Poppins_600SemiBold',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%',
    marginBottom: Spacing.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  legendText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    flex: 1,
    fontFamily: 'Poppins_400Regular',
  },
});