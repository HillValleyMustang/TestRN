import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface RegenerationErrorModalProps {
  visible: boolean;
  errorMessage: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function RegenerationErrorModal({
  visible,
  errorMessage,
  onRetry,
  onCancel,
}: RegenerationErrorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.destructive} />
          </View>
          
          <Text style={styles.title}>Workout Regeneration Failed</Text>
          
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{errorMessage}</Text>
          </View>
          
          <Text style={styles.subtitle}>
            Your session length has been restored to its previous value. Would you like to try again?
          </Text>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Ionicons name="refresh" size={18} color={Colors.white} style={styles.retryIcon} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: Math.min(width - Spacing.xl * 2, 400),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: 'Poppins_700Bold',
  },
  messageContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  message: {
    fontSize: 14,
    color: Colors.destructive,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.blue600,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryIcon: {
    marginRight: 6,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
});