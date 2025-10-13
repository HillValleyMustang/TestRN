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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface PersonalInfoCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
}

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'
];

export function PersonalInfoCard({ profile, onUpdate }: PersonalInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);

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
      setDisplayName(profile.display_name || '');
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
        display_name: displayName,
        height_cm: height ? parseInt(height) : null,
        weight_kg: weight ? parseInt(weight) : null,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        preferred_muscles: preferredMuscles.join(', '),
        health_notes: healthNotes,
      };

      await onUpdate(updates);
      setRollingStatus('Updated!');
      setIsEditing(false);
      
      // Clear status after 2.5s
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[PersonalInfoCard] Save error:', error);
      setRollingStatus('Error!');
      setTimeout(() => setRollingStatus(null), 2500);
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
          <Text style={styles.title}>Personal Info</Text>
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
        {/* Preferred Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Preferred Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.mutedForeground}
            />
          ) : (
            <Text style={styles.value}>{displayName || 'Not set'}</Text>
          )}
        </View>

        {/* Height & Weight Row */}
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Height (cm)</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={Colors.mutedForeground}
              />
            ) : (
              <Text style={styles.value}>{height || '—'}</Text>
            )}
          </View>

          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Weight (kg)</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={Colors.mutedForeground}
              />
            ) : (
              <Text style={styles.value}>{weight || '—'}</Text>
            )}
          </View>
        </View>

        {/* Body Fat % */}
        <View style={styles.field}>
          <Text style={styles.label}>Body Fat (%)</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="Optional"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.mutedForeground}
            />
          ) : (
            <Text style={styles.value}>{bodyFat || '—'}</Text>
          )}
        </View>

        {/* Preferred Muscles */}
        <View style={styles.field}>
          <Text style={styles.label}>Preferred Muscles to Train (Optional)</Text>
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
              <Text style={styles.helperText}>
                Select muscle groups you'd like the AI Coach to prioritise in your recommendations.
              </Text>
            </>
          ) : (
            <Text style={styles.value}>
              {preferredMuscles.length > 0 ? preferredMuscles.join(', ') : '—'}
            </Text>
          )}
        </View>

        {/* Health Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Health Notes / Constraints (Optional)</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={healthNotes}
                onChangeText={setHealthNotes}
                placeholder="Any injuries, health conditions, or limitations..."
                placeholderTextColor={Colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                Share any relevant health information or limitations for the AI Coach to consider when generating advice.
              </Text>
            </>
          ) : (
            <Text style={styles.value}>{healthNotes || '—'}</Text>
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.foreground,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipSelected: {
    backgroundColor: Colors.blue500,
    borderColor: Colors.blue500,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.foreground,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  helperText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 4,
  },
});
