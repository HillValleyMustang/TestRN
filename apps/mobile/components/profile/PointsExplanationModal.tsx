import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

interface PointsExplanationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PointsExplanationModal({ visible, onClose }: PointsExplanationModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Fitness Points</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray700} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.description}>
              Earn fitness points by completing workouts and achieving milestones. Your total points determine your fitness level.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to Earn Points</Text>
              
              <View style={styles.pointItem}>
                <View style={[styles.badge, { backgroundColor: Colors.blue50 }]}>
                  <Ionicons name="fitness" size={20} color={Colors.blue600} />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>Complete workouts</Text>
                  <Text style={styles.pointValue}>+5 points each</Text>
                </View>
              </View>

              <View style={styles.pointItem}>
                <View style={[styles.badge, { backgroundColor: Colors.purple50 }]}>
                  <Ionicons name="trophy" size={20} color={Colors.purple600} />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>Set volume personal records</Text>
                  <Text style={styles.pointValue}>+2 points per set PB</Text>
                </View>
              </View>

              <View style={styles.pointItem}>
                <View style={[styles.badge, { backgroundColor: Colors.cyan50 }]}>
                  <Ionicons name="trending-up" size={20} color={Colors.cyan600} />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>Beat total workout volume</Text>
                  <Text style={styles.pointValue}>+5 points per session PB</Text>
                </View>
              </View>

              <View style={styles.pointItem}>
                <View style={[styles.badge, { backgroundColor: Colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>Complete full programme (PPL/ULUL)</Text>
                  <Text style={styles.pointValue}>+10 points per week</Text>
                </View>
              </View>

              <View style={styles.pointItem}>
                <View style={[styles.badge, { backgroundColor: Colors.red50 }]}>
                  <Ionicons name="remove-circle" size={20} color={Colors.red600} />
                </View>
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>Incomplete workout week</Text>
                  <Text style={[styles.pointValue, { color: Colors.red600 }]}>-5 points</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness Levels</Text>
              
              <View style={styles.levelItem}>
                <View style={[styles.levelBadge, { backgroundColor: Colors.gray100 }]}>
                  <Text style={[styles.levelText, { color: Colors.gray700 }]}>Rookie</Text>
                </View>
                <Text style={styles.levelRange}>0-49 points</Text>
              </View>

              <View style={styles.levelItem}>
                <View style={[styles.levelBadge, { backgroundColor: Colors.blue50 }]}>
                  <Text style={[styles.levelText, { color: Colors.blue600 }]}>Warrior</Text>
                </View>
                <Text style={styles.levelRange}>50-149 points</Text>
              </View>

              <View style={styles.levelItem}>
                <View style={[styles.levelBadge, { backgroundColor: Colors.purple50 }]}>
                  <Text style={[styles.levelText, { color: Colors.purple600 }]}>Champion</Text>
                </View>
                <Text style={styles.levelRange}>150-299 points</Text>
              </View>

              <View style={styles.levelItem}>
                <View style={[styles.levelBadge, { backgroundColor: Colors.yellow50 }]}>
                  <Text style={[styles.levelText, { color: Colors.yellow600 }]}>Legend</Text>
                </View>
                <Text style={styles.levelRange}>300-499 points</Text>
              </View>

              <View style={styles.levelItem}>
                <View style={[styles.levelBadge, { backgroundColor: Colors.red50 }]}>
                  <Text style={[styles.levelText, { color: Colors.red600 }]}>Titan</Text>
                </View>
                <Text style={styles.levelRange}>500+ points</Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="information-circle" size={20} color={Colors.blue600} />
              <Text style={styles.tipText}>
                Keep working out consistently to level up and unlock new achievements!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay, // Global modal overlay setting
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
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
    ...TextStyles.h2,
    color: Colors.gray900,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2, // Add extra padding at bottom for full scrolling
  },
  description: {
    ...TextStyles.body,
    color: Colors.gray600,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h3,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  pointText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointLabel: {
    ...TextStyles.body,
    color: Colors.gray900,
    flex: 1,
  },
  pointValue: {
    ...TextStyles.bodyBold,
    color: Colors.blue600,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  levelText: {
    ...TextStyles.bodyBold,
    fontSize: 14,
  },
  levelRange: {
    ...TextStyles.body,
    color: Colors.gray600,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: Colors.blue50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  tipText: {
    ...TextStyles.body,
    color: Colors.blue900,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
});
