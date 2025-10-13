/**
 * Programme Type Card - Settings Tab
 * Edit programme type with confirmation dialog and T-Path regeneration
 * Reference: Profile_Settings_v1 playbook
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface ProgrammeTypeCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
  onRegenerateTPath?: () => Promise<void>;
}

const PROGRAMME_TYPES = [
  { label: '4-Day Upper/Lower', value: 'ulul' },
  { label: '3-Day Push/Pull/Legs', value: 'ppl' },
];

export function ProgrammeTypeCard({ 
  profile, 
  onUpdate,
  onRegenerateTPath 
}: ProgrammeTypeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);

  const [programmeType, setProgrammeType] = useState('');

  useEffect(() => {
    if (profile) {
      setProgrammeType(profile.t_path_type || profile.programme_type || 'ppl');
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    // If value didn't change, just exit edit mode
    const currentType = profile.t_path_type || profile.programme_type;
    if (programmeType === currentType) {
      setIsEditing(false);
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmChange = async () => {
    setShowConfirmDialog(false);
    setShowLoading(true);
    setIsSaving(true);

    try {
      const updates = {
        t_path_type: programmeType,
        programme_type: programmeType,
      };

      await onUpdate(updates);

      // Regenerate T-Path if user has one
      if (profile.active_t_path_id && onRegenerateTPath) {
        await onRegenerateTPath();
      }

      setRollingStatus('Updated!');
      setIsEditing(false);
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[ProgrammeTypeCard] Save error:', error);
      setRollingStatus('Error!');
      setTimeout(() => setRollingStatus(null), 2500);
    } finally {
      setIsSaving(false);
      setShowLoading(false);
    }
  };

  const getProgrammeLabel = (value: string) => {
    return PROGRAMME_TYPES.find(p => p.value === value)?.label || 'Select your programme type';
  };

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="calendar" size={20} color={Colors.foreground} />
            <Text style={styles.title}>Programme Type</Text>
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
          <View style={styles.field}>
            <Text style={styles.label}>Programme Type</Text>
            {isEditing ? (
              <>
                <View style={styles.selectContainer}>
                  {PROGRAMME_TYPES.map(programme => (
                    <TouchableOpacity
                      key={programme.value}
                      style={[
                        styles.selectOption,
                        programmeType === programme.value && styles.selectOptionActive
                      ]}
                      onPress={() => setProgrammeType(programme.value)}
                    >
                      <Text style={[
                        styles.selectOptionText,
                        programmeType === programme.value && styles.selectOptionTextActive
                      ]}>
                        {programme.label}
                      </Text>
                      {programmeType === programme.value && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.blue600} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.infoText}>
                  Changing your programme type (or T-Path as we call it) will reset and regenerate all workout plans for all of your gyms to match the new structure.
                </Text>
              </>
            ) : (
              <Text style={styles.value}>{getProgrammeLabel(programmeType)}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Confirmation Dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Confirm Programme Change</Text>
            <Text style={styles.dialogDescription}>
              Are you sure you want to change your programme type? This action cannot be undone. It will permanently delete and regenerate the workout plans for ALL of your gyms to match the new structure.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmChange}
              >
                <Text style={styles.confirmButtonText}>Confirm & Reset All Plans</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      <Modal
        visible={showLoading}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.blue600} />
            <Text style={styles.loadingTitle}>Updating Programme</Text>
            <Text style={styles.loadingDescription}>
              Please wait while we regenerate all your workout plans...
            </Text>
          </View>
        </View>
      </Modal>
    </>
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
  infoText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialogContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  dialogDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  confirmButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.destructive,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  loadingContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: Spacing.md,
  },
  loadingDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
