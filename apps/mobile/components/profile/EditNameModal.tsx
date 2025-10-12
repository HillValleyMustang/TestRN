import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { supabase } from '../../app/_lib/supabase';

interface EditNameModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  userId: string;
  onSuccess: (newName: string) => void;
}

export function EditNameModal({
  visible,
  onClose,
  currentName,
  userId,
  onSuccess,
}: EditNameModalProps) {
  const [displayName, setDisplayName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setDisplayName(currentName || '');
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    if (displayName.trim() === currentName) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', userId);

      if (error) throw error;

      onSuccess(displayName.trim());
      onClose();
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Display Name</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              autoFocus
              maxLength={50}
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  label: {
    ...TextStyles.bodyBold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  input: {
    ...TextStyles.body,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    color: Colors.gray900,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    alignItems: 'center',
  },
  cancelText: {
    ...TextStyles.bodyBold,
    color: Colors.gray700,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.blue600,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    ...TextStyles.bodyBold,
    color: Colors.white,
  },
});
