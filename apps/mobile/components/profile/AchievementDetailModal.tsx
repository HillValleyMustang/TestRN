import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface AchievementDetailModalProps {
  visible: boolean;
  onClose: () => void;
  achievement: {
    id: string;
    name: string;
    icon: string;
    description: string;
    progress: number;
    total: number;
    unlocked: boolean;
  } | null;
}

export function AchievementDetailModal({
  visible,
  onClose,
  achievement,
}: AchievementDetailModalProps) {
  if (!achievement) return null;

  const progressPercentage = (achievement.progress / achievement.total) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={Colors.gray700} />
          </TouchableOpacity>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Text style={styles.emoji}>{achievement.icon}</Text>
            
            <Text style={styles.title}>{achievement.name}</Text>
            <Text style={styles.description}>{achievement.description}</Text>

            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Your Progress:</Text>
              <Text style={styles.progressValue}>
                {achievement.total > 1 
                  ? `${achievement.progress} / ${achievement.total}`
                  : achievement.unlocked 
                    ? 'Completed'
                    : 'Not completed'}
              </Text>
              
              {achievement.total > 1 && (
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} 
                  />
                </View>
              )}

              <Text style={styles.encouragement}>
                {achievement.unlocked
                  ? 'Congratulations! You\'ve unlocked this achievement!'
                  : 'This achievement is not yet unlocked. Keep working towards your goals!'}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
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
  modal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  progressSection: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  progressLabel: {
    ...TextStyles.bodySmall,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  progressValue: {
    ...TextStyles.h3,
    color: Colors.foreground,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  encouragement: {
    ...TextStyles.bodySmall,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.foreground,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
  },
  buttonText: {
    ...TextStyles.button,
    color: Colors.background,
    textAlign: 'center',
  },
});
