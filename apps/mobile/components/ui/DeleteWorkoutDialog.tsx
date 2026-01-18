/**
 * DeleteWorkoutDialog Component
 * Styled confirmation dialog for deleting workout sessions
 * Matches the design of other confirmation dialogs (e.g., T-path confirmation)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface DeleteWorkoutDialogProps {
  visible: boolean;
  workoutName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteWorkoutDialog({
  visible,
  workoutName,
  onConfirm,
  onCancel,
}: DeleteWorkoutDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>Delete Workout Session</Text>
          <Text style={styles.dialogDescription}>
            Are you sure you want to delete "{workoutName}"? This action cannot be undone.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  dialogDescription: {
    ...TextStyles.bodySmall,
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
    ...TextStyles.buttonSmall,
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
    ...TextStyles.buttonSmall,
    color: Colors.white,
  },
});
