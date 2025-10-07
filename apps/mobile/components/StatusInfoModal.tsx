import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { STATUS_CONFIG } from '../hooks/useRollingStatus';

interface StatusInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StatusInfoModal({ visible, onClose }: StatusInfoModalProps) {
  const statuses = ['Getting into it', 'Building Momentum', 'In the Zone', 'On Fire'] as const;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Workout Status Explained</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Your status reflects your workout consistency over time. Keep training to level up!
          </Text>

          <ScrollView style={styles.statusList} showsVerticalScrollIndicator={false}>
            {statuses.map((status) => {
              const config = STATUS_CONFIG[status];
              return (
                <View key={status} style={styles.statusItem}>
                  <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor }]}>
                    <Ionicons name={config.icon} size={20} color={config.color} />
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={styles.statusTitle}>{status}</Text>
                    <Text style={styles.statusDescription}>{config.description}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
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
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  statusList: {
    gap: Spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  statusDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
});
