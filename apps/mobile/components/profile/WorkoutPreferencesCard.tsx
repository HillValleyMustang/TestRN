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
import { useSettingsStrings } from '../../localization/useSettingsStrings';

interface WorkoutPreferencesCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
  onRegenerateTPath?: (sessionLength?: number) => Promise<void>;
}

export function WorkoutPreferencesCard({ 
  profile, 
  onUpdate,
  onRegenerateTPath 
}: WorkoutPreferencesCardProps) {
  const strings = useSettingsStrings();
  const PRIMARY_GOAL_OPTIONS = strings.workout_preferences.primary_goal_options;
  const SESSION_LENGTH_OPTIONS = strings.workout_preferences.session_length_options;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const [primaryGoal, setPrimaryGoal] = useState('');
  const [sessionLength, setSessionLength] = useState<number>(60);

  useEffect(() => {
    if (profile) {
      setPrimaryGoal(profile.primary_goal || '');
      
      // Handle both string and numeric session length values
      let parsedSessionLength = 60; // default
      if (profile.preferred_session_length) {
        // If it's a string like '30-45', extract the upper bound number
        if (typeof profile.preferred_session_length === 'string') {
          const match = profile.preferred_session_length.match(/(\d+)-(\d+)/);
          if (match) {
            parsedSessionLength = parseInt(match[2], 10); // Use upper bound (e.g., 45 from '30-45')
          } else {
            parsedSessionLength = parseInt(profile.preferred_session_length, 10) || 60;
          }
        } else {
          parsedSessionLength = profile.preferred_session_length;
        }
      }
      setSessionLength(parsedSessionLength);
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        primary_goal: primaryGoal,
        preferred_session_length: sessionLength,
      };

      // Check if any values actually changed
      const hasChanges =
        primaryGoal !== (profile?.primary_goal || '') ||
        sessionLength !== (profile?.preferred_session_length || 60);

      if (hasChanges) {
        await onUpdate(updates);

        if (
          sessionLength !== profile.preferred_session_length &&
          profile.active_t_path_id &&
          onRegenerateTPath
        ) {
          await onRegenerateTPath(sessionLength);
        }

        setRollingStatus(strings.workout_preferences.status_updated);
        setTimeout(() => setRollingStatus(null), 2500);
      }

      setHasError(false);
      setIsEditing(false);
    } catch (error) {
      console.error('[WorkoutPreferencesCard] Save error:', error);
      setRollingStatus(strings.workout_preferences.status_error);
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getGoalLabel = (value: string) => {
    const option = PRIMARY_GOAL_OPTIONS.find(g => g.value === value);
    return option ? option.label : '';
  };

  const getSessionLabel = (value: number) => {
    const option = SESSION_LENGTH_OPTIONS.find(s => {
      return Number(s.value) === Number(value);
    });
    return option ? option.label : '';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="barbell" size={20} color={Colors.foreground} />
          <Text style={styles.title}>{strings.workout_preferences.title}</Text>
        </View>
        <View style={styles.headerActions}>
          {rollingStatus && (
            <Text style={[
              styles.rollingStatus,
              hasError && styles.rollingStatusError
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
                  color={isEditing ? Colors.blue600 : Colors.foreground}
                />
                {isEditing && (
                  <Text style={styles.actionButtonText}>
                    {strings.workout_preferences.save}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>{strings.workout_preferences.primary_goal_label}</Text>
          {isEditing ? (
            <View style={styles.selectContainer}>
              {PRIMARY_GOAL_OPTIONS.map(goal => (
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

        <View style={styles.field}>
          <Text style={styles.label}>{strings.workout_preferences.session_length_label}</Text>
          {isEditing ? (
            <View style={styles.selectContainer}>
              {SESSION_LENGTH_OPTIONS.map(session => (
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
            <Text style={styles.value}>
              {sessionLength ? getSessionLabel(sessionLength) : 'Not set'}
            </Text>
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
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 20,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
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
  actionButtonTextBlack: {
    color: Colors.foreground,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  value: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '400',
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  selectOptionTextActive: {
    fontWeight: '600',
    color: Colors.blue600,
    fontFamily: 'Poppins_600SemiBold',
  },
});
