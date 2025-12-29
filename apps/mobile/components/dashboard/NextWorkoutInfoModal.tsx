import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { HapticPressable } from '../HapticPressable';

interface NextWorkoutInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NextWorkoutInfoModal({ visible, onClose }: NextWorkoutInfoModalProps) {
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
              <Text style={styles.title}>How Your Next Workout is Calculated</Text>
              <HapticPressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </HapticPressable>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={true} contentContainerStyle={styles.contentContainer}>
              <Text style={styles.description}>
                Your next workout is intelligently selected based on your recent training history and program structure.
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PPL Split Logic</Text>
                <Text style={styles.sectionDescription}>
                  For Push/Pull/Legs programs, workouts follow this progression:
                </Text>

                <View style={styles.progressionContainer}>
                  <View style={styles.progressionStep}>
                    <View style={[styles.stepIcon, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="arrow-up" size={16} color="white" />
                    </View>
                    <Text style={styles.stepText}>Push</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={Colors.mutedForeground} />

                  <View style={styles.progressionStep}>
                    <View style={[styles.stepIcon, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="arrow-down" size={16} color="white" />
                    </View>
                    <Text style={styles.stepText}>Pull</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={Colors.mutedForeground} />

                  <View style={styles.progressionStep}>
                    <View style={[styles.stepIcon, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="walk" size={16} color="white" />
                    </View>
                    <Text style={styles.stepText}>Legs</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={Colors.mutedForeground} />

                  <View style={styles.progressionStep}>
                    <View style={[styles.stepIcon, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="arrow-up" size={16} color="white" />
                    </View>
                    <Text style={styles.stepText}>Push</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Smart Progression</Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Duplicate Detection:</Text> If you've done the same workout type recently, it automatically advances to the next one
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Recovery Balance:</Text> Ensures proper muscle group recovery by spacing similar workouts
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Program Adherence:</Text> Keeps you on track with your chosen training split
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upper/Lower Split</Text>
                <Text style={styles.sectionDescription}>
                  For Upper/Lower programs, workouts alternate between:
                </Text>

                <View style={styles.splitContainer}>
                  <View style={styles.splitItem}>
                    <View style={[styles.splitIcon, { backgroundColor: '#1e3a8a' }]}>
                      <Ionicons name="arrow-up" size={16} color="white" />
                    </View>
                    <Text style={styles.splitText}>Upper Body A</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={Colors.mutedForeground} />

                  <View style={styles.splitItem}>
                    <View style={[styles.splitIcon, { backgroundColor: '#0891b2' }]}>
                      <Ionicons name="arrow-down" size={16} color="white" />
                    </View>
                    <Text style={styles.splitText}>Lower Body A</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={Colors.mutedForeground} />

                  <View style={styles.splitItem}>
                    <View style={[styles.splitIcon, { backgroundColor: '#EF4444' }]}>
                      <Ionicons name="arrow-up" size={16} color="white" />
                    </View>
                    <Text style={styles.splitText}>Upper Body B</Text>
                  </View>

                  <Ionicons name="arrow-forward" size={16} color={Colors.mutedForeground} />

                  <View style={styles.splitItem}>
                    <View style={[styles.splitIcon, { backgroundColor: '#6b21a8' }]}>
                      <Ionicons name="arrow-down" size={16} color="white" />
                    </View>
                    <Text style={styles.splitText}>Lower Body B</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why This Matters</Text>
                <Text style={styles.sectionDescription}>
                  This intelligent selection ensures optimal recovery, progressive overload, and adherence to proven training methodologies. Your next workout is always chosen to maximize results while preventing overtraining.
                </Text>
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
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    minHeight: 400,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flex: 1,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
    flex: 1,
    marginRight: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.lg,
  },
  description: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  progressionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
  },
  progressionStep: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  featureList: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
    flex: 1,
  },
  featureBold: {
    fontWeight: '600',
    color: Colors.foreground,
  },
  splitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
  },
  splitItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  splitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
});