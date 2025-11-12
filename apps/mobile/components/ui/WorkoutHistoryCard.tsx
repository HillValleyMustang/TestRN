/**
 * WorkoutHistoryCard Component
 * Displays detailed workout session information in a card format
 * Matches web version design with grid layout for stats
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { WorkoutBadge } from './WorkoutBadge';
import { getWorkoutColor } from '../../lib/workout-colors';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface WorkoutSession {
  id: string;
  template_name: string | null;
  session_date: string;
  duration_string?: string | null;
  exercise_count: number;
  total_volume_kg: number;
  has_prs?: boolean;
}

interface WorkoutHistoryCardProps {
  session: WorkoutSession;
  onViewSummary: (sessionId: string) => void;
  onDelete?: (sessionId: string, templateName: string | null) => void;
}

export function WorkoutHistoryCard({ session, onViewSummary, onDelete }: WorkoutHistoryCardProps) {
  const workoutColors = getWorkoutColor(session.template_name || 'Ad Hoc Workout');

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout Session',
      `Are you sure you want to delete "${session.template_name || 'Ad Hoc Workout'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(session.id, session.template_name),
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.workoutCard, { borderColor: workoutColors.main }]}>
      <View style={styles.workoutTop}>
        <View style={styles.workoutLeft}>
          <Text
            style={[styles.workoutName, { color: workoutColors.main }]}
            numberOfLines={1}
          >
            {session.template_name || 'Ad Hoc Workout'}
          </Text>
          <Text style={styles.timeAgo}>{formatDate(session.session_date)}</Text>
        </View>

        <View style={styles.workoutRight}>
          {session.has_prs && (
            <View style={styles.prBadge}>
              <Ionicons name="trophy" size={12} color="#F59E0B" />
              <Text style={styles.prBadgeText}>PB</Text>
            </View>
          )}
          {onDelete && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={Colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.workoutBottom}>
        <View style={styles.stat}>
          <Ionicons name="barbell" size={12} color={Colors.mutedForeground} />
          <Text style={styles.statText}>{session.exercise_count} Exercises</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="timer-outline" size={12} color={Colors.mutedForeground} />
          <Text style={styles.statText}>{session.duration_string || 'Less than a minute'}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="stats-chart-outline" size={12} color={Colors.mutedForeground} />
          <Text style={styles.statText}>{session.total_volume_kg.toLocaleString()} kg</Text>
        </View>
      </View>

      <Pressable style={styles.viewSummaryButton} onPress={() => onViewSummary(session.id)}>
        <Text style={[styles.viewSummaryText, { color: workoutColors.main }]}>View Summary</Text>
        <Ionicons name="arrow-forward" size={14} color={workoutColors.main} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  workoutCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.card,
    marginBottom: Spacing.md,
  },
  workoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  workoutLeft: {
    flex: 1,
    gap: 2,
  },
  workoutName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  timeAgo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  prBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  viewSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  viewSummaryText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
});