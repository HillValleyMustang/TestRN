import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { FetchedExerciseDefinition } from '../../../../packages/data/src/types/exercise';

interface DeleteExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: FetchedExerciseDefinition | null;
  onConfirmDelete: (exercise: FetchedExerciseDefinition) => void;
  loading?: boolean;
}

export default function DeleteExerciseModal({
  visible,
  onClose,
  exercise,
  onConfirmDelete,
  loading = false,
}: DeleteExerciseModalProps) {
  if (!exercise) return null;

  const handleDelete = async () => {
    try {
      await onConfirmDelete(exercise);
      onClose(); // Close modal on success
    } catch (error) {
      // Error is handled in the hook, modal stays open
      console.error('Delete failed:', error);
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
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons name="trash" size={24} color="#ef4444" />
            <Text style={styles.title}>Delete Exercise</Text>
          </View>

          <Text style={styles.message}>
            Are you sure you want to delete "{exercise.name}"? This action cannot be undone.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton, loading && styles.deleteButtonDisabled]}
              onPress={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primaryForeground} size="small" />
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
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.foreground,
    marginLeft: Spacing.sm,
  },
  message: {
    ...TextStyles.body,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.muted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.primaryForeground,
  },
});