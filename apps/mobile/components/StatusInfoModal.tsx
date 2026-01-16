import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/Theme';
import { FontFamily } from '../constants/Typography';
import { STATUS_CONFIG } from '../hooks/useRollingStatus';
import { HapticPressable } from './HapticPressable';

interface StatusInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StatusInfoModal({ visible, onClose }: StatusInfoModalProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const statuses = ['Getting into it', 'Building Momentum', 'In the Zone', 'On Fire'] as const;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="information-circle" size={24} color={Colors.primary} />
              <Text style={styles.title}>Workout Status Explained</Text>
            </View>
            <HapticPressable
              style={styles.closeIcon}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </HapticPressable>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <Text style={styles.description}>
              Your status reflects your workout consistency over time. Keep training to level up!
            </Text>

            {/* Consistency Statuses */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consistency Levels</Text>
              <HapticPressable
                onPress={() => setShowTechnicalDetails(true)}
                style={styles.infoIcon}
              >
                <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              </HapticPressable>
            </View>
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
        </View>
      </View>

      {/* Technical Details Modal */}
      <Modal
        visible={showTechnicalDetails}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTechnicalDetails(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowTechnicalDetails(false)}>
          <View style={styles.technicalModalContainer}>
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.technicalModalContent}>
              <View style={styles.technicalHeader}>
                <Text style={styles.technicalTitle}>How Status is Calculated</Text>
                <HapticPressable onPress={() => setShowTechnicalDetails(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.foreground} />
                </HapticPressable>
              </View>

              <ScrollView style={styles.technicalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.calculationList}>
                  <View style={styles.calculationItem}>
                    <View style={[styles.calculationIconContainer, { backgroundColor: STATUS_CONFIG['Getting into it'].backgroundColor }]}>
                      <Ionicons name={STATUS_CONFIG['Getting into it'].icon} size={18} color={STATUS_CONFIG['Getting into it'].color} />
                    </View>
                    <View style={styles.calculationTextContainer}>
                      <Text style={styles.calculationStatus}>"Getting into it"</Text>
                      <Text style={styles.calculationDescription}>No workouts in last 7 days, or no consecutive periods</Text>
                    </View>
                  </View>

                  <View style={styles.calculationItem}>
                    <View style={[styles.calculationIconContainer, { backgroundColor: STATUS_CONFIG['Building Momentum'].backgroundColor }]}>
                      <Ionicons name={STATUS_CONFIG['Building Momentum'].icon} size={18} color={STATUS_CONFIG['Building Momentum'].color} />
                    </View>
                    <View style={styles.calculationTextContainer}>
                      <Text style={styles.calculationStatus}>"Building Momentum"</Text>
                      <Text style={styles.calculationDescription}>1-3 consecutive 7-day periods with workouts</Text>
                    </View>
                  </View>

                  <View style={styles.calculationItem}>
                    <View style={[styles.calculationIconContainer, { backgroundColor: STATUS_CONFIG['In the Zone'].backgroundColor }]}>
                      <Ionicons name={STATUS_CONFIG['In the Zone'].icon} size={18} color={STATUS_CONFIG['In the Zone'].color} />
                    </View>
                    <View style={styles.calculationTextContainer}>
                      <Text style={styles.calculationStatus}>"In the Zone"</Text>
                      <Text style={styles.calculationDescription}>4-7 consecutive 7-day periods with workouts</Text>
                    </View>
                  </View>

                  <View style={styles.calculationItem}>
                    <View style={[styles.calculationIconContainer, { backgroundColor: STATUS_CONFIG['On Fire'].backgroundColor }]}>
                      <Ionicons name={STATUS_CONFIG['On Fire'].icon} size={18} color={STATUS_CONFIG['On Fire'].color} />
                    </View>
                    <View style={styles.calculationTextContainer}>
                      <Text style={styles.calculationStatus}>"On Fire"</Text>
                      <Text style={styles.calculationDescription}>8+ consecutive 7-day periods with workouts</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    height: '95%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeIcon: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Spacing.sm,
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
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  statusDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  infoIcon: {
    padding: Spacing.xs / 2,
  },
  technicalModalContainer: {
    width: '90%',
    maxWidth: 400,
    height: '60%',
  },
  technicalModalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flex: 1,
  },
  technicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  technicalTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
  },
  technicalContent: {
    flex: 1,
  },
  calculationList: {
    gap: Spacing.md,
  },
  calculationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  calculationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculationTextContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  calculationStatus: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  calculationDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
  },
});
