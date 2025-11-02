import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, TrendingUp, Clock, Target } from 'lucide-react-native';
import { Colors, Spacing } from '../constants/Theme';
import { TextStyles } from '../constants/Typography';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;

  // TODO: Fetch workout session data using sessionId
  // For now, showing placeholder data
  const workoutData = {
    name: 'Upper Body A',
    duration: '45:32',
    exercises: 6,
    sets: 18,
    volume: '2,450 kg',
    personalRecords: 2,
  };

  const handleDone = () => {
    router.dismissAll();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Check size={32} color={Colors.white} />
        </View>
        <Text style={styles.title}>Workout Complete!</Text>
        <Text style={styles.subtitle}>{workoutData.name}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Clock size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{workoutData.duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statCard}>
            <Target size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{workoutData.exercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{workoutData.sets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{workoutData.volume}</Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        {/* Personal Records */}
        {workoutData.personalRecords > 0 && (
          <View style={styles.prSection}>
            <Text style={styles.sectionTitle}>🎉 Personal Records</Text>
            <Text style={styles.prText}>
              You set {workoutData.personalRecords} new personal record{workoutData.personalRecords !== 1 ? 's' : ''}!
            </Text>
          </View>
        )}

        {/* AI Analysis Placeholder */}
        <View style={styles.aiSection}>
          <Text style={styles.sectionTitle}>🤖 AI Analysis</Text>
          <View style={styles.aiCard}>
            <Text style={styles.aiText}>
              Great workout! Your bench press progression is looking strong.
              Consider increasing weight on your next upper body session.
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Done Button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.doneButton,
            pressed && styles.doneButtonPressed,
          ]}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TextStyles.h4,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  prSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  prText: {
    ...TextStyles.body,
    color: Colors.foreground,
    lineHeight: 24,
  },
  aiSection: {
    marginBottom: Spacing.xl,
  },
  aiCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiText: {
    ...TextStyles.body,
    color: Colors.foreground,
    lineHeight: 24,
  },
  spacer: {
    height: Spacing.xl,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonPressed: {
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
  doneButtonText: {
    ...TextStyles.button,
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
});