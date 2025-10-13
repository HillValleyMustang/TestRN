/**
 * Rename Gym Dialog
 * Modal for renaming an existing gym
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';

interface RenameGymDialogProps {
  visible: boolean;
  gymId: string;
  currentName: string;
  onClose: () => void;
  onRename: () => Promise<void>;
  supabase: any;
}

export function RenameGymDialog({
  visible,
  gymId,
  currentName,
  onClose,
  onRename,
  supabase,
}: RenameGymDialogProps) {
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (visible) {
      setNewName(currentName);
    }
  }, [visible, currentName]);

  const handleRename = async () => {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Gym name is required');
      return;
    }

    if (trimmedName === currentName) {
      onClose();
      return;
    }

    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({ name: trimmedName })
        .eq('id', gymId);

      if (error) throw error;

      await onRename();
      onClose();
    } catch (error) {
      console.error('[RenameGymDialog] Error renaming gym:', error);
      Alert.alert('Error', 'Failed to rename gym. Please try again.');
    } finally {
      setIsRenaming(false);
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
          <View style={styles.header}>
            <Text style={styles.title}>Rename Gym</Text>
            <TouchableOpacity onPress={onClose} disabled={isRenaming}>
              <Ionicons name="close" size={24} color={Colors.gray600} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Gym Name</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter gym name"
            placeholderTextColor={Colors.gray400}
            autoFocus
            maxLength={50}
            editable={!isRenaming}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isRenaming}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleRename}
              disabled={isRenaming}
            >
              {isRenaming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
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
  saveButton: {
    backgroundColor: Colors.blue600,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
