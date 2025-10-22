/**
 * Personal Info Card - Settings Tab
 * Edit personal information including name, body metrics, preferred muscles, and health notes
 * Reference: Profile_Settings_v1 playbook
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';

interface PersonalInfoCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
}

export function PersonalInfoCard({ profile, onUpdate }: PersonalInfoCardProps) {
  const strings = useSettingsStrings();
  const MUSCLE_GROUPS = strings.personal_info.muscle_groups;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [preferredMuscles, setPreferredMuscles] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState('');

  // Hydrate form when profile changes or when entering edit mode
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.full_name || '');
      setHeight(profile.height_cm?.toString() || '');
      setWeight(profile.weight_kg?.toString() || '');
      setBodyFat(profile.body_fat_pct?.toString() || '');

      // Parse preferred_muscles from comma-separated string
      const muscles = profile.preferred_muscles
        ? profile.preferred_muscles.split(',').map((m: string) => m.trim())
        : [];
      setPreferredMuscles(muscles);

      setHealthNotes(profile.health_notes || '');
    }
  }, [profile, isEditing]);

  const toggleMuscle = (muscle: string) => {
    setPreferredMuscles(prev =>
      prev.includes(muscle)
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        full_name: displayName,
        height_cm: height ? parseInt(height) : null,
        weight_kg: weight ? parseInt(weight) : null,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        preferred_muscles: preferredMuscles.join(', '),
        health_notes: healthNotes,
      };

      // Check if any values actually changed
      const hasChanges =
        displayName !== (profile?.full_name || '') ||
        height !== (profile?.height_cm?.toString() || '') ||
        weight !== (profile?.weight_kg?.toString() || '') ||
        bodyFat !== (profile?.body_fat_pct?.toString() || '') ||
        preferredMuscles.join(', ') !== (profile?.preferred_muscles || '') ||
        healthNotes !== (profile?.health_notes || '');

      if (hasChanges) {
        await onUpdate(updates);
        setRollingStatus(strings.personal_info.status_updated);
        setTimeout(() => setRollingStatus(null), 2500);
      }

      setHasError(false);
      setIsEditing(false);
    } catch (error) {
      console.error('[PersonalInfoCard] Save error:', error);
      setRollingStatus(strings.personal_info.status_error);
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="person" size={20} color={Colors.foreground} />
          <Text style={styles.title}>{strings.personal_info.title}</Text>
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
                    {strings.personal_info.save}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Preferred Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{strings.personal_info.preferred_name_label}</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={strings.personal_info.preferred_name_placeholder}
              placeholderTextColor={Colors.mutedForeground}
            />
          ) : (
            <Text style={styles.value}>{displayName}</Text>
          )}
        </View>

        {/* Height & Weight Row */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>{strings.personal_info.height_label}</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder={strings.personal_info.height_placeholder}
                keyboardType="numeric"
                placeholderTextColor={Colors.mutedForeground}
              />
            ) : (
              <Text style={styles.value}>{height}</Text>
            )}
          </View>

          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>{strings.personal_info.weight_label}</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder={strings.personal_info.weight_placeholder}
                keyboardType="numeric"
                placeholderTextColor={Colors.mutedForeground}
              />
            ) : (
              <Text style={styles.value}>{weight}</Text>
            )}
          </View>
        </View>

        {/* Body Fat % */}
        <View style={styles.field}>
          <Text style={styles.label}>{strings.personal_info.body_fat_label}</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder={strings.personal_info.body_fat_placeholder}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.mutedForeground}
            />
          ) : (
            <Text style={styles.value}>{bodyFat}</Text>
          )}
        </View>

        {/* Preferred Muscles */}
        <View style={styles.field}>
          <Text style={styles.label}>{strings.personal_info.preferred_muscles_label}</Text>
          {isEditing ? (
            <>
              <View style={styles.chipContainer}>
                {MUSCLE_GROUPS.map(muscle => (
                  <TouchableOpacity
                    key={muscle}
                    style={[
                      styles.chip,
                      preferredMuscles.includes(muscle) && styles.chipSelected
                    ]}
                    onPress={() => toggleMuscle(muscle)}
                  >
                    <Text style={[
                      styles.chipText,
                      preferredMuscles.includes(muscle) && styles.chipTextSelected
                    ]}>
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {strings.personal_info.preferred_muscles_desc && (
                <Text style={styles.helperText}>
                  {strings.personal_info.preferred_muscles_desc}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.value}>
              {preferredMuscles.length > 0 ? preferredMuscles.join(', ') : ''}
            </Text>
          )}
        </View>

        {/* Health Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>{strings.personal_info.health_notes_label}</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={healthNotes}
                onChangeText={setHealthNotes}
                placeholder={strings.personal_info.health_notes_placeholder}
                placeholderTextColor={Colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {strings.personal_info.health_notes_desc && (
                <Text style={styles.helperText}>
                  {strings.personal_info.health_notes_desc}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.value}>{healthNotes}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12, // playbook: card radius 12
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // playbook: H=20
    paddingVertical: Spacing.md,
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
    color: Colors.red600,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.blue600,
  },
  actionButtonTextBlack: {
    color: Colors.foreground,
  },
  content: {
    padding: 20, // playbook: H=20
  },
  field: {
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
    fontFamily: 'Poppins_600SemiBold',
  },
  value: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '400',
    fontFamily: 'Poppins_400Regular',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 16,
    color: Colors.foreground,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipSelected: {
    backgroundColor: Colors.blue600,
    borderColor: Colors.blue600,
  },
  chipText: {
    fontSize: 14,
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
  },
  chipTextSelected: {
    color: Colors.white,
    fontFamily: 'Poppins_400Regular',
  },
  helperText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.xs,
    fontFamily: 'Poppins_400Regular',
  },
});
