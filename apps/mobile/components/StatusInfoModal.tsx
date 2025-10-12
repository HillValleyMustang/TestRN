import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { STATUS_CONFIG } from '../hooks/useRollingStatus';
import { HapticPressable } from './HapticPressable';

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
        <View style={styles.modalContainer}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Workout Status Explained</Text>
              <HapticPressable onPress={onClose} style={styles.closeButton} hapticStyle="light">
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </HapticPressable>
            </View>

            <Text style={styles.description}>
              Your status reflects your workout consistency over time. Keep training to level up!
            </Text>

            <ScrollView style={styles.statusList} showsVerticalScrollIndicator={true}>
            {/* Consistency Statuses */}
            <Text style={styles.sectionTitle}>Consistency Levels</Text>
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

            {/* Temporary Messages */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Temporary Messages</Text>
            <Text style={[styles.description, { marginTop: 0 }]}>
              This badge also shows temporary status messages and alerts:
            </Text>

            <View style={styles.statusItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="cloud-offline" size={20} color="#991B1B" />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>Offline</Text>
                <Text style={styles.statusDescription}>No internet connection. Your data will sync when you're back online.</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="sync" size={20} color="#1D4ED8" />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>Updating Plan...</Text>
                <Text style={styles.statusDescription}>AI is generating your personalized workout program.</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#22C55E' }]}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>Success Messages</Text>
                <Text style={styles.statusDescription}>Shows confirmations like "Exercise Added!" or "Workout Saved!"</Text>
              </View>
            </View>
          </ScrollView>
          </Pressable>
        </View>
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
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flex: 1,
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
    flex: 1,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
