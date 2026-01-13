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
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTouchable} onPress={onClose} />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>How Your Next Workout is Calculated</Text>
              <HapticPressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </HapticPressable>
            </View>

            <ScrollView
              style={styles.contentScroll}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.contentContainer}
              bounces={true}
              alwaysBounceVertical={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.description}>
                Your next workout is intelligently selected based on your recent training history, weekly completion goals, and program structure.
              </Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Weekly Completion Priority</Text>
                <Text style={styles.sectionDescription}>
                  Your workout recommendations now prioritise completing your weekly target before cycling back to the beginning of your program.
                </Text>

                <View style={styles.highlightBox}>
                  <Ionicons name="bulb" size={20} color={Colors.primary} style={styles.highlightIcon} />
                  <Text style={styles.highlightText}>
                    <Text style={styles.highlightBold}>Example:</Text> If you've completed Push and Legs this week, Pull will be recommended next to complete your PPL cycle, rather than cycling back to Push.
                  </Text>
                </View>

                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Weekly Target Awareness:</Text> Tracks your progress toward completing all workouts in your program this week
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Smart Prioritisation:</Text> Suggests missing workouts to help you complete your weekly goals
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Visual Indicators:</Text> Shows a "Complete week" badge when recommending workouts for weekly completion
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.featureIcon} />
                    <Text style={styles.featureText}>
                      <Text style={styles.featureBold}>Flexible Fallback:</Text> Returns to normal cycling once your weekly target is complete
                    </Text>
                  </View>
                </View>
              </View>

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
                      <Text style={styles.featureBold}>Program Adherence:</Text> Keeps you on track with your chosen training split and weekly goals
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
                  This intelligent selection ensures optimal recovery, progressive overload, and adherence to proven training methodologies. With weekly completion awareness, your next workout is now chosen to help you meet your training goals while maximising results and preventing overtraining.
                </Text>

                <View style={styles.highlightBox}>
                  <Ionicons name="fitness" size={20} color={Colors.success} style={styles.highlightIcon} />
                  <Text style={styles.highlightText}>
                    <Text style={styles.highlightBold}>Your Coach:</Text> The app now acts as your intelligent training coach, prioritizing weekly completion to keep you consistent and progressing toward your fitness goals.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
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
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    minHeight: 500,
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
    paddingBottom: Spacing.xl,
    flexGrow: 1,
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
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
  },
  highlightIcon: {
    marginTop: 2,
  },
  highlightText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    lineHeight: 20,
    flex: 1,
  },
  highlightBold: {
    fontWeight: '600',
    color: Colors.primary,
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