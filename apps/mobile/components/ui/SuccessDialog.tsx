/**
 * SuccessDialog Component
 * Styled success message dialog
 * Matches the design of other confirmation dialogs
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface SuccessDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export function SuccessDialog({
  visible,
  title = 'Success',
  message,
  onClose,
}: SuccessDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
          </View>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <TouchableOpacity 
            style={styles.okButton}
            onPress={onClose}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  dialogTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  dialogMessage: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    lineHeight: 20,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  okButton: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  okButtonText: {
    ...TextStyles.buttonSmall,
    color: Colors.white,
  },
});
