/**
 * Delete Gym Dialog
 * Confirmation dialog for deleting a gym with cascade deletion
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface DeleteGymDialogProps {
  visible: boolean;
  gymId: string;
  gymName: string;
  isActiveGym: boolean;
  isLastGym: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  supabase: any;
}

export function DeleteGymDialog({
  visible,
  gymId,
  gymName,
  isActiveGym,
  isLastGym,
  onClose,
  onDelete,
  supabase,
}: DeleteGymDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isLastGym) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one gym. Please add another gym before deleting this one.'
      );
      return;
    }

    setIsDeleting(true);
    try {
      // Delete gym_exercises first (foreign key constraint)
      await supabase.from('gym_exercises').delete().eq('gym_id', gymId);

      // Delete gym_equipment
      await supabase.from('gym_equipment').delete().eq('gym_id', gymId);

      // Delete the gym
      const { error } = await supabase.from('gyms').delete().eq('id', gymId);

      if (error) throw error;

      await onDelete();
      onClose();
    } catch (error) {
      console.error('[DeleteGymDialog] Error deleting gym:', error);
      Alert.alert('Error', 'Failed to delete gym. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={48} color={Colors.red500} />
          </View>

          <Text style={styles.title}>Delete Gym?</Text>
          <Text style={styles.message}>
            Are you sure you want to delete "{gymName}"? This will permanently remove all equipment and exercise mappings for this gym.
          </Text>

          {isActiveGym && (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.yellow600} />
              <Text style={styles.warningText}>
                This is your active gym. Another gym will be set as active.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.yellow50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.yellow700,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.gray100,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray900,
  },
  deleteButton: {
    backgroundColor: Colors.red500,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
