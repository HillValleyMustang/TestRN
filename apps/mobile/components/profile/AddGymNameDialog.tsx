/**
 * Add Gym - Step 1: Name Input
 * Simple dialog for entering gym name
 * Reference: profile s7 design
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../app/_contexts/auth-context';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { useSettingsStrings } from '../../localization/useSettingsStrings';

interface AddGymNameDialogProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (gymId: string, gymName: string) => void;
  existingGymCount: number;
}

export const AddGymNameDialog: React.FC<AddGymNameDialogProps> = ({
  visible,
  onClose,
  onContinue,
  existingGymCount,
}) => {
  const { userId, supabase } = useAuth();
  const strings = useSettingsStrings();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setIsCreating(false);
    }
  }, [visible]);

  const handleSaveAndContinue = async () => {
    if (!userId || !name.trim()) return;
    
    if (existingGymCount >= 3) {
      alert('You can have a maximum of 3 gyms');
      return;
    }

    setIsCreating(true);
    try {
      const { data: newGym, error } = await supabase
        .from('gyms')
        .insert({
          name: name.trim(),
          user_id: userId,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Move to Step 2 (Setup Options)
      onContinue(newGym.id, newGym.name);
    } catch (error) {
      console.error('[AddGymNameDialog] Error creating gym:', error);
      alert('Failed to create gym. Please try again.');
    } finally {
      setIsCreating(false);
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
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            disabled={isCreating}
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
            style={styles.input}
            placeholder="e.g., Home Gym, Fitness First"
            placeholderTextColor={Colors.mutedForeground}
            value={name}
            onChangeText={setName}
            editable={!isCreating}
            autoFocus
          />

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (!name.trim() || isCreating) && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveAndContinue}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Continue</Text>
              )}
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  saveButton: {
    backgroundColor: Colors.gray900,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
