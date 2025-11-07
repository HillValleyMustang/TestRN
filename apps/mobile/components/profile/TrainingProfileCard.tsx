/**
 * Training Profile Card - Settings Tab
 * Collects experience level for AI recommendations (frequency calculated from actual usage)
 * Reference: Enhanced AI Recommendations System
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
import { TextStyles } from '../../constants/Typography';

interface TrainingProfileCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
}

export function TrainingProfileCard({
  profile,
  onUpdate
}: TrainingProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  useEffect(() => {
    if (profile) {
      // Derive experience level from programme_type
      const derivedExperience = deriveExperienceLevel(profile.programme_type);
      setExperienceLevel(derivedExperience);
    }
  }, [profile, isEditing]);

  const deriveExperienceLevel = (programmeType: string | null): 'beginner' | 'intermediate' | 'advanced' => {
    if (!programmeType) return 'beginner';
    if (programmeType.includes('ulul')) return 'intermediate'; // Upper/Lower suggests more experience
    if (programmeType.includes('ppl')) return 'advanced'; // Push/Pull/Legs suggests advanced
    return 'beginner';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        // For now, we'll store in programme_type until we add explicit fields
        // This is a temporary solution - we'll add proper fields later
        programme_type: getProgrammeTypeFromExperience(experienceLevel),
        // TODO: Add these fields to profiles table:
        // experience_level: experienceLevel,
      };

      const hasChanges = deriveExperienceLevel(profile?.programme_type) !== experienceLevel;

      if (hasChanges) {
        await onUpdate(updates);
        setRollingStatus('Training profile updated!');
        setTimeout(() => setRollingStatus(null), 2500);
      }

      setHasError(false);
      setIsEditing(false);
    } catch (error) {
      console.error('[TrainingProfileCard] Save error:', error);
      setRollingStatus('Error updating profile');
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const getProgrammeTypeFromExperience = (exp: 'beginner' | 'intermediate' | 'advanced'): string => {
    // Map experience level to programme type
    if (exp === 'advanced') return 'ppl'; // Advanced users typically do PPL
    if (exp === 'intermediate') return 'ulul'; // Intermediate users typically do ULUL
    return 'default'; // Beginner default
  };

  const EXPERIENCE_OPTIONS = [
    {
      value: 'beginner' as const,
      label: 'Beginner',
      description: 'New to weight training or returning after a break',
      icon: 'leaf'
    },
    {
      value: 'intermediate' as const,
      label: 'Intermediate',
      description: '6+ months consistent training, know basic exercises',
      icon: 'fitness'
    },
    {
      value: 'advanced' as const,
      label: 'Advanced',
      description: '2+ years training, advanced techniques and programming',
      icon: 'trophy'
    }
  ];


  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="school" size={20} color={Colors.foreground} />
          <Text style={styles.title}>Training Profile</Text>
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
                    Save
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Help our AI provide personalised progression recommendations by sharing your training background. Your programme type (ULUL/PPL) gives you flexibility in weekly workout frequency.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Experience Level</Text>
          {isEditing ? (
            <View style={styles.selectContainer}>
              {EXPERIENCE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.selectOption,
                    experienceLevel === option.value && styles.selectOptionActive
                  ]}
                  onPress={() => setExperienceLevel(option.value)}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={experienceLevel === option.value ? Colors.white : Colors.foreground}
                    />
                    <Text style={[
                      styles.selectOptionText,
                      experienceLevel === option.value && styles.selectOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  <Text style={[
                    styles.optionDescription,
                    experienceLevel === option.value && styles.optionDescriptionActive
                  ]}>
                    {option.description}
                  </Text>
                  {experienceLevel === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.valueContainer}>
              <View style={styles.valueRow}>
                <Ionicons
                  name={EXPERIENCE_OPTIONS.find(opt => opt.value === experienceLevel)?.icon as any}
                  size={20}
                  color={Colors.foreground}
                />
                <Text style={styles.value}>
                  {EXPERIENCE_OPTIONS.find(opt => opt.value === experienceLevel)?.label}
                </Text>
              </View>
              <Text style={styles.valueDescription}>
                {EXPERIENCE_OPTIONS.find(opt => opt.value === experienceLevel)?.description}
              </Text>
            </View>
          )}
        </View>


        {!isEditing && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.blue600} />
            <Text style={styles.infoText}>
              These settings help our AI provide personalised weight progression recommendations.
              Beginners get gentler increases, while advanced users get more challenging progressions.
              Training frequency is calculated automatically from your actual workout history.
            </Text>
          </View>
        )}
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  description: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    lineHeight: 20,
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
  selectContainer: {
    gap: Spacing.sm,
  },
  selectOption: {
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
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  selectOptionText: {
    fontSize: 16,
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    fontWeight: '600',
    color: Colors.blue600,
    fontFamily: 'Poppins_600SemiBold',
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  optionDescriptionActive: {
    color: Colors.blue600,
  },
  valueContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  valueDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  frequencyContainer: {
    gap: Spacing.sm,
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  frequencyOptionActive: {
    borderColor: Colors.blue600,
    backgroundColor: Colors.blue50,
  },
  frequencyOptionText: {
    fontSize: 16,
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '500',
  },
  frequencyOptionTextActive: {
    fontWeight: '600',
    color: Colors.blue600,
    fontFamily: 'Poppins_600SemiBold',
  },
  frequencyDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.blue50,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.blue200,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.blue800,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
});