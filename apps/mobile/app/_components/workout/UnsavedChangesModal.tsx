import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Button } from '../ui/Button';
import {
  Colors,
  Spacing,
  BorderRadius,
} from '../../../constants/design-system';
import { useWorkoutFlow } from '../../_contexts/workout-flow-context';

export const UnsavedChangesModal = () => {
  const { showUnsavedChangesDialog, confirmLeave, cancelLeave } =
    useWorkoutFlow();

  return (
    <Modal
      visible={showUnsavedChangesDialog}
      animationType="fade"
      transparent
      onRequestClose={cancelLeave}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Discard changes?</Text>
          <Text style={styles.subtitle}>
            You have unsaved progress in your current workout. Leaving now will
            discard those changes.
          </Text>
          <View style={styles.actions}>
            <Button
              variant="outline"
              onPress={cancelLeave}
              style={styles.actionButton}
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              onPress={confirmLeave}
              style={styles.actionButton}
            >
              Discard
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UnsavedChangesModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  container: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    width: '100%',
  },
  title: {
    color: Colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.gray400,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
