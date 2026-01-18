/**
 * Add Gym - Step 1: Name Input
 * Simple dialog for entering gym name
 * Reference: profile s7 design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';
import { TextStyles, FontFamily } from '../../constants/Typography';

interface AddGymNameDialogProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (gymName: string) => void;
  existingGymCount: number;
}

export const AddGymNameDialog: React.FC<AddGymNameDialogProps> = ({
  visible,
  onClose,
  onContinue,
  existingGymCount,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName('');
    }
  }, [visible]);

  const handleSaveAndContinue = () => {
    if (!name.trim()) return;
    
    if (existingGymCount >= 3) {
      alert('You can have a maximum of 3 gyms');
      return;
    }

    // Just pass the name - gym will be created when entering setup step
    onContinue(name.trim());
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
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Add New Gym</Text>
          <Text style={styles.description}>
            Give your new gym a name. You can have up to 3 gyms.
          </Text>

          {/* Name Input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="e.g., Home Gym, Fitness First"
            placeholderTextColor={Colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoFocus
            blurOnSubmit={false}
          />

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                !name.trim() && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveAndContinue}
              disabled={!name.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.mutedForeground,
    fontFamily: FontFamily.regular,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  description: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.regular,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: Colors.muted,
  },
  cancelButtonText: {
    ...TextStyles.button,
    color: Colors.foreground,
  },
  saveButton: {
    backgroundColor: Colors.gray900,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  saveButtonText: {
    ...TextStyles.button,
    color: '#fff',
  },
});
