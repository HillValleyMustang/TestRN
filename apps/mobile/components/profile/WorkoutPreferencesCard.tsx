/**
 * Workout Preferences Card - Settings Tab
 * Edit workout preferences: Primary Goal and Preferred Session Length
 * Reference: Profile_Settings_v1 playbook
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface WorkoutPreferencesCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
  onRegenerateTPath?: (sessionLength?: number) => Promise<void>;
}

const PRIMARY_GOALS = [
  { label: 'Muscle Gain', value: 'muscle_gain' },
  { label: 'Fat Loss', value: 'fat_loss' },
  { label: 'Strength Increase', value: 'strength_increase' },
];

const SESSION_LENGTHS = [
  { label: '15-30 mins', value: 30 },
  { label: '30-45 mins', value: 45 },
  { label: '45-60 mins', value: 60 },
  { label: '60-90 mins', value: 90 },
];

export function WorkoutPreferencesCard({ 
  profile, 
  onUpdate,
  onRegenerateTPath 
}: WorkoutPreferencesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);

  const [primaryGoal, setPrimaryGoal] = useState('');
  const [sessionLength, setSessionLength] = useState<number>(60);

  useEffect(() => {
    if (profile) {
      setPrimaryGoal(profile.primary_goal || '');
      setSessionLength(profile.preferred_session_length || 60);
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        primary_goal: primaryGoal,
        preferred_session_length: sessionLength,
      };

      await onUpdate(updates);

      // If session length changed and user has active T-Path, regenerate
      if (
        sessionLength !== profile.preferred_session_length &&
        profile.active_t_path_id &&
        onRegenerateTPath
      ) {
        await onRegenerateTPath(sessionLength);
      }

      setRollingStatus('Updated!');
      setIsEditing(false);
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[WorkoutPreferencesCard] Save error:', error);
      setRollingStatus('Error!');
      setTimeout(() => setRollingStatus(null), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getGoalLabel = (value: string) => {
    return PRIMARY_GOALS.find(g => g.value === value)?.label || 'Select your goal';
  };

  const getSessionLabel = (value: number) => {
    return SESSION_LENGTHS.find(s => s.value === value)?.label || 'Select length';
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="barbell" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Workout Preferences</Text>
        </View>
        <View style={styles.headerActions}>
          {rollingStatus && (
            <Text style={[
              styles.rollingStatus,
              rollingStatus.includes('Error') && styles.rollingStatusError
            ]}>
              {rollingStatus}
            </Text>
          )}
          <TouchableOpacity 
            onPress={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={isSaving}
            style={styles.actionButton}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.blue600} />
            ) : (
              <>
                <Ionicons 
                  name={isEditing ? "checkmark" : "create-outline"} 
                  size={18} 
                  color={Colors.blue600} 
                />
                <Text style={styles.actionButtonText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Primary Goal */}
        <View style={styles.field}>
          <Text style={styles.label}>Primary Goal</Text>
          {isEditing ? (
            <View style={styles.selectContainer}>
              {PRIMARY_GOALS.map(goal => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.selectOption,
                    primaryGoal === goal.value && styles.selectOptionActive
                  ]}
                  onPress={() => setPrimaryGoal(goal.value)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    primaryGoal === goal.value && styles.selectOptionTextActive
                  ]}>
                    {goal.label}
                  </Text>
                  {primaryGoal === goal.value && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>{getGoalLabel(primaryGoal)}</Text>
          )}
        </View>

        {/* Preferred Session Length */}
        <View style={styles.field}>
          <Text style={styles.label}>Preferred Session Length</Text>
          {isEditing ? (
            <View style={styles.selectContainer}>
              {SESSION_LENGTHS.map(session => (
                <TouchableOpacity
                  key={session.value}
                  style={[
                    styles.selectOption,
                    sessionLength === session.value && styles.selectOptionActive
                  ]}
                  onPress={() => setSessionLength(session.value)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    sessionLength === session.value && styles.selectOptionTextActive
                  ]}>
                    {session.label}
                  </Text>
                  {sessionLength === session.value && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>{getSessionLabel(sessionLength)}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rollingStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.success,
  },
  rollingStatusError: {
    color: Colors.destructive,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.blue600,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  value: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  selectContainer: {
    gap: Spacing.sm,
  },
  selectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  selectOptionActive: {
    borderColor: Colors.blue600,
    backgroundColor: Colors.blue50,
  },
  selectOptionText: {
    fontSize: 14,
    color: Colors.foreground,
  },
  selectOptionTextActive: {
    fontWeight: '600',
    color: Colors.blue600,
  },
});
