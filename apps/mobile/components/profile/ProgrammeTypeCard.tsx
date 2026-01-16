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
import { useSettingsStrings } from '../../localization/useSettingsStrings';

interface ProgrammeTypeCardProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
  onRegenerateTPath?: (newProgrammeType: 'ppl' | 'ulul') => Promise<void>;
}

export function ProgrammeTypeCard({
  profile,
  onUpdate,
  onRegenerateTPath
}: ProgrammeTypeCardProps) {
  const strings = useSettingsStrings();
  const PROGRAMME_TYPE_OPTIONS = strings.programme_type.options;



  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [rollingStatus, setRollingStatus] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const [programmeType, setProgrammeType] = useState('');

  useEffect(() => {
    if (profile) {
      console.log('[ProgrammeTypeCard] Profile programme_type from DB:', profile.programme_type);
      setProgrammeType(profile.programme_type || 'ppl');
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    // If value didn't change, just exit edit mode
    const currentType = profile.programme_type;
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
      console.log('[ProgrammeTypeCard] Changing programme type to:', programmeType);
      
      const updates = {
        programme_type: programmeType,
      };

      await onUpdate(updates);

      if (profile.active_t_path_id && onRegenerateTPath) {
        console.log('[ProgrammeTypeCard] Calling onRegenerateTPath with new type:', programmeType);
        await onRegenerateTPath(programmeType as 'ppl' | 'ulul');
      }

      setRollingStatus(strings.programme_type.status_updated);
      setHasError(false);
      setIsEditing(false);
      setTimeout(() => setRollingStatus(null), 2500);
    } catch (error) {
      console.error('[ProgrammeTypeCard] Save error:', error);
      setRollingStatus(strings.programme_type.status_error);
      setHasError(true);
      setTimeout(() => {
        setRollingStatus(null);
        setHasError(false);
      }, 2500);
    } finally {
      setIsSaving(false);
      setShowLoading(false);
    }
  };


  const getProgrammeLabel = (value: string) => {
    const option = PROGRAMME_TYPE_OPTIONS.find(p => p.value === value);
    return option ? option.label : '';
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="calendar" size={20} color={Colors.foreground} />
            <Text style={styles.title}>{strings.programme_type.title}</Text>
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
                      {strings.programme_type.save}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.field}>
            <Text style={styles.label}>{strings.programme_type.label}</Text>
            {isEditing ? (
              <>
                <View style={styles.selectContainer}>
                  {PROGRAMME_TYPE_OPTIONS.map(programme => (
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
                  {strings.programme_type.info}
                </Text>
              </>
            ) : (
              <Text style={styles.value}>{getProgrammeLabel(programmeType)}</Text>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={showConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>{strings.programme_type.confirm_title}</Text>
            <Text style={styles.dialogDescription}>
              {strings.programme_type.confirm_desc}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.cancelButtonText}>{strings.programme_type.confirm_cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmChange}
              >
                <Text style={styles.confirmButtonText}>{strings.programme_type.confirm_confirm}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLoading}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.blue600} />
            <Text style={styles.loadingTitle}>{strings.programme_type.overlay_title}</Text>
            <Text style={styles.loadingDescription}>
              {strings.programme_type.overlay_desc}
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
  infoText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
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
